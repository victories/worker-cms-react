import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { cachePurgeSite } from '../../lib/cache';

const settings = new Hono<{ Bindings: Bindings; Variables: Variables }>();

settings.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/settings — returns effective settings (site + global merged)
settings.get('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;

  // Fetch both site-level and global settings
  const [siteResult, globalResult] = await Promise.all([
    c.env.DB.prepare('SELECT key, value FROM settings WHERE site_id = ?').bind(siteId).all(),
    c.env.DB.prepare('SELECT key, value FROM global_settings').all(),
  ]);

  const siteMap = new Map((siteResult.results as any[]).map((r: any) => [r.key, r.value]));
  const globalMap = new Map((globalResult.results as any[]).map((r: any) => [r.key, r.value]));

  const data: Record<string, string> = {};
  const inherited: string[] = [];

  // Global values first, then site overrides
  for (const [k, v] of globalMap) {
    // Skip system keys
    if (k === 'version' || k === 'setup_complete') continue;
    if (siteMap.has(k)) {
      data[k] = siteMap.get(k)!;
    } else {
      data[k] = v;
      inherited.push(k);
    }
  }

  // Site-only keys
  for (const [k, v] of siteMap) {
    if (!(k in data)) {
      data[k] = v;
    }
  }

  return c.json({ success: true, data, _inherited: inherited });
});

// PUT /api/settings
settings.put('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<Record<string, string>>();

  for (const [key, value] of Object.entries(body)) {
    await c.env.DB.prepare(
      'INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = ?'
    ).bind(siteId, key, value, value).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: body });
});

// GET /api/settings/theme
settings.get('/theme', async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key LIKE 'theme_%'"
  ).bind(siteId).all();

  const data = Object.fromEntries(result.results.map((s: any) => [s.key, s.value]));
  return c.json({ success: true, data });
});

// PUT /api/settings/theme
settings.put('/theme', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<Record<string, string>>();

  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('theme_')) continue;
    await c.env.DB.prepare(
      'INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = ?'
    ).bind(siteId, key, value, value).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: body });
});

// GET /api/settings/amp
settings.get('/amp', async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key LIKE 'amp_%'"
  ).bind(siteId).all();

  const data = Object.fromEntries(result.results.map((s: any) => [s.key, s.value]));
  return c.json({ success: true, data });
});

// PUT /api/settings/amp
settings.put('/amp', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<Record<string, string>>();

  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('amp_')) continue;
    await c.env.DB.prepare(
      'INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = ?'
    ).bind(siteId, key, value, value).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: body });
});

// GET /api/settings/rich-snippets
settings.get('/rich-snippets', async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key LIKE 'rs_%'"
  ).bind(siteId).all();

  const data = Object.fromEntries(result.results.map((s: any) => [s.key, s.value]));
  return c.json({ success: true, data });
});

// PUT /api/settings/rich-snippets
settings.put('/rich-snippets', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const body = await c.req.json<Record<string, string>>();

  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith('rs_')) continue;
    await c.env.DB.prepare(
      'INSERT INTO settings (site_id, key, value) VALUES (?, ?, ?) ON CONFLICT(site_id, key) DO UPDATE SET value = ?'
    ).bind(siteId, key, value, value).run();
  }

  // Purge cache
  await cachePurgeSite(c.env.CACHE, siteId);

  return c.json({ success: true, data: body });
});

// DELETE /api/settings/:key — remove site-level override (revert to global value)
settings.delete('/:key', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const key = c.req.param('key');

  await c.env.DB.prepare(
    'DELETE FROM settings WHERE site_id = ? AND key = ?'
  ).bind(siteId, key).run();

  return c.json({ success: true });
});

export default settings;
