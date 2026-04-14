import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { cachePurgeSite } from '../../lib/cache';

const widgets = new Hono<{ Bindings: Bindings; Variables: Variables }>();

widgets.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/widgets
widgets.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const area = c.req.query('area');

  let query = 'SELECT * FROM widgets WHERE site_id = ?';
  const params: any[] = [siteId];

  if (area) {
    query += ' AND area = ?';
    params.push(area);
  }

  query += ' ORDER BY area, position ASC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/widgets
widgets.post('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{
    area: string;
    widget_type: string;
    title?: string;
    config?: any;
    position?: number;
  }>();

  if (!body.area || !body.widget_type) {
    return c.json({ success: false, error: 'Alan ve widget tipi gerekli' }, 400);
  }

  const maxPos = await c.env.DB.prepare(
    'SELECT MAX(position) as max_pos FROM widgets WHERE site_id = ? AND area = ?'
  ).bind(siteId, body.area).first<{ max_pos: number | null }>();

  const position = body.position ?? ((maxPos?.max_pos ?? -1) + 1);

  const result = await c.env.DB.prepare(
    'INSERT INTO widgets (site_id, area, widget_type, title, config, position) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(
    siteId, body.area, body.widget_type,
    body.title || null,
    body.config ? JSON.stringify(body.config) : null,
    position
  ).first();

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/widgets/reorder - Batch reorder (must be before /:id to avoid param capture)
widgets.put('/reorder', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{ items: { id: number; position: number }[] }>();

  for (const item of body.items) {
    await c.env.DB.prepare('UPDATE widgets SET position = ? WHERE id = ?')
      .bind(item.position, item.id).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true });
});

// PUT /api/widgets/:id
widgets.put('/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{
    title?: string;
    config?: any;
    position?: number;
    is_active?: boolean;
  }>();

  const existing = await c.env.DB.prepare('SELECT * FROM widgets WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first();
  if (!existing) return c.json({ success: false, error: 'Widget bulunamadı' }, 404);

  await c.env.DB.prepare(
    'UPDATE widgets SET title = COALESCE(?, title), config = COALESCE(?, config), position = COALESCE(?, position), is_active = COALESCE(?, is_active) WHERE id = ?'
  ).bind(
    body.title ?? null,
    body.config ? JSON.stringify(body.config) : null,
    body.position ?? null,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : null,
    id
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM widgets WHERE id = ?').bind(id).first();

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: updated });
});

// DELETE /api/widgets/:id
widgets.delete('/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  await c.env.DB.prepare('DELETE FROM widgets WHERE id = ? AND site_id = ?')
    .bind(id, siteId).run();

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: { message: 'Widget silindi' } });
});

export default widgets;
