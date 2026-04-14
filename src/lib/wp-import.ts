// WordPress WXR (WordPress eXtended RSS) XML Import Parser
// Handles WordPress export XML files (versions 1.0, 1.1, 1.2)

export interface WXRChannel {
  title: string;
  link: string;
  description: string;
  language: string;
  base_site_url: string;
  base_blog_url: string;
  authors: WXRAuthor[];
  categories: WXRCategory[];
  tags: WXRTag[];
  items: WXRItem[];
}

export interface WXRAuthor {
  id: number;
  login: string;
  email: string;
  display_name: string;
}

export interface WXRCategory {
  id: number;
  slug: string;
  name: string;
  parent?: string;
  description?: string;
}

export interface WXRTag {
  id: number;
  slug: string;
  name: string;
  description?: string;
}

export interface WXRItem {
  id: number;
  title: string;
  link: string;
  pubDate: string;
  creator: string;
  guid: string;
  description: string;
  content: string;
  excerpt: string;
  post_date: string;
  post_name: string; // slug
  status: string;
  post_parent: number;
  menu_order: number;
  post_type: string;
  post_password: string;
  is_sticky: boolean;
  categories: { slug: string; name: string; domain: string }[];
  comments: WXRComment[];
  postmeta: { key: string; value: string }[];
  attachment_url?: string;
}

export interface WXRComment {
  id: number;
  author: string;
  author_email: string;
  author_url: string;
  author_ip: string;
  date: string;
  content: string;
  approved: string;
  parent: number;
}

export interface ImportResult {
  authors: { imported: number; skipped: number };
  categories: { imported: number; skipped: number };
  tags: { imported: number; skipped: number };
  posts: { imported: number; skipped: number; failed: number };
  pages: { imported: number; skipped: number; failed: number };
  attachments: { imported: number; skipped: number; failed: number };
  comments: { imported: number; skipped: number };
  errors: string[];
}

