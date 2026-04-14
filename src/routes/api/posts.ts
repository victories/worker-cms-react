import { Hono } from 'hono';
import type { Bindings, Variables, Post, Revision } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { createSlug, ensureUniqueSlug } from '../../lib/slug';
import { sanitizeHtml, stripHtml, truncateText } from '../../lib/sanitize';
import { parsePagination, paginate, countRows, buildMeta } from '../../lib/db';
import { pluginEngine } from '../../lib/plugins/engine';
import { indexPost, deindexPost, rebuildIndex } from '../../lib/search';
import { cachePurgeSite } from '../../lib/cache';
import { createRevision, getRevisions, getRevision, restoreRevision, cleanupRevisions } from '../../lib/revisions';

const posts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

posts.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/posts
posts.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);
  const pagination = parsePagination(url);
  const { limit, offset } = paginate(pagination);

  const status = url.searchParams.get('status');
  const postType = url.searchParams.get('post_type') || url.searchParams.get('type') || 'post';
  const authorId = url.searchParams.get('author_id');
  const language = url.searchParams.get('lang');
  const search = url.searchParams.get('search');

  let where = 'site_id = ? AND post_type = ?';
  const params: unknown[] = [siteId, postType];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (authorId) {
    where += ' AND author_id = ?';
    params.push(parseInt(authorId));
  }
  if (language) {
    where += ' AND language = ?';
    params.push(language);
  }
  if (search) {
    // Try FTS5 subquery, fall back to LIKE
    try {
      const ftsIds = await c.env.DB.prepare(
        `SELECT fm.post_id FROM posts_fts f JOIN posts_fts_map fm ON f.rowid = fm.rowid
         WHERE fm.site_id = ? AND posts_fts MATCH ?`
      ).bind(siteId, search).all();
      const ids = (ftsIds.results as any[]).map((r: any) => r.post_id);
      if (ids.length > 0) {
        where += ` AND id IN (${ids.join(',')})`;
      } else {
        where += ' AND 1=0'; // no FTS results
      }
    } catch {
      where += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
  }

  const total = await countRows(c.env.DB, 'posts', where, params);

  const result = await c.env.DB.prepare(
    `SELECT p.*, u.display_name as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({
    success: true,
    data: result.results,
    meta: buildMeta(total, pagination),
  });
});

// GET /api/posts/:id
posts.get('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const post = await c.env.DB.prepare(
    'SELECT p.*, u.display_name as author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ? AND p.site_id = ?'
  ).bind(id, siteId).first();

  if (!post) {
    return c.json({ success: false, error: 'Yazı bulunamadı' }, 404);
  }

  // Fetch taxonomies
  const taxonomies = await c.env.DB.prepare(
    'SELECT t.* FROM taxonomies t JOIN post_taxonomies pt ON t.id = pt.taxonomy_id WHERE pt.post_id = ?'
  ).bind(id).all();

  // Fetch meta
  const meta = await c.env.DB.prepare('SELECT meta_key, meta_value FROM post_meta WHERE post_id = ?')
    .bind(id).all();

  return c.json({
    success: true,
    data: {
      ...post,
      taxonomies: taxonomies.results,
      meta: Object.fromEntries(meta.results.map((m: any) => [m.meta_key, m.meta_value])),
    },
  });
});

// POST /api/posts
posts.post('/', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const body = await c.req.json<Partial<Post> & { categories?: number[]; tags?: number[]; meta?: Record<string, string> }>();

  if (!body.title) {
    return c.json({ success: false, error: 'Başlık gerekli' }, 400);
  }

  // Editors and above can publish; writers can only draft
  let status = body.status || 'draft';
  if (user.role === 'writer' && (status === 'publish' || status === 'scheduled')) {
    status = 'draft'; // Writers cannot publish or schedule directly
  }

  // Scheduling validation
  if (status === 'scheduled') {
    if (!body.published_at) {
      return c.json({ success: false, error: 'Zamanlanmış yazılar için yayın tarihi gerekli' }, 400);
    }
    if (new Date(body.published_at) <= new Date()) {
      return c.json({ success: false, error: 'Zamanlama tarihi gelecekte olmalı' }, 400);
    }
  }

  // If publishing with a future date, auto-convert to scheduled
  if (status === 'publish' && body.published_at && new Date(body.published_at) > new Date()) {
    status = 'scheduled';
  }

  const slug = await ensureUniqueSlug(
    c.env.DB,
    'posts',
    body.slug || createSlug(body.title),
    siteId,
    body.language || 'tr'
  );

  // Run post.beforeSave filter
  const filteredBody = await pluginEngine.executeFilter('post.beforeSave', body);
  Object.assign(body, filteredBody);

  const content = body.content ? sanitizeHtml(body.content) : null;
  const excerpt = body.excerpt || (content ? truncateText(stripHtml(content), 160) : null);

  const result = await c.env.DB.prepare(
    `INSERT INTO posts (
      site_id, title, slug, content, excerpt, status, post_type, author_id,
      featured_image_id, language, translation_group, parent_id, menu_order,
      comment_status, password, is_sticky, amp_enabled,
      seo_title, seo_description, seo_keywords, og_image_r2_key,
      published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *`
  ).bind(
    siteId, body.title, slug, content, excerpt, status,
    body.post_type || 'post', user.sub,
    body.featured_image_id || null, body.language || 'tr',
    body.translation_group || null, body.parent_id || null,
    body.menu_order || 0, body.comment_status || 'open',
    body.password || null, body.is_sticky || 0, body.amp_enabled ?? 1,
    body.seo_title || null, body.seo_description || null,
    body.seo_keywords || null, body.og_image_r2_key || null,
    status === 'publish' ? new Date().toISOString() : status === 'scheduled' ? body.published_at : null
  ).first();

  const postId = result!.id as number;

  // Attach taxonomies
  if (body.categories) {
    for (const catId of body.categories) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)')
        .bind(postId, catId).run();
    }
  }
  if (body.tags) {
    for (const tagId of body.tags) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)')
        .bind(postId, tagId).run();
    }
  }

  // Save meta
  if (body.meta) {
    for (const [key, value] of Object.entries(body.meta)) {
      await c.env.DB.prepare('INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)')
        .bind(postId, key, value).run();
    }
  }

  // Create revision
  await c.env.DB.prepare(
    'INSERT INTO revisions (post_id, title, content, author_id) VALUES (?, ?, ?, ?)'
  ).bind(postId, body.title, content, user.sub).run();

  // Run post.afterSave action
  await pluginEngine.executeAction('post.afterSave', result as unknown as Post);

  // Index for FTS5 search
  c.executionCtx.waitUntil(
    indexPost(c.env.DB, {
      id: postId, site_id: siteId, title: body.title!,
      content, excerpt, language: body.language || 'tr', status,
    }).catch(() => {})
  );

  // Purge cache
  if (c.env.CACHE) {
    c.executionCtx.waitUntil(cachePurgeSite(c.env.CACHE, siteId));
  }

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/posts/:id
posts.put('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first<Post>();

  if (!existing) {
    return c.json({ success: false, error: 'Yazı bulunamadı' }, 404);
  }

  // Writers can only edit their own posts
  if (user.role === 'writer' && existing.author_id !== user.sub) {
    return c.json({ success: false, error: 'Bu yazıyı düzenleme yetkiniz yok' }, 403);
  }

  const body = await c.req.json<Partial<Post> & { categories?: number[]; tags?: number[]; meta?: Record<string, string> }>();

  let status = body.status ?? existing.status;
  if (user.role === 'writer' && (status === 'publish' || status === 'scheduled')) {
    status = existing.status; // Writers cannot change to publish or schedule
  }

  // Scheduling validation
  if (status === 'scheduled') {
    const scheduledDate = body.published_at || existing.published_at;
    if (!scheduledDate) {
      return c.json({ success: false, error: 'Zamanlanmış yazılar için yayın tarihi gerekli' }, 400);
    }
    if (new Date(scheduledDate) <= new Date()) {
      return c.json({ success: false, error: 'Zamanlama tarihi gelecekte olmalı' }, 400);
    }
  }

  // If publishing with a future date, auto-convert to scheduled
  if (status === 'publish' && body.published_at && new Date(body.published_at) > new Date()) {
    status = 'scheduled';
  }

  // Run post.beforeSave filter
  const filteredBody = await pluginEngine.executeFilter('post.beforeSave', body);
  Object.assign(body, filteredBody);

  const slug = body.slug && body.slug !== existing.slug
    ? await ensureUniqueSlug(c.env.DB, 'posts', body.slug, siteId, body.language || existing.language, id)
    : existing.slug;

  const content = body.content !== undefined ? sanitizeHtml(body.content || '') : existing.content;
  const title = body.title || existing.title;

  // Create revision of current state before updating
  c.executionCtx.waitUntil(createRevision(c.env.DB, existing as any, user.sub));
  // Cleanup old revisions (keep last 50)
  c.executionCtx.waitUntil(cleanupRevisions(c.env.DB, id, 50));

  const publishedAt = status === 'scheduled'
    ? (body.published_at || existing.published_at)
    : status === 'publish' && existing.status !== 'publish'
      ? new Date().toISOString()
      : existing.published_at;

  const result = await c.env.DB.prepare(
    `UPDATE posts SET
      title = ?, slug = ?, content = ?, excerpt = ?, status = ?,
      featured_image_id = ?, language = ?, translation_group = ?,
      parent_id = ?, menu_order = ?, comment_status = ?,
      password = ?, is_sticky = ?, amp_enabled = ?,
      seo_title = ?, seo_description = ?, seo_keywords = ?, og_image_r2_key = ?,
      published_at = ?, updated_at = datetime('now')
    WHERE id = ? RETURNING *`
  ).bind(
    title, slug, content,
    body.excerpt !== undefined ? body.excerpt : existing.excerpt,
    status,
    body.featured_image_id !== undefined ? body.featured_image_id : existing.featured_image_id,
    body.language || existing.language,
    body.translation_group !== undefined ? body.translation_group : existing.translation_group,
    body.parent_id !== undefined ? body.parent_id : existing.parent_id,
    body.menu_order !== undefined ? body.menu_order : existing.menu_order,
    body.comment_status || existing.comment_status,
    body.password !== undefined ? body.password : existing.password,
    body.is_sticky !== undefined ? body.is_sticky : existing.is_sticky,
    body.amp_enabled !== undefined ? body.amp_enabled : existing.amp_enabled,
    body.seo_title !== undefined ? body.seo_title : existing.seo_title,
    body.seo_description !== undefined ? body.seo_description : existing.seo_description,
    body.seo_keywords !== undefined ? body.seo_keywords : existing.seo_keywords,
    body.og_image_r2_key !== undefined ? body.og_image_r2_key : existing.og_image_r2_key,
    publishedAt,
    id
  ).first();

  // Update taxonomies if provided
  if (body.categories !== undefined || body.tags !== undefined) {
    await c.env.DB.prepare('DELETE FROM post_taxonomies WHERE post_id = ?').bind(id).run();
    const taxIds = [...(body.categories || []), ...(body.tags || [])];
    for (const taxId of taxIds) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)')
        .bind(id, taxId).run();
    }
  }

  // Update meta if provided (upsert per key — non-destructive for other keys)
  if (body.meta) {
    for (const [key, value] of Object.entries(body.meta)) {
      // Delete existing entry for this key
      await c.env.DB.prepare('DELETE FROM post_meta WHERE post_id = ? AND meta_key = ?')
        .bind(id, key).run();
      // Insert new value (skip if empty — effectively removes the key)
      if (value !== '' && value !== null && value !== undefined) {
        await c.env.DB.prepare('INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)')
          .bind(id, key, value).run();
      }
    }
  }

  // Create revision
  await c.env.DB.prepare(
    'INSERT INTO revisions (post_id, title, content, author_id) VALUES (?, ?, ?, ?)'
  ).bind(id, title, content, user.sub).run();

  // Run post.afterSave action
  await pluginEngine.executeAction('post.afterSave', result as unknown as Post);

  // Update FTS5 index
  c.executionCtx.waitUntil(
    indexPost(c.env.DB, {
      id, site_id: siteId, title,
      content, excerpt: body.excerpt !== undefined ? body.excerpt : existing.excerpt,
      language: body.language || existing.language, status,
    }).catch(() => {})
  );

  // Purge cache
  if (c.env.CACHE) {
    c.executionCtx.waitUntil(cachePurgeSite(c.env.CACHE, siteId));
  }

  return c.json({ success: true, data: result });
});

// DELETE /api/posts/:id
posts.delete('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first<Post>();

  if (!existing) {
    return c.json({ success: false, error: 'Yazı bulunamadı' }, 404);
  }

  // Writers can only delete their own drafts
  if (user.role === 'writer' && (existing.author_id !== user.sub || existing.status === 'publish')) {
    return c.json({ success: false, error: 'Bu yazıyı silme yetkiniz yok' }, 403);
  }

  // Run post.beforeDelete action
  await pluginEngine.executeAction('post.beforeDelete', id);

  await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

  // Remove from FTS5 index
  c.executionCtx.waitUntil(deindexPost(c.env.DB, id).catch(() => {}));

  // Purge cache
  if (c.env.CACHE) {
    c.executionCtx.waitUntil(cachePurgeSite(c.env.CACHE, siteId));
  }

  return c.json({ success: true, data: { message: 'Yazı silindi' } });
});

// POST /api/posts/bulk - Bulk operations (delete, status change)
posts.post('/bulk', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  const body = await c.req.json<{ action: string; ids: number[]; value?: string }>();

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ success: false, error: 'Geçerli ID listesi gerekli' }, 400);
  }
  if (!body.action) {
    return c.json({ success: false, error: 'İşlem türü gerekli' }, 400);
  }

  const BATCH_SIZE = 30;
  const ids = body.ids.map(Number).filter(n => !isNaN(n));

  // Verify all posts belong to this site (in batches to avoid D1 variable limit)
  const allPostResults: { id: number; author_id: number; status: string }[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const ph = batch.map(() => '?').join(',');
    const res = await c.env.DB.prepare(
      `SELECT id, author_id, status FROM posts WHERE id IN (${ph}) AND site_id = ?`
    ).bind(...batch, siteId).all<{ id: number; author_id: number; status: string }>();
    allPostResults.push(...res.results);
  }

  const validIds = allPostResults.map(p => p.id);
  if (validIds.length === 0) {
    return c.json({ success: false, error: 'Geçerli yazı bulunamadı' }, 404);
  }

  // Role checks for writers
  if (user.role === 'writer') {
    const notOwned = allPostResults.filter(p => p.author_id !== user.sub);
    if (notOwned.length > 0) {
      return c.json({ success: false, error: 'Sadece kendi yazılarınız üzerinde işlem yapabilirsiniz' }, 403);
    }
    if (body.action === 'status' && body.value === 'publish') {
      return c.json({ success: false, error: 'Yayınlama yetkiniz yok' }, 403);
    }
  }

  let affected = 0;

  if (body.action === 'delete') {
    // Run beforeDelete hooks for each
    for (const id of validIds) {
      await pluginEngine.executeAction('post.beforeDelete', id);
    }

    // Delete in batches to avoid D1 variable limit
    for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
      const batch = validIds.slice(i, i + BATCH_SIZE);
      const ph = batch.map(() => '?').join(',');

      const stmts = [
        c.env.DB.prepare(`DELETE FROM post_taxonomies WHERE post_id IN (${ph})`).bind(...batch),
        c.env.DB.prepare(`DELETE FROM post_meta WHERE post_id IN (${ph})`).bind(...batch),
        c.env.DB.prepare(`DELETE FROM comments WHERE post_id IN (${ph})`).bind(...batch),
        c.env.DB.prepare(`DELETE FROM revisions WHERE post_id IN (${ph})`).bind(...batch),
        c.env.DB.prepare(`DELETE FROM posts WHERE id IN (${ph}) AND site_id = ?`).bind(...batch, siteId),
      ];

      const results = await c.env.DB.batch(stmts);
      affected += results[4].meta.changes || 0;
    }

  } else if (body.action === 'status') {
    const validStatuses = ['publish', 'draft', 'pending', 'trash', 'scheduled'];
    if (!body.value || !validStatuses.includes(body.value)) {
      return c.json({ success: false, error: 'Geçersiz durum değeri' }, 400);
    }

    const now = new Date().toISOString();

    // Update status in batches
    for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
      const batch = validIds.slice(i, i + BATCH_SIZE);
      const ph = batch.map(() => '?').join(',');

      if (body.value === 'publish') {
        const stmts = [
          c.env.DB.prepare(
            `UPDATE posts SET status = 'publish', published_at = COALESCE(published_at, ?), updated_at = datetime('now') WHERE id IN (${ph}) AND site_id = ?`
          ).bind(now, ...batch, siteId),
        ];
        const results = await c.env.DB.batch(stmts);
        affected += results[0].meta.changes || 0;
      } else {
        const result = await c.env.DB.prepare(
          `UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id IN (${ph}) AND site_id = ?`
        ).bind(body.value, ...batch, siteId).run();
        affected += result.meta.changes || 0;
      }
    }
  } else {
    return c.json({ success: false, error: 'Bilinmeyen işlem: ' + body.action }, 400);
  }

  return c.json({
    success: true,
    data: { affected, total: validIds.length, action: body.action },
  });
});

// GET /api/posts/:id/revisions - List revisions
posts.get('/:id/revisions', requireRole('editor', 'admin'), async (c) => {
  const postId = parseInt(c.req.param('id'));
  const limit = parseInt(c.req.query('limit') || '20');
  const revisions = await getRevisions(c.env.DB, postId, Math.min(limit, 100));
  return c.json({ success: true, data: revisions });
});

// GET /api/posts/:id/revisions/:revId - Get single revision
posts.get('/:id/revisions/:revId', requireRole('editor', 'admin'), async (c) => {
  const revId = parseInt(c.req.param('revId'));
  const revision = await getRevision(c.env.DB, revId);
  if (!revision) return c.json({ success: false, error: 'Revision bulunamadi' }, 404);
  return c.json({ success: true, data: revision });
});

// POST /api/posts/:id/revisions/:revId/restore - Restore a revision
posts.post('/:id/revisions/:revId/restore', requireRole('admin'), async (c) => {
  const postId = parseInt(c.req.param('id'));
  const revId = parseInt(c.req.param('revId'));
  const user = c.get('user')!;

  try {
    await restoreRevision(c.env.DB, revId, postId, user.sub);
    return c.json({ success: true, data: { message: 'Revision geri yuklendi' } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// POST /api/posts/fix-images - Download external images to R2 for all posts
posts.post('/fix-images', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  try {
    // Dynamic import to avoid circular deps
    const { processContentImages } = await import('../../lib/contety');

    // Find posts with external image URLs
    const posts = await c.env.DB.prepare(
      `SELECT id, title, content FROM posts WHERE site_id = ? AND (content LIKE '%src="http%' OR content LIKE "%src='http%")`
    ).bind(siteId).all();

    let fixed = 0;
    for (const post of posts.results as any[]) {
      if (!post.content) continue;

      const processed = await processContentImages(
        c.env.DB, c.env.R2, siteId, post.content, null, user.sub
      );

      if (processed !== post.content) {
        await c.env.DB.prepare('UPDATE posts SET content = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .bind(processed, post.id).run();
        fixed++;
      }
    }

    return c.json({ success: true, data: { checked: posts.results.length, fixed, message: `${fixed} yazıdaki resimler R2'ye taşındı` } });
  } catch (err: any) {
    return c.json({ success: false, error: 'Resim düzeltme hatası: ' + err.message }, 500);
  }
});

// POST /api/posts/rebuild-search-index - Rebuild FTS5 index
posts.post('/rebuild-search-index', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  try {
    const count = await rebuildIndex(c.env.DB, siteId);
    return c.json({ success: true, data: { indexed: count, message: `${count} yazı indekslendi` } });
  } catch (err: any) {
    return c.json({ success: false, error: 'İndeks oluşturma hatası: ' + err.message }, 500);
  }
});

export default posts;
