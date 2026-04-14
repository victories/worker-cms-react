import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { createSlug, ensureUniqueSlug } from '../../lib/slug';

const taxonomies = new Hono<{ Bindings: Bindings; Variables: Variables }>();

taxonomies.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/taxonomies?type=category|tag
taxonomies.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const type = c.req.query('type') || 'category';
  const language = c.req.query('lang');

  let query = `SELECT t.*,
    (SELECT COUNT(*) FROM post_taxonomies pt
     JOIN posts p ON p.id = pt.post_id
     WHERE pt.taxonomy_id = t.id AND p.status = 'publish') AS count
    FROM taxonomies t WHERE t.site_id = ? AND t.type = ?`;
  const params: unknown[] = [siteId, type];

  if (language) {
    query += ' AND t.language = ?';
    params.push(language);
  }

  query += ' ORDER BY t.name ASC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/taxonomies
taxonomies.post('/', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{
    name: string; type: string; description?: string; parent_id?: number;
    language?: string; translation_group?: string;
  }>();

  if (!body.name || !body.type) {
    return c.json({ success: false, error: 'İsim ve tür gerekli' }, 400);
  }

  const slug = await ensureUniqueSlug(
    c.env.DB, 'taxonomies', createSlug(body.name), siteId, body.language || 'tr'
  );

  const result = await c.env.DB.prepare(
    'INSERT INTO taxonomies (site_id, name, slug, type, description, parent_id, language, translation_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(
    siteId, body.name, slug, body.type, body.description || null,
    body.parent_id || null, body.language || 'tr', body.translation_group || null
  ).first();

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/taxonomies/:id
taxonomies.put('/:id', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string; description?: string; parent_id?: number }>();

  const existing = await c.env.DB.prepare('SELECT * FROM taxonomies WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first();
  if (!existing) {
    return c.json({ success: false, error: 'Bulunamadı' }, 404);
  }

  const result = await c.env.DB.prepare(
    'UPDATE taxonomies SET name = COALESCE(?, name), description = COALESCE(?, description), parent_id = ? WHERE id = ? RETURNING *'
  ).bind(body.name ?? null, body.description ?? null, body.parent_id ?? existing.parent_id, id).first();

  return c.json({ success: true, data: result });
});

// DELETE /api/taxonomies/:id
taxonomies.delete('/:id', requireRole('editor', 'admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare('SELECT * FROM taxonomies WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first();
  if (!existing) {
    return c.json({ success: false, error: 'Bulunamadı' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM taxonomies WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { message: 'Silindi' } });
});

export default taxonomies;