// Simple XML parser for WXR format (no external dependencies)
export function parseWXR(xml: string): WXRChannel {
  // Remove BOM if present
  if (xml.charCodeAt(0) === 0xFEFF) xml = xml.slice(1);

  const channel: WXRChannel = {
    title: getTagContent(xml, 'title') || '',
    link: getTagContent(xml, 'link') || '',
    description: getTagContent(xml, 'description') || '',
    language: getTagContent(xml, 'language') || 'en',
    base_site_url: getTagContent(xml, 'wp:base_site_url') || '',
    base_blog_url: getTagContent(xml, 'wp:base_blog_url') || '',
    authors: [],
    categories: [],
    tags: [],
    items: [],
  };

  // Parse authors
  const authorBlocks = getAllBlocks(xml, 'wp:author');
  for (const block of authorBlocks) {
    channel.authors.push({
      id: parseInt(getTagContent(block, 'wp:author_id') || '0'),
      login: getCDATA(block, 'wp:author_login') || '',
      email: getCDATA(block, 'wp:author_email') || '',
      display_name: getCDATA(block, 'wp:author_display_name') || '',
    });
  }

  // Parse categories
  const catBlocks = getAllBlocks(xml, 'wp:category');
  for (const block of catBlocks) {
    channel.categories.push({
      id: parseInt(getTagContent(block, 'wp:term_id') || '0'),
      slug: getCDATA(block, 'wp:category_nicename') || '',
      name: getCDATA(block, 'wp:cat_name') || '',
      parent: getCDATA(block, 'wp:category_parent') || undefined,
      description: getCDATA(block, 'wp:category_description') || undefined,
    });
  }

  // Parse tags
  const tagBlocks = getAllBlocks(xml, 'wp:tag');
  for (const block of tagBlocks) {
    channel.tags.push({
      id: parseInt(getTagContent(block, 'wp:term_id') || '0'),
      slug: getCDATA(block, 'wp:tag_slug') || '',
      name: getCDATA(block, 'wp:tag_name') || '',
      description: getCDATA(block, 'wp:tag_description') || undefined,
    });
  }

  // Parse items
  const itemBlocks = getAllBlocks(xml, 'item');
  for (const block of itemBlocks) {
    const item: WXRItem = {
      id: parseInt(getTagContent(block, 'wp:post_id') || '0'),
      title: getTagContent(block, 'title') || '',
      link: getTagContent(block, 'link') || '',
      pubDate: getTagContent(block, 'pubDate') || '',
      creator: getCDATA(block, 'dc:creator') || '',
      guid: getTagContent(block, 'guid') || '',
      description: getTagContent(block, 'description') || '',
      content: getCDATA(block, 'content:encoded') || '',
      excerpt: getCDATA(block, 'excerpt:encoded') || '',
      post_date: getTagContent(block, 'wp:post_date') || '',
      post_name: getTagContent(block, 'wp:post_name') || '',
      status: getTagContent(block, 'wp:status') || 'draft',
      post_parent: parseInt(getTagContent(block, 'wp:post_parent') || '0'),
      menu_order: parseInt(getTagContent(block, 'wp:menu_order') || '0'),
      post_type: getTagContent(block, 'wp:post_type') || 'post',
      post_password: getTagContent(block, 'wp:post_password') || '',
      is_sticky: getTagContent(block, 'wp:is_sticky') === '1',
      categories: [],
      comments: [],
      postmeta: [],
    };

    // Parse item categories/tags
    const catMatches = block.matchAll(/<category\s+domain="([^"]*)"[^>]*nicename="([^"]*)"[^>]*>(.*?)<\/category>/gs);
    for (const m of catMatches) {
      // Handle CDATA in category name
      let name = m[3].trim();
      if (name.startsWith('<![CDATA[')) {
        name = name.slice(9, -3);
      }
      item.categories.push({ domain: m[1], slug: m[2], name });
    }

    // Parse comments
    const commentBlocks = getAllBlocks(block, 'wp:comment');
    for (const cb of commentBlocks) {
      item.comments.push({
        id: parseInt(getTagContent(cb, 'wp:comment_id') || '0'),
        author: getCDATA(cb, 'wp:comment_author') || '',
        author_email: getTagContent(cb, 'wp:comment_author_email') || '',
        author_url: getTagContent(cb, 'wp:comment_author_url') || '',
        author_ip: getTagContent(cb, 'wp:comment_author_IP') || '',
        date: getTagContent(cb, 'wp:comment_date') || '',
        content: getCDATA(cb, 'wp:comment_content') || '',
        approved: getTagContent(cb, 'wp:comment_approved') || '0',
        parent: parseInt(getTagContent(cb, 'wp:comment_parent') || '0'),
      });
    }

    // Parse post meta
    const metaBlocks = getAllBlocks(block, 'wp:postmeta');
    for (const mb of metaBlocks) {
      item.postmeta.push({
        key: getCDATA(mb, 'wp:meta_key') || '',
        value: getCDATA(mb, 'wp:meta_value') || '',
      });
    }

    // Attachment URL
    item.attachment_url = getTagContent(block, 'wp:attachment_url') || undefined;

    channel.items.push(item);
  }

  return channel;
}

// ─── Batched Import ────────────────────────────────────────────────────────────
// Uses D1 db.batch() to group SQL statements into single roundtrips.
// This reduces 2000+ sequential queries down to ~50-100 batched roundtrips,
// avoiding Cloudflare Worker timeout for large imports (700+ items).

/** Post types that are WP-internal and shouldn't be imported */
const SKIP_TYPES = new Set([
  'amp_validated_url', 'custom_css', 'wp_global_styles',
  'wp_navigation', 'nav_menu_item', 'oembed_cache',
  'wp_template', 'wp_template_part', 'wp_block',
]);

