import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';

const plugins = new Hono<{ Bindings: Bindings; Variables: Variables }>();

plugins.use('*', authMiddleware);

// GET /api/plugins - List all plugins (with site activation status if site specified)
plugins.get('/', async (c) => {
  const siteId = c.get('siteId');

  if (siteId) {
    const result = await c.env.DB.prepare(
      `SELECT p.*, sp.is_active, sp.settings as site_settings, sp.activated_at
       FROM plugins p
       LEFT JOIN site_plugins sp ON p.id = sp.plugin_id AND sp.site_id = ?
       ORDER BY p.name`
    ).bind(siteId).all();
    return c.json({ success: true, data: result.results });
  }

  const result = await c.env.DB.prepare('SELECT * FROM plugins ORDER BY name').all();
  return c.json({ success: true, data: result.results });
});

// POST /api/plugins/deploy - Deploy a 3rd party plugin to dispatch namespace
plugins.post('/deploy', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{
    slug: string;
    name: string;
    code: string;
    hooks: string[];
    permissions?: string[];
    description?: string;
    version?: string;
  }>();

  if (!body.slug || !body.code || !body.hooks?.length) {
    return c.json({ success: false, error: 'slug, code ve hooks gerekli' }, 400);
  }

  const { validatePluginCode } = await import('../../lib/plugins/validator');
  const validation = validatePluginCode(body.code);
  if (!validation.valid) {
    return c.json({ success: false, error: 'Plugin validasyonu basarisiz', details: validation.errors }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, permissions)
     VALUES (?, ?, ?, ?, 'third-party', ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       name = excluded.name, version = excluded.version,
       hooks = excluded.hooks, permissions = excluded.permissions
     RETURNING *`
  ).bind(
    body.slug, body.name, body.description || null, body.version || '1.0.0',
    `dispatch:plugin-${body.slug}`,
    JSON.stringify(body.hooks),
    body.permissions ? JSON.stringify(body.permissions) : null
  ).first();

  return c.json({
    success: true,
    data: result,
    warnings: validation.warnings,
    deploy_note: 'Plugin DB\'ye kaydedildi. CF dispatch namespace\'e deploy icin wrangler dispatch upload komutu gerekli.',
  }, 201);
});

// DELETE /api/plugins/:slug/undeploy - Remove 3rd party plugin
plugins.delete('/:slug/undeploy', requireRole('super_admin'), async (c) => {
  const slug = c.req.param('slug');
  await c.env.DB.prepare('DELETE FROM plugins WHERE slug = ?').bind(slug).run();
  await c.env.DB.prepare(
    'DELETE FROM site_plugins WHERE plugin_id NOT IN (SELECT id FROM plugins)'
  ).run();
  return c.json({ success: true, data: { message: `Plugin "${slug}" kaldirildi` } });
});

// GET /api/plugins/:slug/logs - Get execution logs for a plugin
plugins.get('/:slug/logs', requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const slug = c.req.param('slug');
  const days = parseInt(c.req.query('days') || '7');
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);

  const logs = await c.env.DB.prepare(
    `SELECT id, hook, duration_ms, status, error_message, created_at
     FROM plugin_execution_logs
     WHERE site_id = ? AND plugin_slug = ? AND created_at >= datetime('now', '-' || ? || ' days')
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(siteId, slug, days, limit).all();

  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(*) as total_calls,
       AVG(duration_ms) as avg_duration_ms,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
       SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout_count
     FROM plugin_execution_logs
     WHERE site_id = ? AND plugin_slug = ? AND created_at >= datetime('now', '-' || ? || ' days')`
  ).bind(siteId, slug, days).first();

  return c.json({
    success: true,
    data: {
      logs: logs.results,
      stats: {
        total_calls: stats?.total_calls || 0,
        avg_duration_ms: Math.round((stats?.avg_duration_ms as number) || 0),
        error_count: stats?.error_count || 0,
        timeout_count: stats?.timeout_count || 0,
        error_rate: stats?.total_calls
          ? Math.round(((stats.error_count as number) / (stats.total_calls as number)) * 100)
          : 0,
      },
    },
  });
});

// POST /api/plugins - Register a new plugin (super_admin only)
plugins.post('/', requireRole('super_admin'), async (c) => {
  const body = await c.req.json<{
    slug: string; name: string; description?: string; version: string;
    author?: string; entry_point: string; hooks?: string[]; settings_schema?: Record<string, any>;
    permissions?: string[];
  }>();

  if (!body.slug || !body.name || !body.version || !body.entry_point) {
    return c.json({ success: false, error: 'slug, name, version ve entry_point gerekli' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO plugins (slug, name, description, version, author, entry_point, hooks, settings_schema, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(
    body.slug, body.name, body.description || null, body.version,
    body.author || null, body.entry_point,
    body.hooks ? JSON.stringify(body.hooks) : null,
    body.settings_schema ? JSON.stringify(body.settings_schema) : null,
    body.permissions ? JSON.stringify(body.permissions) : null
  ).first();

  return c.json({ success: true, data: result }, 201);
});

// DELETE /api/plugins/:id - Remove plugin (super_admin only)
plugins.delete('/:id', requireRole('super_admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM plugins WHERE id = ?').bind(id).run();
  return c.json({ success: true, data: { message: 'Eklenti kaldırıldı' } });
});

// POST /api/plugins/:id/activate - Activate for current site
plugins.post('/:id/activate', requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const pluginId = parseInt(c.req.param('id'));

  await c.env.DB.prepare(
    "INSERT INTO site_plugins (site_id, plugin_id, is_active, activated_at) VALUES (?, ?, 1, datetime('now')) ON CONFLICT(site_id, plugin_id) DO UPDATE SET is_active = 1, activated_at = datetime('now')"
  ).bind(siteId, pluginId).run();

  return c.json({ success: true, data: { message: 'Eklenti aktifleştirildi' } });
});

// POST /api/plugins/:id/deactivate
plugins.post('/:id/deactivate', requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const pluginId = parseInt(c.req.param('id'));

  await c.env.DB.prepare(
    'UPDATE site_plugins SET is_active = 0 WHERE site_id = ? AND plugin_id = ?'
  ).bind(siteId, pluginId).run();

  return c.json({ success: true, data: { message: 'Eklenti devre dışı bırakıldı' } });
});

// GET /api/plugins/:id/settings
plugins.get('/:id/settings', requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const pluginId = parseInt(c.req.param('id'));

  const sp = await c.env.DB.prepare(
    'SELECT settings FROM site_plugins WHERE site_id = ? AND plugin_id = ?'
  ).bind(siteId, pluginId).first<{ settings: string | null }>();

  const plugin = await c.env.DB.prepare('SELECT settings_schema FROM plugins WHERE id = ?')
    .bind(pluginId).first<{ settings_schema: string | null }>();

  return c.json({
    success: true,
    data: {
      settings: sp?.settings ? JSON.parse(sp.settings) : {},
      schema: plugin?.settings_schema ? JSON.parse(plugin.settings_schema) : {},
    },
  });
});

// PUT /api/plugins/:id/settings
plugins.put('/:id/settings', requireRole('admin'), requireSite, siteAccessMiddleware, async (c) => {
  const siteId = c.get('siteId')!;
  const pluginId = parseInt(c.req.param('id'));
  const body = await c.req.json<Record<string, any>>();

  await c.env.DB.prepare(
    'UPDATE site_plugins SET settings = ? WHERE site_id = ? AND plugin_id = ?'
  ).bind(JSON.stringify(body), siteId, pluginId).run();

  return c.json({ success: true, data: body });
});

export default plugins;
