import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { createSlug } from '../../lib/slug';
import { cachePurgeSite } from '../../lib/cache';

const menus = new Hono<{ Bindings: Bindings; Variables: Variables }>();

menus.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/menus
menus.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare('SELECT * FROM menus WHERE site_id = ? ORDER BY name')
    .bind(siteId).all();
  return c.json({ success: true, data: result.results });
});

// GET /api/menus/:id - With items
menus.get('/:id', async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const menu = await c.env.DB.prepare('SELECT * FROM menus WHERE id = ? AND site_id = ?')
    .bind(id, siteId).first();
  if (!menu) return c.json({ success: false, error: 'Menu not found' }, 404);

  const items = await c.env.DB.prepare(
    'SELECT * FROM menu_items WHERE menu_id = ? ORDER BY position ASC'
  ).bind(id).all();

  return c.json({ success: true, data: { ...menu, items: items.results } });
});

// POST /api/menus
menus.post('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<{ name: string; location?: string; language?: string }>();

  if (!body.name) return c.json({ success: false, error: 'Menu name required' }, 400);

  const slug = createSlug(body.name);
  const result = await c.env.DB.prepare(
    'INSERT INTO menus (site_id, name, slug, location, language) VALUES (?, ?, ?, ?, ?) RETURNING *'
  ).bind(siteId, body.name, slug, body.location || null, body.language || 'tr').first();

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/menus/:id
menus.put('/:id', requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string; location?: string; items?: any[] }>();

  if (body.name) {
    await c.env.DB.prepare('UPDATE menus SET name = ?, location = COALESCE(?, location) WHERE id = ?')
      .bind(body.name, body.location ?? null, id).run();
  }

  // Replace all items if provided
  if (body.items) {
    await c.env.DB.prepare('DELETE FROM menu_items WHERE menu_id = ?').bind(id).run();

    // Insert items in order, using temp_id mapping for parent references
    const tempIdToRealId = new Map<string, number>();

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];

      // Resolve parent_id from temp mapping
      let parentId: number | null = null;
      if (item.parent_temp_id && tempIdToRealId.has(item.parent_temp_id)) {
        parentId = tempIdToRealId.get(item.parent_temp_id)!;
      }

      const result = await c.env.DB.prepare(
        'INSERT INTO menu_items (menu_id, parent_id, title, url, target, item_type, item_object_id, position, css_class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id'
      ).bind(
        id,
        parentId,
        item.title,
        item.url || null,
        item.target || '_self',
        item.item_type || 'custom',
        item.item_object_id || null,
        i,
        item.css_class || null
      ).first();

      // Map temp_id to new real id
      if (item.temp_id && result) {
        tempIdToRealId.set(item.temp_id, (result as any).id);
      }
    }
  }

  const menu = await c.env.DB.prepare('SELECT * FROM menus WHERE id = ?').bind(id).first();
  const items = await c.env.DB.prepare('SELECT * FROM menu_items WHERE menu_id = ? ORDER BY position').bind(id).all();

  // Purge cache
  const siteId = c.get('siteId')!;
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: { ...menu, items: items.results } });
});

// DELETE /api/menus/:id
menus.delete('/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM menus WHERE id = ?').bind(id).run();

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: { message: 'Menu deleted' } });
});

export default menus;
