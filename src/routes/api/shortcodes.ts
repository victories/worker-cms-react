import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite } from '../../middleware/auth';
import { getRegisteredNames } from '../../lib/shortcodes/registry';

const shortcodes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require authentication
shortcodes.use('*', authMiddleware);
shortcodes.use('*', requireSite);

// Built-in shortcode descriptions for the admin panel
const BUILTIN_DESCRIPTIONS: Record<string, string> = {
  'son-yazilar': 'Son yazıları listeler. [son-yazilar sayi=6 format=kart]',
  'recent-posts': 'Lists recent posts. [recent-posts count=6 format=card]',
  'yazi': 'Tek yazı gösterir. [yazi slug="yazi-adi"]',
  'single-post': 'Displays a single post. [single-post slug="post-name"]',
  'kategori': 'Kategori yazılarını listeler. [kategori slug="kategori-adi" sayi=5]',
  'category': 'Lists posts from a category. [category slug="cat-name" count=5]',
  'slider': 'Kaydırıcı slider gösterir. [slider]',
  'menu': 'Menü gösterir. [menu slug="ana-menu" stil="yatay"]',
  'ozel-html': 'Özel HTML içerik. [ozel-html]<p>HTML</p>[/ozel-html]',
  'custom-html': 'Custom HTML content. [custom-html]<p>HTML</p>[/custom-html]',
  'bosluk': 'Boşluk ekler. [bosluk yukseklik=30]',
  'spacer': 'Adds spacing. [spacer height=30]',
  'ayirici': 'Çizgi ayırıcı ekler. [ayirici]',
  'divider': 'Adds a divider line. [divider]',
  'arama-formu': 'Arama formu gösterir. [arama-formu]',
  'search-form': 'Displays search form. [search-form]',
  'widget': 'Widget gösterir. [widget tip="kategoriler"]',
  'galeri': 'Resim galerisi gösterir. [galeri]',
  'gallery': 'Image gallery. [gallery]',
  'video': 'Video gösterir. [video url="..."]',
  'sosyal-medya': 'Sosyal medya linkleri. [sosyal-medya]',
  'social-media': 'Social media links. [social-media]',
  'iletisim-formu': 'İletişim formu gösterir. [iletisim-formu]',
  'contact-form': 'Displays contact form. [contact-form]',
  'reklam-kodu': 'Aurora reklam embed kodu gösterir. [reklam-kodu domain="example.com"]',
  'ad-embed': 'Displays aurora ad embed. [ad-embed domain="example.com"]',
};

// GET /api/shortcodes - List shortcodes (site-specific + global + built-in)
shortcodes.get('/', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId');

  const rows = await c.env.DB.prepare(
    `SELECT s.*, CASE WHEN s.site_id IS NULL THEN 'global' ELSE 'site' END as scope
     FROM shortcodes s
     WHERE s.site_id IS NULL OR s.site_id = ?
     ORDER BY s.site_id ASC, s.name ASC`
  ).bind(siteId).all();

  // Append built-in shortcodes so they appear in admin panel
  const builtinNames = getRegisteredNames();
  const dbNames = new Set((rows.results || []).map((r: any) => r.name));
  const builtinList = builtinNames
    .filter(name => !dbNames.has(name))
    .map(name => ({
      id: null,
      site_id: null,
      name,
      content: BUILTIN_DESCRIPTIONS[name] || `[${name}]`,
      is_active: 1,
      scope: 'builtin',
      created_at: null,
      updated_at: null,
    }));

  return c.json({ success: true, data: [...(rows.results || []), ...builtinList] });
});

