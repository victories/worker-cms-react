import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { cachePurgeSite } from '../../lib/cache';
import { PALETTES, DEFAULT_PALETTE_SLUG } from '../../lib/themes/palettes';

const themes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

themes.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/themes/palettes — List every built-in shadcn palette.
//
// This is consumed by the admin theme UI (ThemeStore + ThemeCustomizer)
// for any caller that cannot import from `src/lib/themes/palettes.ts`
// directly. The admin SPA currently imports the module through the
// `@themes` alias, but this endpoint is still exposed so third-party
// tools and future dynamic palette loading (Faz 8+) have a stable wire
// format to target. Must be declared before `/:id` so the literal
// segment wins over the param.
themes.get('/palettes', async (c) => {
  const list = Object.values(PALETTES).map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description ?? '',
    light: p.light,
    dark: p.dark,
  }));
  return c.json({
    success: true,
    data: {
      default: DEFAULT_PALETTE_SLUG,
      palettes: list,
    },
  });
});

// GET /api/themes — List all themes (system + user-created)
themes.get('/', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM themes ORDER BY is_system DESC, name ASC').all();
  return c.json({ success: true, data: result.results });
});

// GET /api/themes/active — Get active theme for current site
// IMPORTANT: must be defined before /:id to avoid "active" being caught as an id param
themes.get('/active', async (c) => {
  const siteId = c.get('siteId')!;

  const row = await c.env.DB.prepare(
    `SELECT t.*, st.custom_overrides, st.is_active
     FROM site_themes st
     JOIN themes t ON t.id = st.theme_id
     WHERE st.site_id = ? AND st.is_active = 1`
  ).bind(siteId).first();

  if (!row) {
    return c.json({ success: true, data: null });
  }

  const { custom_overrides, is_active, ...theme } = row as any;
  return c.json({
    success: true,
    data: {
      theme,
      overrides: custom_overrides ? JSON.parse(custom_overrides) : {},
    },
  });
});

// GET /api/themes/:id — Get a single theme by ID
themes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const theme = await c.env.DB.prepare('SELECT * FROM themes WHERE id = ?').bind(id).first();

  if (!theme) {
    return c.json({ success: false, error: 'Theme not found' }, 404);
  }

  return c.json({ success: true, data: theme });
});

