import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { parseWXR, importWXR } from '../../lib/wp-import';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Import requires admin role
app.use('*', authMiddleware, requireSite, siteAccessMiddleware);
app.use('*', requireRole('admin', 'super_admin'));

// POST /api/import/wordpress - Upload and import WordPress WXR XML
app.post('/wordpress', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const contentType = c.req.header('content-type') || '';

  let xmlContent: string;

  if (contentType.includes('multipart/form-data')) {
    // File upload
    const formData = await c.req.formData();
    const file = formData.get('file') as unknown;
    if (!file || typeof (file as any).text !== 'function') {
      return c.json({ success: false, error: 'XML file is required' }, 400);
    }
    const f = file as { text(): Promise<string>; size: number };
    if (f.size > 50 * 1024 * 1024) {
      return c.json({ success: false, error: 'File too large (max 50MB)' }, 400);
    }
    xmlContent = await f.text();
  } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    // Raw XML body
    xmlContent = await c.req.text();
  } else {
    return c.json({ success: false, error: 'Content-Type must be multipart/form-data or application/xml' }, 400);
  }

  // Validate it looks like WXR
  if (!xmlContent.includes('<rss') || !xmlContent.includes('xmlns:wp')) {
    return c.json({ success: false, error: 'Invalid WordPress export file (WXR format required)' }, 400);
  }

  // Parse options from query params
  const url = new URL(c.req.url);
  const importMedia = url.searchParams.get('import_media') === 'true';
  const overwriteExisting = url.searchParams.get('overwrite') === 'true';
  const defaultLanguage = url.searchParams.get('language') || 'tr';

  try {
    // Parse XML
    const channel = parseWXR(xmlContent);

    // Import into database
    const result = await importWXR(c.env.DB, c.env.R2, siteId, user.sub, channel, {
      importMedia,
      overwriteExisting,
      defaultLanguage,
    });

    return c.json({
      success: true,
      data: {
        source: {
          title: channel.title,
          url: channel.base_blog_url,
          language: channel.language,
          authors_count: channel.authors.length,
          items_count: channel.items.length,
        },
        result,
      },
    });
  } catch (err: unknown) {
    return c.json({
      success: false,
      error: 'Import failed: ' + (err instanceof Error ? err.message : String(err)),
    }, 500);
  }
});

// POST /api/import/wordpress/preview - Parse and preview without importing
app.post('/wordpress/preview', async (c) => {
  const contentType = c.req.header('content-type') || '';

  let xmlContent: string;

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('file') as unknown;
    if (!file || typeof (file as any).text !== 'function') {
      return c.json({ success: false, error: 'XML file is required' }, 400);
    }
    xmlContent = await (file as { text(): Promise<string> }).text();
  } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    xmlContent = await c.req.text();
  } else {
    return c.json({ success: false, error: 'Content-Type must be multipart/form-data or application/xml' }, 400);
  }

  if (!xmlContent.includes('<rss') || !xmlContent.includes('xmlns:wp')) {
    return c.json({ success: false, error: 'Invalid WordPress export file' }, 400);
  }

  try {
    const channel = parseWXR(xmlContent);

    const postsByType: Record<string, number> = {};
    const postsByStatus: Record<string, number> = {};
    for (const item of channel.items) {
      postsByType[item.post_type] = (postsByType[item.post_type] || 0) + 1;
      postsByStatus[item.status] = (postsByStatus[item.status] || 0) + 1;
    }

    return c.json({
      success: true,
      data: {
        title: channel.title,
        url: channel.base_blog_url,
        language: channel.language,
        authors: channel.authors.map(a => ({ login: a.login, display_name: a.display_name, email: a.email })),
        categories: channel.categories.length,
        tags: channel.tags.length,
        items_total: channel.items.length,
        items_by_type: postsByType,
        items_by_status: postsByStatus,
      },
    });
  } catch (err: unknown) {
    return c.json({
      success: false,
      error: 'Parse failed: ' + (err instanceof Error ? err.message : String(err)),
    }, 500);
  }
});

// POST /api/import/fix-media-urls - Rewrite old WP media URLs in existing content
app.post('/fix-media-urls', async (c) => {
  const siteId = c.get('siteId')!;

  try {
    // Get all media filenames for this site
    const mediaResult = await c.env.DB.prepare(
      'SELECT filename, r2_key FROM media WHERE site_id = ?'
    ).bind(siteId).all<{ filename: string; r2_key: string }>();

    // Build filename → public URL map
    const filenameToUrl = new Map<string, string>();
    for (const m of mediaResult.results) {
      // r2_key: "sites/1/uploads/2026/02/file.png" → public URL: "/uploads/s/1/2026/02/file.png"
      const publicPath = m.r2_key.replace(`sites/${siteId}/uploads/`, `/uploads/s/${siteId}/`);
      filenameToUrl.set(m.filename, publicPath);
    }

    // Get all posts with wp-content/uploads references
    const posts = await c.env.DB.prepare(
      "SELECT id, content FROM posts WHERE site_id = ? AND content LIKE '%wp-content/uploads%'"
    ).bind(siteId).all<{ id: number; content: string }>();

    if (posts.results.length === 0) {
      return c.json({ success: true, data: { updated: 0, message: 'No posts with old WP URLs found' } });
    }

    let updated = 0;
    const stmts: D1PreparedStatement[] = [];

    for (const post of posts.results) {
      let content = post.content;
      let changed = false;

      // Replace all wp-content/uploads/YYYY/MM/filename patterns
      // Handles: https://host/wp-content/uploads/2018/02/file.png
      //          //host/wp-content/uploads/2018/02/file.png
      //          /wp-content/uploads/2018/02/file.png
      const urlRegex = /(?:https?:)?(?:\/\/[^"'<>\s]+)?\/wp-content\/uploads\/\d{4}\/\d{2}\/([^"'<>\s]+)/g;

      content = content.replace(urlRegex, (_match, filename) => {
        // Try exact filename match
        const newUrl = filenameToUrl.get(filename);
        if (newUrl) {
          changed = true;
          return newUrl;
        }
        // Try without WP resize suffix (image-300x200.jpg → image.jpg)
        const baseName = filename.replace(/-\d+x\d+(\.\w+)$/, '$1');
        const baseUrl = filenameToUrl.get(baseName);
        if (baseUrl) {
          changed = true;
          // Keep the resize suffix in the filename but use the new path
          const dir = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
          return `${dir}/${filename}`;
        }
        // Not found in media — leave as-is
        return _match;
      });

      if (changed) {
        stmts.push(
          c.env.DB.prepare('UPDATE posts SET content = ? WHERE id = ?').bind(content, post.id)
        );
        updated++;
      }
    }

    // Execute updates in batches of 20
    for (let i = 0; i < stmts.length; i += 20) {
      const batch = stmts.slice(i, i + 20);
      await c.env.DB.batch(batch);
    }

    return c.json({
      success: true,
      data: {
        scanned: posts.results.length,
        updated,
        media_files: mediaResult.results.length,
      },
    });
  } catch (err: unknown) {
    return c.json({
      success: false,
      error: 'Fix URLs failed: ' + (err instanceof Error ? err.message : String(err)),
    }, 500);
  }
});

export default app;
