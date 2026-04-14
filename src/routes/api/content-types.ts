import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { validateFieldDefinitions, validateSlug } from '../../lib/content-types';
import type { ContentTypeField } from '../../lib/content-types';

const contentTypes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

contentTypes.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/content-types - List all content types for the site
contentTypes.get('/', async (c) => {
  const siteId = c.get('siteId')!;

  const result = await c.env.DB.prepare(
    'SELECT * FROM content_types WHERE site_id = ? AND status = ? ORDER BY menu_position ASC'
  ).bind(siteId, 'active').all();

  // Parse JSON fields
  const types = (result.results as any[]).map((ct) => ({
    ...ct,
    fields: JSON.parse(ct.fields || '[]'),
    supports: JSON.parse(ct.supports || '[]'),
    taxonomies: JSON.parse(ct.taxonomies || '[]'),
  }));

  return c.json({ success: true, data: types });
});

// GET /api/content-types/:slug
contentTypes.get('/:slug', async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  const ct = await c.env.DB.prepare(
    'SELECT * FROM content_types WHERE site_id = ? AND slug = ? AND status = ?'
  ).bind(siteId, slug, 'active').first();

  if (!ct) {
    return c.json({ success: false, error: 'İçerik tipi bulunamadı' }, 404);
  }

  return c.json({
    success: true,
    data: {
      ...ct,
      fields: JSON.parse((ct as any).fields || '[]'),
      supports: JSON.parse((ct as any).supports || '[]'),
      taxonomies: JSON.parse((ct as any).taxonomies || '[]'),
    },
  });
});

// POST /api/content-types - Create new content type
contentTypes.post('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const body = await c.req.json<{
    slug: string;
    name: string;
    name_singular?: string;
    name_plural?: string;
    description?: string;
    icon?: string;
    fields: ContentTypeField[];
    supports?: string[];
    taxonomies?: string[];
    has_archive?: boolean;
    is_hierarchical?: boolean;
    menu_position?: number;
  }>();

  // Validate slug
  const slugError = validateSlug(body.slug);
  if (slugError) {
    return c.json({ success: false, error: slugError }, 400);
  }

  if (!body.name || !body.name.trim()) {
    return c.json({ success: false, error: 'İsim gerekli' }, 400);
  }

  // Check unique slug
  const existing = await c.env.DB.prepare(
    'SELECT id FROM content_types WHERE site_id = ? AND slug = ?'
  ).bind(siteId, body.slug).first();

  if (existing) {
    return c.json({ success: false, error: 'Bu slug zaten kullanılıyor' }, 400);
  }

  // Validate fields
  const fieldErrors = validateFieldDefinitions(body.fields || []);
  if (fieldErrors.length > 0) {
    return c.json({ success: false, error: fieldErrors.join(', ') }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO content_types (
      site_id, slug, name, name_singular, name_plural, description, icon,
      fields, supports, taxonomies, has_archive, is_hierarchical, menu_position, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    siteId,
    body.slug,
    body.name,
    body.name_singular || body.name,
    body.name_plural || body.name,
    body.description || null,
    body.icon || 'file-text',
    JSON.stringify(body.fields || []),
    JSON.stringify(body.supports || ['title', 'editor', 'excerpt', 'thumbnail']),
    JSON.stringify(body.taxonomies || ['category', 'tag']),
    body.has_archive ? 1 : 0,
    body.is_hierarchical ? 1 : 0,
    body.menu_position || 20,
    user.sub
  ).first();

  return c.json({
    success: true,
    data: {
      ...result,
      fields: JSON.parse((result as any).fields || '[]'),
      supports: JSON.parse((result as any).supports || '[]'),
      taxonomies: JSON.parse((result as any).taxonomies || '[]'),
    },
  }, 201);
});

// PUT /api/content-types/:slug - Update content type
contentTypes.put('/:slug', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM content_types WHERE site_id = ? AND slug = ?'
  ).bind(siteId, slug).first();

  if (!existing) {
    return c.json({ success: false, error: 'İçerik tipi bulunamadı' }, 404);
  }

  const body = await c.req.json<Partial<{
    name: string;
    name_singular: string;
    name_plural: string;
    description: string;
    icon: string;
    fields: ContentTypeField[];
    supports: string[];
    taxonomies: string[];
    has_archive: boolean;
    is_hierarchical: boolean;
    menu_position: number;
  }>>();

  // Validate fields if provided
  if (body.fields) {
    const fieldErrors = validateFieldDefinitions(body.fields);
    if (fieldErrors.length > 0) {
      return c.json({ success: false, error: fieldErrors.join(', ') }, 400);
    }
  }

  const result = await c.env.DB.prepare(
    `UPDATE content_types SET
      name = ?, name_singular = ?, name_plural = ?, description = ?, icon = ?,
      fields = ?, supports = ?, taxonomies = ?,
      has_archive = ?, is_hierarchical = ?, menu_position = ?,
      updated_at = datetime('now')
    WHERE id = ? RETURNING *`
  ).bind(
    body.name || (existing as any).name,
    body.name_singular !== undefined ? body.name_singular : (existing as any).name_singular,
    body.name_plural !== undefined ? body.name_plural : (existing as any).name_plural,
    body.description !== undefined ? body.description : (existing as any).description,
    body.icon || (existing as any).icon,
    body.fields ? JSON.stringify(body.fields) : (existing as any).fields,
    body.supports ? JSON.stringify(body.supports) : (existing as any).supports,
    body.taxonomies ? JSON.stringify(body.taxonomies) : (existing as any).taxonomies,
    body.has_archive !== undefined ? (body.has_archive ? 1 : 0) : (existing as any).has_archive,
    body.is_hierarchical !== undefined ? (body.is_hierarchical ? 1 : 0) : (existing as any).is_hierarchical,
    body.menu_position !== undefined ? body.menu_position : (existing as any).menu_position,
    (existing as any).id
  ).first();

  return c.json({
    success: true,
    data: {
      ...result,
      fields: JSON.parse((result as any).fields || '[]'),
      supports: JSON.parse((result as any).supports || '[]'),
      taxonomies: JSON.parse((result as any).taxonomies || '[]'),
    },
  });
});

// DELETE /api/content-types/:slug - Soft delete (set inactive)
contentTypes.delete('/:slug', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');

  const result = await c.env.DB.prepare(
    "UPDATE content_types SET status = 'inactive', updated_at = datetime('now') WHERE site_id = ? AND slug = ?"
  ).bind(siteId, slug).run();

  if (result.meta.changes === 0) {
    return c.json({ success: false, error: 'İçerik tipi bulunamadı' }, 404);
  }

  return c.json({ success: true, data: { message: 'İçerik tipi devre dışı bırakıldı' } });
});

export default contentTypes;
