import { Hono } from 'hono';
import type { Bindings, Variables, Media as MediaType } from '../../types';
import { authMiddleware, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { uploadFile, deleteFile } from '../../lib/storage';
import { parsePagination, paginate, countRows, buildMeta } from '../../lib/db';
import { pluginEngine } from '../../lib/plugins/engine';
import { siteIsPaidAccount } from '../../lib/site-features';

const media = new Hono<{ Bindings: Bindings; Variables: Variables }>();

media.use('*', authMiddleware, requireSite, siteAccessMiddleware);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed',
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
// Free accounts may upload images up to this size. Larger images require a
// paid plan. Non-image files and paid accounts use the 50MB hard cap above.
const FREE_IMAGE_MAX_SIZE = 1 * 1024 * 1024; // 1MB
const FREE_IMAGE_ERROR =
  'Ücretsiz planda görseller en fazla 1 MB olabilir. Daha büyük görseller yüklemek için planınızı yükseltin.';

// GET /api/media
media.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const url = new URL(c.req.url);
  const pagination = parsePagination(url);
  const { limit, offset } = paginate(pagination);

  const mimeFilter = url.searchParams.get('mime_type');
  const search = url.searchParams.get('search');

  let where = 'site_id = ?';
  const params: unknown[] = [siteId];

  if (mimeFilter) {
    where += ' AND mime_type LIKE ?';
    params.push(`${mimeFilter}%`);
  }
  if (search) {
    where += ' AND (filename LIKE ? OR alt_text LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = await countRows(c.env.DB, 'media', where, params);

  const result = await c.env.DB.prepare(
    `SELECT m.*, u.display_name as author_name FROM media m LEFT JOIN users u ON m.author_id = u.id WHERE ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return c.json({
    success: true,
    data: result.results,
    meta: buildMeta(total, pagination),
  });
});

// POST /api/media - Upload file
media.post('/', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch (err) {
    return c.json({ success: false, error: 'Geçersiz form verisi. multipart/form-data bekleniyor.' }, 400);
  }
  const file = formData.get('file') as File | null;

  if (!file) {
    return c.json({ success: false, error: 'Dosya gerekli' }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json({ success: false, error: 'Geçersiz dosya türü' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json({ success: false, error: 'Dosya boyutu çok büyük (max 50MB)' }, 400);
  }

  // Free-account fair-use: images are capped at 1MB. Paid accounts (and the
  // management site / super_admin owners) use the 50MB cap checked above.
  if (file.type.startsWith('image/') && file.size > FREE_IMAGE_MAX_SIZE) {
    if (!(await siteIsPaidAccount(c.env.DB, siteId))) {
      return c.json({ success: false, error: FREE_IMAGE_ERROR }, 413);
    }
  }

  const buffer = await file.arrayBuffer();
  const { key, size } = await uploadFile(c.env.R2, siteId, buffer, file.name, file.type);

  const altText = formData.get('alt_text') as string || null;
  const caption = formData.get('caption') as string || null;

  const result = await c.env.DB.prepare(
    'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, caption, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(siteId, key, file.name, file.type, size, altText, caption, user.sub).first();

  // Run media.afterUpload action
  await pluginEngine.executeAction('media.afterUpload', result as unknown as MediaType);

  return c.json({ success: true, data: result }, 201);
});

// POST /api/media/from-r2 — Register an existing R2 file as media entry
media.post('/from-r2', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const body = await c.req.json<{ r2_key: string; alt_text?: string }>();

  if (!body.r2_key) return c.json({ success: false, error: 'r2_key required' }, 400);

  // Check if media entry already exists for this r2_key
  const existing = await c.env.DB.prepare(
    'SELECT * FROM media WHERE r2_key = ? AND site_id = ?'
  ).bind(body.r2_key, siteId).first();

  if (existing) return c.json({ success: true, data: existing });

  // Get R2 object metadata
  const obj = await c.env.R2.head(body.r2_key);
  if (!obj) return c.json({ success: false, error: 'R2 file not found' }, 404);

  const filename = body.r2_key.split('/').pop() || 'unknown';
  const mimeType = obj.httpMetadata?.contentType || 'image/webp';
  const size = obj.size;

  // Same free-account image cap as the direct upload path, so registering a
  // pre-uploaded R2 object can't bypass the 1MB limit.
  if (mimeType.startsWith('image/') && size > FREE_IMAGE_MAX_SIZE) {
    if (!(await siteIsPaidAccount(c.env.DB, siteId))) {
      return c.json({ success: false, error: FREE_IMAGE_ERROR }, 413);
    }
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, author_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(siteId, body.r2_key, filename, mimeType, size, body.alt_text || null, user.sub).first();

  return c.json({ success: true, data: result }, 201);
});

// POST /api/media/scan-r2 — Discover and register untracked R2 files for this site
media.post('/scan-r2', async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const prefix = `sites/${siteId}/uploads/`;

  try {
    // List all R2 objects under the site's upload prefix
    let cursor: string | undefined;
    const allKeys: string[] = [];
    do {
      const listed = await c.env.R2.list({ prefix, cursor, limit: 500 });
      for (const obj of listed.objects) {
        allKeys.push(obj.key);
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    if (allKeys.length === 0) {
      return c.json({ success: true, data: { registered: 0, total: 0, already_tracked: 0 } });
    }

    // Get already-registered keys from DB
    const existing = await c.env.DB.prepare(
      'SELECT r2_key FROM media WHERE site_id = ?'
    ).bind(siteId).all<{ r2_key: string }>();
    const existingKeys = new Set(existing.results.map(r => r.r2_key));

    // Filter to unregistered keys
    const unregistered = allKeys.filter(k => !existingKeys.has(k));

    let registered = 0;
    for (const key of unregistered) {
      try {
        const obj = await c.env.R2.head(key);
        if (!obj) continue;

        const filename = key.split('/').pop() || 'unknown';
        const mimeType = obj.httpMetadata?.contentType || 'application/octet-stream';
        const size = obj.size;

        await c.env.DB.prepare(
          'INSERT INTO media (site_id, r2_key, filename, mime_type, size, author_id) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(siteId, key, filename, mimeType, size, user.sub).run();
        registered++;
      } catch (e) {
        console.error('Failed to register R2 file:', key, e);
      }
    }

    return c.json({
      success: true,
      data: { registered, total: allKeys.length, already_tracked: existingKeys.size },
    });
  } catch (err: unknown) {
    return c.json({
      success: false,
      error: 'R2 scan failed: ' + (err instanceof Error ? err.message : String(err)),
    }, 500);
  }
});

// GET /api/media/:id
media.get('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const item = await c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first();

  if (!item) {
    return c.json({ success: false, error: 'Dosya bulunamadı' }, 404);
  }

  return c.json({ success: true, data: item });
});

// PUT /api/media/:id
media.put('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ alt_text?: string; caption?: string }>();

  const result = await c.env.DB.prepare(
    'UPDATE media SET alt_text = COALESCE(?, alt_text), caption = COALESCE(?, caption) WHERE id = ? AND site_id = ? RETURNING *'
  ).bind(body.alt_text ?? null, body.caption ?? null, id, siteId).first();

  if (!result) {
    return c.json({ success: false, error: 'Dosya bulunamadı' }, 404);
  }

  return c.json({ success: true, data: result });
});

// POST /api/media/bulk — Bulk actions (delete)
media.post('/bulk', async (c) => {
  const siteId = c.get('siteId')!;

  const body = await c.req.json<{ action: string; ids: number[] }>();

  if (!body.action || body.action !== 'delete') {
    return c.json({ success: false, error: 'Geçersiz işlem' }, 400);
  }

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ success: false, error: 'Geçerli ID listesi gerekli' }, 400);
  }

  if (body.ids.length > 100) {
    return c.json({ success: false, error: 'Tek seferde en fazla 100 dosya silinebilir' }, 400);
  }

  const ids = body.ids.map(Number).filter(n => !isNaN(n));
  if (ids.length === 0) {
    return c.json({ success: false, error: 'Geçerli ID bulunamadı' }, 400);
  }

  try {
    const BATCH_SIZE = 30; // D1 SQL variable limit safe batch size
    const allR2Keys: string[] = [];
    let totalAffected = 0;

    // Process in batches to avoid D1 SQL variable limit
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');

      // Fetch media records to get R2 keys
      const mediaItems = await c.env.DB.prepare(
        `SELECT id, r2_key FROM media WHERE id IN (${placeholders}) AND site_id = ?`
      ).bind(...batch, siteId).all<{ id: number; r2_key: string }>();

      if (mediaItems.results.length === 0) continue;

      const validIds = mediaItems.results.map(m => m.id);
      const ph2 = validIds.map(() => '?').join(',');

      // Collect R2 keys for bulk R2 deletion later
      for (const m of mediaItems.results) {
        if (m.r2_key) allR2Keys.push(m.r2_key);
      }

      // Clear featured_image_id refs + delete from DB in a single batch call
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE posts SET featured_image_id = NULL WHERE featured_image_id IN (${ph2}) AND site_id = ?`
        ).bind(...validIds, siteId),
        c.env.DB.prepare(
          `DELETE FROM media WHERE id IN (${ph2}) AND site_id = ?`
        ).bind(...validIds, siteId),
      ]);

      totalAffected += validIds.length;
    }

    // Delete all files from R2 in one call (supports up to 1000 keys)
    if (allR2Keys.length > 0) {
      await c.env.R2.delete(allR2Keys);
    }

    return c.json({
      success: true,
      data: { affected: totalAffected, total: ids.length, action: 'delete' },
    });
  } catch (err: unknown) {
    return c.json({
      success: false,
      error: 'Toplu silme başarısız: ' + (err instanceof Error ? err.message : String(err)),
    }, 500);
  }
});

// DELETE /api/media/:id
media.delete('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const item = await c.env.DB.prepare('SELECT * FROM media WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first<{ r2_key: string }>();

  if (!item) {
    return c.json({ success: false, error: 'Dosya bulunamadı' }, 404);
  }

  await deleteFile(c.env.R2, item.r2_key);
  await c.env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();

  return c.json({ success: true, data: { message: 'Dosya silindi' } });
});

export default media;