/** Split an array into chunks */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Map WordPress status to CMS status */
function mapStatus(wpStatus: string): string {
  const m: Record<string, string> = {
    publish: 'publish', draft: 'draft', pending: 'pending',
    private: 'private', trash: 'trash', future: 'scheduled',
  };
  return m[wpStatus] || 'draft';
}

// Import WXR data into D1 database (batched for performance)
export async function importWXR(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  authorId: number,
  channel: WXRChannel,
  options: {
    importMedia?: boolean;
    overwriteExisting?: boolean;
    defaultLanguage?: string;
  } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    authors: { imported: 0, skipped: 0 },
    categories: { imported: 0, skipped: 0 },
    tags: { imported: 0, skipped: 0 },
    posts: { imported: 0, skipped: 0, failed: 0 },
    pages: { imported: 0, skipped: 0, failed: 0 },
    attachments: { imported: 0, skipped: 0, failed: 0 },
    comments: { imported: 0, skipped: 0 },
    errors: [],
  };

  const lang = options.defaultLanguage || 'tr';

  // In-memory maps (avoid repeated DB lookups)
  const categoryMap = new Map<string, number>();   // slug → taxonomy_id
  const tagMap = new Map<string, number>();         // slug → taxonomy_id
  const postIdMap = new Map<number, number>();      // wp_post_id → cms_post_id
  const attachmentUrlMap = new Map<number, string>(); // wp_att_id → r2_key
  const mediaIdMap = new Map<string, number>();     // r2_key → cms_media_id
  const contentUrlMap = new Map<string, string>();  // old_wp_url → new_relative_url (/uploads/YYYY/MM/file)

  // All authors map to the importing user
  for (const _author of channel.authors) {
    result.authors.skipped++;
  }

  // ═══ Phase 1: Fetch all existing data in 2 parallel queries ═══
  const [existingTaxResult, existingPostResult] = await Promise.all([
    db.prepare('SELECT id, slug, type FROM taxonomies WHERE site_id = ? AND language = ?')
      .bind(siteId, lang).all<{ id: number; slug: string; type: string }>(),
    db.prepare('SELECT id, slug FROM posts WHERE site_id = ? AND language = ?')
      .bind(siteId, lang).all<{ id: number; slug: string }>(),
  ]);

  const existingCats = new Map<string, number>();
  const existingTags = new Map<string, number>();
  for (const row of existingTaxResult.results) {
    if (row.type === 'category') existingCats.set(row.slug, row.id);
    else if (row.type === 'tag') existingTags.set(row.slug, row.id);
  }
  const existingPosts = new Map(existingPostResult.results.map(r => [r.slug, r.id]));

  // ═══ Phase 2: Import categories (batched) ═══
  {
    const insertStmts: D1PreparedStatement[] = [];
    const insertSlugs: string[] = [];
    const updateStmts: D1PreparedStatement[] = [];

    for (const cat of channel.categories) {
      const existingId = existingCats.get(cat.slug);
      if (existingId && !options.overwriteExisting) {
        categoryMap.set(cat.slug, existingId);
        result.categories.skipped++;
      } else if (existingId) {
        updateStmts.push(
          db.prepare('UPDATE taxonomies SET name = ?, description = ? WHERE id = ?')
            .bind(cat.name, cat.description || null, existingId)
        );
        categoryMap.set(cat.slug, existingId);
        result.categories.imported++;
      } else {
        insertStmts.push(
          db.prepare('INSERT INTO taxonomies (site_id, name, slug, type, description, language) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(siteId, cat.name, cat.slug, 'category', cat.description || null, lang)
        );
        insertSlugs.push(cat.slug);
      }
    }

    if (updateStmts.length > 0) {
      try { await db.batch(updateStmts); } catch (err: unknown) {
        result.errors.push(`Category updates: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (insertStmts.length > 0) {
      try {
        const results = await db.batch(insertStmts);
        for (let i = 0; i < results.length; i++) {
          const id = results[i].meta.last_row_id;
          if (id) categoryMap.set(insertSlugs[i], id);
          result.categories.imported++;
        }
      } catch (err: unknown) {
        result.errors.push(`Category inserts: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ═══ Phase 3: Import tags (batched) ═══
  {
    const insertStmts: D1PreparedStatement[] = [];
    const insertSlugs: string[] = [];
    const updateStmts: D1PreparedStatement[] = [];

    for (const tag of channel.tags) {
      const existingId = existingTags.get(tag.slug);
      if (existingId && !options.overwriteExisting) {
        tagMap.set(tag.slug, existingId);
        result.tags.skipped++;
      } else if (existingId) {
        updateStmts.push(
          db.prepare('UPDATE taxonomies SET name = ?, description = ? WHERE id = ?')
            .bind(tag.name, tag.description || null, existingId)
        );
        tagMap.set(tag.slug, existingId);
        result.tags.imported++;
      } else {
        insertStmts.push(
          db.prepare('INSERT INTO taxonomies (site_id, name, slug, type, description, language) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(siteId, tag.name, tag.slug, 'tag', tag.description || null, lang)
        );
        insertSlugs.push(tag.slug);
      }
    }

    if (updateStmts.length > 0) {
      try { await db.batch(updateStmts); } catch (err: unknown) {
        result.errors.push(`Tag updates: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (insertStmts.length > 0) {
      try {
        const results = await db.batch(insertStmts);
        for (let i = 0; i < results.length; i++) {
          const id = results[i].meta.last_row_id;
          if (id) tagMap.set(insertSlugs[i], id);
          result.tags.imported++;
        }
      } catch (err: unknown) {
        result.errors.push(`Tag inserts: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ═══ Phase 4: Import attachments (batched, chunks of 50) ═══
  const attachments = channel.items.filter(i => i.post_type === 'attachment');
  {
    // Prepare media records
    const mediaRecords: {
      wpId: number; r2Key: string; filename: string;
      mimeType: string; size: number; title: string | null; caption: string | null;
    }[] = [];

    for (const att of attachments) {
      if (!att.attachment_url) {
        result.attachments.skipped++;
        continue;
      }

      let filename: string;
      try {
        const urlObj = new URL(att.attachment_url);
        filename = urlObj.pathname.split('/').pop() || 'unknown';
      } catch {
        filename = 'unknown';
      }
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const r2Key = `sites/${siteId}/uploads/${year}/${month}/${filename}`;

      // Download to R2 if enabled (sequential — external HTTP can't be batched)
      let fileSize = 0;
      if (options.importMedia) {
        try {
          const response = await fetch(att.attachment_url);
          if (response.ok && response.body) {
            const arrayBuffer = await response.arrayBuffer();
            fileSize = arrayBuffer.byteLength;
            const contentType = response.headers.get('content-type') || guessMimeType(filename);
            await r2.put(r2Key, arrayBuffer, { httpMetadata: { contentType } });
          }
        } catch {
          result.errors.push(`Media download failed: ${att.attachment_url}`);
        }
      }

      // Build content URL rewrite map: old WP URL → new relative URL
      // e.g. "https://oldsite.com/wp-content/uploads/2024/01/img.png" → "/uploads/s/1/2026/02/img.png"
      const newPublicUrl = `/uploads/s/${siteId}/${year}/${month}/${filename}`;
      if (att.attachment_url) {
        contentUrlMap.set(att.attachment_url, newPublicUrl);
        // Also map without protocol (//oldsite.com/...) and relative (/wp-content/uploads/...)
        try {
          const u = new URL(att.attachment_url);
          contentUrlMap.set(`//${u.host}${u.pathname}`, newPublicUrl);
          contentUrlMap.set(u.pathname, newPublicUrl);
        } catch { /* ignore invalid URLs */ }
      }

      mediaRecords.push({
        wpId: att.id, r2Key, filename,
        mimeType: guessMimeType(filename),
        size: fileSize,
        title: att.title || null,
        caption: att.excerpt || null,
      });
    }

    // Batch INSERT media records (chunks of 50)
    const mediaChunks = chunkArray(mediaRecords, 50);
    for (const chunk of mediaChunks) {
      const stmts = chunk.map(m =>
        db.prepare(
          'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, caption, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(siteId, m.r2Key, m.filename, m.mimeType, m.size, m.title, m.caption, authorId)
      );

      try {
        const results = await db.batch(stmts);
        for (let i = 0; i < chunk.length; i++) {
          const mediaId = results[i].meta.last_row_id;
          if (mediaId) {
            attachmentUrlMap.set(chunk[i].wpId, chunk[i].r2Key);
            mediaIdMap.set(chunk[i].r2Key, mediaId);
            postIdMap.set(chunk[i].wpId, mediaId);
          }
          result.attachments.imported++;
        }
      } catch (err: unknown) {
        // Batch failed — fall back to individual inserts
        for (const m of chunk) {
          try {
            const res = await db.prepare(
              'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, caption, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(siteId, m.r2Key, m.filename, m.mimeType, m.size, m.title, m.caption, authorId).run();
            if (res.meta.last_row_id) {
              attachmentUrlMap.set(m.wpId, m.r2Key);
              mediaIdMap.set(m.r2Key, res.meta.last_row_id);
              postIdMap.set(m.wpId, res.meta.last_row_id);
            }
            result.attachments.imported++;
          } catch (innerErr: unknown) {
            const errMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
            // If UNIQUE constraint — file already exists, look up the existing record
            if (errMsg.includes('UNIQUE constraint')) {
              try {
                const existing = await db.prepare(
                  'SELECT id FROM media WHERE r2_key = ? AND site_id = ?'
                ).bind(m.r2Key, siteId).first<{ id: number }>();
                if (existing) {
                  attachmentUrlMap.set(m.wpId, m.r2Key);
                  mediaIdMap.set(m.r2Key, existing.id);
                  postIdMap.set(m.wpId, existing.id);
                  result.attachments.imported++;
                  result.attachments.skipped++;
                  continue;
                }
              } catch { /* ignore lookup error */ }
            }
            result.attachments.failed++;
            result.errors.push(`Attachment "${m.filename}": ${errMsg}`);
          }
        }
      }
    }
  }

  // ═══ Phase 5: Import posts, pages, other (batched, chunks of 5) ═══
  const posts = channel.items.filter(i => i.post_type === 'post');
  const pages = channel.items.filter(i => i.post_type === 'page');
  const other = channel.items.filter(i =>
    !SKIP_TYPES.has(i.post_type) && i.post_type !== 'post' &&
    i.post_type !== 'page' && i.post_type !== 'attachment'
  );

  // Also build a base URL rewrite: replace any remaining references to old WP upload base
  const wpBaseUrl = channel.base_blog_url || channel.base_site_url || channel.link;

  await importItemsBatched(db, siteId, authorId, posts, lang, categoryMap, tagMap, postIdMap, attachmentUrlMap, mediaIdMap, existingPosts, contentUrlMap, wpBaseUrl, options, result, 'posts');
  await importItemsBatched(db, siteId, authorId, pages, lang, categoryMap, tagMap, postIdMap, attachmentUrlMap, mediaIdMap, existingPosts, contentUrlMap, wpBaseUrl, options, result, 'pages');
  await importItemsBatched(db, siteId, authorId, other, lang, categoryMap, tagMap, postIdMap, attachmentUrlMap, mediaIdMap, existingPosts, contentUrlMap, wpBaseUrl, options, result, 'posts');

  return result;
}

/**
 * Import a list of posts/pages in batches of 5.
 * Each batch: INSERT/UPDATE posts → then batch INSERT associations (taxonomies, meta, comments).
 */
async function importItemsBatched(
  db: D1Database,
  siteId: number,
  authorId: number,
  items: WXRItem[],
  lang: string,
  categoryMap: Map<string, number>,
  tagMap: Map<string, number>,
  postIdMap: Map<number, number>,
  attachmentUrlMap: Map<number, string>,
  mediaIdMap: Map<string, number>,
  existingPosts: Map<string, number>,
  contentUrlMap: Map<string, string>,
  wpBaseUrl: string,
  options: { overwriteExisting?: boolean },
  result: ImportResult,
  counter: 'posts' | 'pages'
) {
  const chunks = chunkArray(items, 5);

  for (const chunk of chunks) {
    // Categorize items into: skip, update, insert
    const updateEntries: {
      item: WXRItem; existingId: number;
      slug: string; postType: string; status: string;
      publishedAt: string | null; excerpt: string;
      featuredImageId: number | null;
    }[] = [];
    const insertEntries: {
      item: WXRItem;
      slug: string; postType: string; status: string;
      publishedAt: string | null; createdAt: string; excerpt: string;
      featuredImageId: number | null;
    }[] = [];

    for (const item of chunk) {
      // Rewrite image/media URLs in content from old WP URLs to new /uploads/ paths
      item.content = rewriteContentUrls(item.content, contentUrlMap, wpBaseUrl, siteId);
      if (item.excerpt) {
        item.excerpt = rewriteContentUrls(item.excerpt, contentUrlMap, wpBaseUrl, siteId);
      }

      const slug = item.post_name || createSimpleSlug(item.title);
      const postType = item.post_type === 'page' ? 'page' : 'post';
      const existingId = existingPosts.get(slug);

      // Featured image lookup — all in-memory, no DB query
      let featuredImageId: number | null = null;
      const thumbnailMeta = item.postmeta.find(m => m.key === '_thumbnail_id');
      if (thumbnailMeta) {
        const wpMediaId = parseInt(thumbnailMeta.value);
        const r2Key = attachmentUrlMap.get(wpMediaId);
        if (r2Key) featuredImageId = mediaIdMap.get(r2Key) || null;
      }

      const status = mapStatus(item.status);
      const publishedAt = item.post_date ? formatDate(item.post_date) : null;
      const excerpt = item.excerpt || stripHtmlBasic(item.content).slice(0, 300);

      if (existingId && !options.overwriteExisting) {
        postIdMap.set(item.id, existingId);
        result[counter].skipped++;
      } else if (existingId) {
        updateEntries.push({ item, existingId, slug, postType, status, publishedAt, excerpt, featuredImageId });
      } else {
        const createdAt = publishedAt || new Date().toISOString().replace('T', ' ').replace('Z', '');
        insertEntries.push({ item, slug, postType, status, publishedAt, createdAt, excerpt, featuredImageId });
      }
    }

    // ── Batch: UPDATE existing posts ──
    if (updateEntries.length > 0) {
      const stmts = updateEntries.map(e =>
        db.prepare(
          `UPDATE posts SET title = ?, content = ?, excerpt = ?, status = ?, author_id = ?,
           featured_image_id = ?, menu_order = ?, password = ?, is_sticky = ?,
           published_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(
          e.item.title, e.item.content, e.excerpt, e.status, authorId,
          e.featuredImageId, e.item.menu_order, e.item.post_password || null,
          e.item.is_sticky ? 1 : 0, e.publishedAt, e.existingId
        )
      );
      try {
        await db.batch(stmts);
        for (const e of updateEntries) {
          postIdMap.set(e.item.id, e.existingId);
          result[counter].imported++;
        }
      } catch (err: unknown) {
        // Fall back to individual execution
        for (const e of updateEntries) {
          try {
            await db.prepare(
              `UPDATE posts SET title = ?, content = ?, excerpt = ?, status = ?, author_id = ?,
               featured_image_id = ?, menu_order = ?, password = ?, is_sticky = ?,
               published_at = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(
              e.item.title, e.item.content, e.excerpt, e.status, authorId,
              e.featuredImageId, e.item.menu_order, e.item.post_password || null,
              e.item.is_sticky ? 1 : 0, e.publishedAt, e.existingId
            ).run();
            postIdMap.set(e.item.id, e.existingId);
            result[counter].imported++;
          } catch (innerErr: unknown) {
            result[counter].failed++;
            result.errors.push(`Post update "${e.item.title}": ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
          }
        }
      }
    }

    // ── Batch: INSERT new posts ──
    if (insertEntries.length > 0) {
      const stmts = insertEntries.map(e =>
        db.prepare(
          `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id,
           featured_image_id, language, menu_order, password, is_sticky, published_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          siteId, e.item.title, e.slug, e.item.content, e.excerpt, e.status, e.postType, authorId,
          e.featuredImageId, lang, e.item.menu_order, e.item.post_password || null,
          e.item.is_sticky ? 1 : 0, e.publishedAt, e.createdAt
        )
      );

      try {
        const results = await db.batch(stmts);
        for (let i = 0; i < insertEntries.length; i++) {
          const postId = results[i].meta.last_row_id;
          if (postId) postIdMap.set(insertEntries[i].item.id, postId);
          result[counter].imported++;
        }
      } catch {
        // Fall back to individual inserts
        for (const e of insertEntries) {
          try {
            const res = await db.prepare(
              `INSERT INTO posts (site_id, title, slug, content, excerpt, status, post_type, author_id,
               featured_image_id, language, menu_order, password, is_sticky, published_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              siteId, e.item.title, e.slug, e.item.content, e.excerpt, e.status, e.postType, authorId,
              e.featuredImageId, lang, e.item.menu_order, e.item.post_password || null,
              e.item.is_sticky ? 1 : 0, e.publishedAt, e.createdAt
            ).run();
            const postId = res.meta.last_row_id;
            if (postId) postIdMap.set(e.item.id, postId);
            result[counter].imported++;
          } catch (innerErr: unknown) {
            result[counter].failed++;
            result.errors.push(`Post "${e.item.title}": ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
          }
        }
      }
    }

    // ── Batch: Associations for newly inserted posts ──
    const assocStmts: D1PreparedStatement[] = [];
    for (const e of insertEntries) {
      const postId = postIdMap.get(e.item.id);
      if (!postId) continue;

      // Taxonomies
      for (const cat of e.item.categories) {
        let taxId: number | undefined;
        if (cat.domain === 'category') taxId = categoryMap.get(cat.slug);
        else if (cat.domain === 'post_tag') taxId = tagMap.get(cat.slug);
        if (taxId) {
          assocStmts.push(
            db.prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)')
              .bind(postId, taxId)
          );
        }
      }

      // Post meta
      for (const meta of e.item.postmeta) {
        if (meta.key.startsWith('_') && meta.key !== '_thumbnail_id') continue;
        assocStmts.push(
          db.prepare('INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)')
            .bind(postId, meta.key, meta.value)
        );
      }

      // Comments
      for (const comment of e.item.comments) {
        const commentStatus = comment.approved === '1' ? 'approved' :
          comment.approved === 'spam' ? 'spam' : 'pending';
        assocStmts.push(
          db.prepare(
            `INSERT INTO comments (post_id, author_name, author_email, author_url, author_ip,
             content, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            postId, comment.author, comment.author_email || null,
            comment.author_url || null, comment.author_ip || null,
            comment.content, commentStatus,
            comment.date ? formatDate(comment.date) : new Date().toISOString()
          )
        );
        result.comments.imported++;
      }
    }

    // Execute association batches (sub-chunks of 50 to stay within D1 limits)
    if (assocStmts.length > 0) {
      const assocChunks = chunkArray(assocStmts, 50);
      for (const subBatch of assocChunks) {
        try {
          await db.batch(subBatch);
        } catch (err: unknown) {
          result.errors.push(`Associations batch: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }
}

// ─── Content URL rewriting ──────────────────────────────────────────────────────

/**
 * Rewrite old WordPress media URLs in HTML content to new /uploads/s/{siteId}/YYYY/MM/file paths.
 * Handles:
 *  1. Exact URL matches from contentUrlMap (attachment_url → /uploads/s/{siteId}/YYYY/MM/file)
 *  2. Generic wp-content/uploads/ pattern fallback (extracts filename, maps to /uploads/s/{siteId}/YYYY/MM/file)
 */
function rewriteContentUrls(
  content: string,
  contentUrlMap: Map<string, string>,
  wpBaseUrl: string,
  siteId: number
): string {
  if (!content) return content;

  // Step 1: Replace exact matches from the map (most reliable)
  // Sort by length descending so longer URLs are replaced first
  const sortedEntries = [...contentUrlMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [oldUrl, newUrl] of sortedEntries) {
    if (content.includes(oldUrl)) {
      content = content.split(oldUrl).join(newUrl);
    }
  }

  // Step 2: Catch any remaining wp-content/uploads references (e.g. resized variants like image-300x200.jpg)
  // Pattern: (https?://...)?/wp-content/uploads/YYYY/MM/filename.ext
  if (wpBaseUrl) {
    try {
      const baseHost = new URL(wpBaseUrl).host;
      // Match full URLs with this host + wp-content/uploads path
      const fullUrlRegex = new RegExp(
        `https?://${escapeRegex(baseHost)}/wp-content/uploads/(\\d{4})/(\\d{2})/([^"'\\s<>]+)`,
        'g'
      );
      content = content.replace(fullUrlRegex, (_match, _year, _month, filename) => {
        // Check if we already have this filename mapped (original or resized variant)
        const baseName = filename.replace(/-\d+x\d+(\.\w+)$/, '$1'); // strip WP resize suffix
        // Look for the base filename in our map values
        for (const [, newUrl] of contentUrlMap) {
          if (newUrl.endsWith('/' + baseName) || newUrl.endsWith('/' + filename)) {
            // Use the directory from the matched new URL + the actual requested filename
            const dir = newUrl.substring(0, newUrl.lastIndexOf('/'));
            return `${dir}/${filename}`;
          }
        }
        // If not found in map, use current year/month
        const now = new Date();
        return `/uploads/s/${siteId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;
      });
    } catch { /* ignore invalid base URL */ }
  }

  // Step 3: Catch protocol-relative and relative /wp-content/uploads/ references
  content = content.replace(
    /\/\/[^"'<>\s]+\/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^"'<>\s]+)/g,
    (_match, _year, _month, filename) => {
      const now = new Date();
      return `/uploads/s/${siteId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;
    }
  );
  content = content.replace(
    /\/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^"'<>\s]+)/g,
    (_match, _year, _month, filename) => {
      const now = new Date();
      return `/uploads/s/${siteId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;
    }
  );

  return content;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── XML parsing helpers (no external dependency) ──────────────────────────────

function getTagContent(xml: string, tag: string): string | null {
  // Try CDATA first
  const cdataResult = getCDATA(xml, tag);
  if (cdataResult) return cdataResult;

  // Try plain content
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, 'i');
  const match = xml.match(regex);
  if (!match) return null;
  return decodeXmlEntities(match[1].trim());
}

function getCDATA(xml: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escaped}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${escaped}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function getAllBlocks(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<${escaped}[^>]*>[\\s\\S]*?</${escaped}>`, 'gi');
  const matches = xml.match(regex);
  return matches || [];
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function createSimpleSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200) || 'untitled';
}

function stripHtmlBasic(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    return dateStr;
  }
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
    mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    pdf: 'application/pdf', zip: 'application/zip',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}