// POST /api/themes — Create new theme
themes.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json<{
    name: string;
    slug: string;
    description?: string;
    css_variables: Record<string, any>;
    layout_config: Record<string, any>;
    google_fonts?: string;
    custom_css?: string;
  }>();

  if (!body.name || !body.slug || !body.css_variables || !body.layout_config) {
    return c.json({ success: false, error: 'name, slug, css_variables and layout_config are required' }, 400);
  }

  // Check slug uniqueness
  const existing = await c.env.DB.prepare('SELECT id FROM themes WHERE slug = ?').bind(body.slug).first();
  if (existing) {
    return c.json({ success: false, error: 'A theme with this slug already exists' }, 409);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO themes (id, name, slug, description, css_variables, layout_config, google_fonts, custom_css, is_system, created_at, updated_at)
     VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
     RETURNING *`
  ).bind(
    body.name,
    body.slug,
    body.description || null,
    JSON.stringify(body.css_variables),
    JSON.stringify(body.layout_config),
    body.google_fonts || null,
    body.custom_css || null
  ).first();

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/themes/:id — Update theme
themes.put('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user') as any;

  const theme = await c.env.DB.prepare('SELECT * FROM themes WHERE id = ?').bind(id).first<any>();
  if (!theme) {
    return c.json({ success: false, error: 'Theme not found' }, 404);
  }

  // System themes require super_admin
  if (theme.is_system && user?.role !== 'super_admin') {
    return c.json({ success: false, error: 'Only super_admin can edit system themes' }, 403);
  }

  const body = await c.req.json<Record<string, any>>();

  // Cannot change is_system flag
  delete body.is_system;
  delete body.id;
  delete body.created_at;

  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    fields.push(`${key} = ?`);
    if (key === 'css_variables' || key === 'layout_config') {
      values.push(typeof value === 'string' ? value : JSON.stringify(value));
    } else {
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return c.json({ success: true, data: theme });
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const result = await c.env.DB.prepare(
    `UPDATE themes SET ${fields.join(', ')} WHERE id = ? RETURNING *`
  ).bind(...values).first();

  // Purge cache
  const siteId = c.get('siteId')!;
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: result });
});

// DELETE /api/themes/:id — Delete theme
themes.delete('/:id', requireRole('admin'), async (c) => {
  const id = c.req.param('id');

  const theme = await c.env.DB.prepare('SELECT is_system FROM themes WHERE id = ?').bind(id).first<any>();
  if (!theme) {
    return c.json({ success: false, error: 'Theme not found' }, 404);
  }

  if (theme.is_system) {
    return c.json({ success: false, error: 'Cannot delete system themes' }, 403);
  }

  // Delete related site_themes rows first, then the theme
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM site_themes WHERE theme_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM themes WHERE id = ?').bind(id),
  ]);

  return c.json({ success: true });
});

// POST /api/themes/:id/activate — Activate theme for current site
themes.post('/:id/activate', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const themeId = c.req.param('id');

  // Verify theme exists
  const theme = await c.env.DB.prepare('SELECT id FROM themes WHERE id = ?').bind(themeId).first();
  if (!theme) {
    return c.json({ success: false, error: 'Theme not found' }, 404);
  }

  // 1. Deactivate all themes for this site
  await c.env.DB.prepare('UPDATE site_themes SET is_active = 0 WHERE site_id = ?').bind(siteId).run();

  // 2. Check if a site_themes row already exists for this site+theme
  const existing = await c.env.DB.prepare(
    'SELECT id FROM site_themes WHERE site_id = ? AND theme_id = ?'
  ).bind(siteId, themeId).first();

  if (existing) {
    // 3. Activate existing row
    await c.env.DB.prepare(
      'UPDATE site_themes SET is_active = 1 WHERE site_id = ? AND theme_id = ?'
    ).bind(siteId, themeId).run();
  } else {
    // 4. Insert new row
    await c.env.DB.prepare(
      "INSERT INTO site_themes (site_id, theme_id, is_active, custom_overrides, installed_at) VALUES (?, ?, 1, '{}', datetime('now'))"
    ).bind(siteId, themeId).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true });
});

// POST /api/themes/:id/clone — Clone a theme
themes.post('/:id/clone', requireRole('admin'), async (c) => {
  const id = c.req.param('id');

  const theme = await c.env.DB.prepare('SELECT * FROM themes WHERE id = ?').bind(id).first<any>();
  if (!theme) {
    return c.json({ success: false, error: 'Theme not found' }, 404);
  }

  const newSlug = `${theme.slug}-copy-${Date.now()}`;
  const newName = `${theme.name} (Copy)`;

  const result = await c.env.DB.prepare(
    `INSERT INTO themes (id, name, slug, description, css_variables, layout_config, google_fonts, custom_css, is_system, created_at, updated_at)
     VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
     RETURNING *`
  ).bind(
    newName,
    newSlug,
    theme.description,
    theme.css_variables,
    theme.layout_config,
    theme.google_fonts,
    theme.custom_css
  ).first();

  return c.json({ success: true, data: result }, 201);
});

// PUT /api/themes/:id/overrides — Save per-site customizations
themes.put('/:id/overrides', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const themeId = c.req.param('id');
  const body = await c.req.json<{ custom_overrides: Record<string, any> }>();

  if (!body.custom_overrides) {
    return c.json({ success: false, error: 'custom_overrides is required' }, 400);
  }

  const overridesJson = JSON.stringify(body.custom_overrides);

  // Upsert: update if exists, insert if not
  const existing = await c.env.DB.prepare(
    'SELECT id FROM site_themes WHERE site_id = ? AND theme_id = ?'
  ).bind(siteId, themeId).first();

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE site_themes SET custom_overrides = ? WHERE site_id = ? AND theme_id = ?'
    ).bind(overridesJson, siteId, themeId).run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO site_themes (site_id, theme_id, is_active, custom_overrides, installed_at) VALUES (?, ?, 0, ?, datetime('now'))"
    ).bind(siteId, themeId, overridesJson).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true });
});

export default themes;
