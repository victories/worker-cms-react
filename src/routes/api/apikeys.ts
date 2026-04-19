import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole, requireSite, siteAccessMiddleware } from '../../middleware/auth';
import { hashApiKey } from '../../lib/auth';

const apikeys = new Hono<{ Bindings: Bindings; Variables: Variables }>();

apikeys.use('*', authMiddleware, requireSite, siteAccessMiddleware);

// GET /api/apikeys - List site-scoped API keys for current site
apikeys.get('/', async (c) => {
  const siteId = c.get('siteId')!;
  const result = await c.env.DB.prepare(
    "SELECT id, name, key_prefix, permissions, user_id, last_used, expires_at, created_at FROM api_keys WHERE site_id = ? AND scope = 'site' ORDER BY created_at DESC"
  ).bind(siteId).all();
  return c.json({ success: true, data: result.results });
});

// POST /api/apikeys - Create a new site-scoped API key (admin only)
apikeys.post('/', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const user = c.get('user')!;
  const body = await c.req.json<{ name: string; permissions: string; expires_at?: string }>();

  if (!body.name) {
    return c.json({ success: false, error: 'API key name is required' }, 400);
  }
  if (!body.permissions) {
    return c.json({ success: false, error: 'Permissions are required' }, 400);
  }

  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawKey = 'wcms_' + Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = await hashApiKey(rawKey);

  const result = await c.env.DB.prepare(
    "INSERT INTO api_keys (scope, site_id, name, key_hash, key_prefix, permissions, user_id, expires_at) VALUES ('site', ?, ?, ?, ?, ?, ?, ?) RETURNING id, name, key_prefix, permissions, user_id, expires_at, created_at"
  ).bind(siteId, body.name, keyHash, keyPrefix, body.permissions, user.sub, body.expires_at || null).first();

  return c.json({ success: true, data: { ...result, key: rawKey } }, 201);
});

// DELETE /api/apikeys/:id - Delete a site-scoped API key (admin only)
apikeys.delete('/:id', requireRole('admin'), async (c) => {
  const siteId = c.get('siteId')!;
  const id = parseInt(c.req.param('id'));

  const existing = await c.env.DB.prepare(
    "SELECT id FROM api_keys WHERE id = ? AND site_id = ? AND scope = 'site'"
  ).bind(id, siteId).first();

  if (!existing) {
    return c.json({ success: false, error: 'API key not found' }, 404);
  }

  await c.env.DB.prepare("DELETE FROM api_keys WHERE id = ? AND site_id = ? AND scope = 'site'").bind(id, siteId).run();

  return c.json({ success: true, data: { message: 'API key deleted' } });
});

export default apikeys;