// POST /api/shortcodes - Create shortcode
shortcodes.post('/', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId');
  const user = c.get('user')!; // requireRole guarantees non-null
  const body = await c.req.json<{ name: string; content: string; is_global?: boolean }>();

  if (!body.name || !body.content) {
    return c.json({ success: false, error: 'Name and content are required' }, 400);
  }

  // Validate name: only alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(body.name)) {
    return c.json({ success: false, error: 'Name can only contain letters, numbers, underscore, and hyphen' }, 400);
  }

  // Only super_admin can create global shortcodes
  const targetSiteId = body.is_global && user.role === 'super_admin' ? null : siteId;

  // Check for duplicate name in the same scope
  const existing = await c.env.DB.prepare(
    targetSiteId === null
      ? 'SELECT id FROM shortcodes WHERE site_id IS NULL AND name = ?'
      : 'SELECT id FROM shortcodes WHERE site_id = ? AND name = ?'
  ).bind(...(targetSiteId === null ? [body.name] : [targetSiteId, body.name])).first();

  if (existing) {
    return c.json({ success: false, error: 'A shortcode with this name already exists' }, 409);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO shortcodes (site_id, name, content) VALUES (?, ?, ?)'
  ).bind(targetSiteId, body.name, body.content).run();

  return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

// PUT /api/shortcodes/:id - Update shortcode
shortcodes.put('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId');
  const user = c.get('user')!; // requireRole guarantees non-null
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json<{ name?: string; content?: string; is_active?: boolean; is_global?: boolean }>();

  // Fetch existing shortcode
  const existing = await c.env.DB.prepare(
    'SELECT * FROM shortcodes WHERE id = ?'
  ).bind(id).first<{ id: number; site_id: number | null; name: string }>();

  if (!existing) {
    return c.json({ success: false, error: 'Shortcode not found' }, 404);
  }

  // Only super_admin can edit global shortcodes
  if (existing.site_id === null && user.role !== 'super_admin') {
    return c.json({ success: false, error: 'Only super admin can edit global shortcodes' }, 403);
  }

  // Admin can only edit their site's shortcodes
  if (existing.site_id !== null && existing.site_id !== siteId && user.role !== 'super_admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  // Validate name if provided
  if (body.name && !/^[a-zA-Z0-9_-]+$/.test(body.name)) {
    return c.json({ success: false, error: 'Name can only contain letters, numbers, underscore, and hyphen' }, 400);
  }

  // Check name uniqueness if name is being changed
  if (body.name && body.name !== existing.name) {
    const scopeSiteId = existing.site_id;
    const dup = await c.env.DB.prepare(
      scopeSiteId === null
        ? 'SELECT id FROM shortcodes WHERE site_id IS NULL AND name = ? AND id != ?'
        : 'SELECT id FROM shortcodes WHERE site_id = ? AND name = ? AND id != ?'
    ).bind(...(scopeSiteId === null ? [body.name, id] : [scopeSiteId, body.name, id])).first();

    if (dup) {
      return c.json({ success: false, error: 'A shortcode with this name already exists' }, 409);
    }
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
  if (body.content !== undefined) { updates.push('content = ?'); values.push(body.content); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }
  updates.push("updated_at = datetime('now')");

  if (updates.length > 1) {
    values.push(id);
    await c.env.DB.prepare(
      `UPDATE shortcodes SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  return c.json({ success: true });
});

// DELETE /api/shortcodes/:id - Delete shortcode
shortcodes.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  const siteId = c.get('siteId');
  const user = c.get('user')!; // requireRole guarantees non-null
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    'SELECT * FROM shortcodes WHERE id = ?'
  ).bind(id).first<{ id: number; site_id: number | null }>();

  if (!existing) {
    return c.json({ success: false, error: 'Shortcode not found' }, 404);
  }

  // Only super_admin can delete global shortcodes
  if (existing.site_id === null && user.role !== 'super_admin') {
    return c.json({ success: false, error: 'Only super admin can delete global shortcodes' }, 403);
  }

  // Admin can only delete their site's shortcodes
  if (existing.site_id !== null && existing.site_id !== siteId && user.role !== 'super_admin') {
    return c.json({ success: false, error: 'Access denied' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM shortcodes WHERE id = ?').bind(id).run();

  return c.json({ success: true });
});

export default shortcodes;
