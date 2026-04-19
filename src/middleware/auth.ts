import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables, UserRole } from '../types';
import { verifyToken, hashApiKey } from '../lib/auth';

// JWT authentication middleware
export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Yetkilendirme gerekli / Authorization required' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: 'Geçersiz veya süresi dolmuş token / Invalid or expired token' }, 401);
  }

  c.set('user', payload);
  await next();
});

// Role-based access control middleware
export function requireRole(...roles: UserRole[]) {
  return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Yetkilendirme gerekli / Authorization required' }, 401);
    }

    // super_admin has access to everything
    if (user.role === 'super_admin') {
      await next();
      return;
    }

    if (!roles.includes(user.role)) {
      return c.json({ success: false, error: 'Yetkiniz yok / Insufficient permissions' }, 403);
    }

    await next();
  });
}

// Site access control - ensures user has access to the requested site
export const siteAccessMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const user = c.get('user');
  const siteId = c.get('siteId');

  if (!user) {
    return c.json({ success: false, error: 'Yetkilendirme gerekli / Authorization required' }, 401);
  }

  // super_admin has access to all sites
  if (user.role === 'super_admin') {
    await next();
    return;
  }

  if (!siteId) {
    return c.json({ success: false, error: 'Site belirtilmedi / Site not specified' }, 400);
  }

  // Check user_sites table for access
  const userSite = await c.env.DB.prepare(
    'SELECT * FROM user_sites WHERE user_id = ? AND site_id = ?'
  ).bind(user.sub, siteId).first();

  if (!userSite) {
    return c.json({ success: false, error: 'Bu siteye erişiminiz yok / No access to this site' }, 403);
  }

  await next();
});

// Require site to be set (for site-scoped endpoints)
export const requireSite = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const siteId = c.get('siteId');
  if (!siteId) {
    return c.json({ success: false, error: 'X-Site-Id header gerekli / X-Site-Id header required' }, 400);
  }
  await next();
});

// User-scoped API key auth — used by external integrations (e.g. worker-ai-bot)
// that need to discover sites and dispatch content across multiple sites
// the owning user can access. Accepts the key via:
//   - Authorization: Bearer <key>
//   - X-API-Key: <key>
// On success, sets c.var.user with the owning user's payload (sub, role, ...)
// and c.var.apiKey with the key row. Does NOT set c.var.siteId — handlers
// that need a per-site context should also accept X-Site-Id and check it
// against user_sites for non-super_admin users.
export const userApiKeyAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const headerKey = c.req.header('X-API-Key')
    ?? (c.req.header('Authorization')?.startsWith('Bearer ')
      ? c.req.header('Authorization')!.slice(7)
      : undefined);

  if (!headerKey) {
    return c.json({ success: false, error: 'X-API-Key veya Authorization: Bearer gerekli' }, 401);
  }

  if (!headerKey.startsWith('wcms_')) {
    return c.json({ success: false, error: "API anahtarı 'wcms_' ile başlamalı" }, 401);
  }

  const keyHash = await hashApiKey(headerKey);
  const row = await c.env.DB.prepare(
    "SELECT k.id, k.user_id, k.expires_at, k.permissions, u.email, u.role, u.display_name FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ? AND k.scope = 'user'"
  ).bind(keyHash).first<{
    id: number;
    user_id: number;
    expires_at: string | null;
    permissions: string;
    email: string;
    role: UserRole;
    display_name: string;
  }>();

  if (!row) {
    return c.json({ success: false, error: 'Geçersiz API anahtarı' }, 401);
  }

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return c.json({ success: false, error: 'API anahtarının süresi dolmuş' }, 401);
  }

  c.set('user', {
    sub: row.user_id,
    email: row.email,
    role: row.role,
    display_name: row.display_name,
  } as any);

  c.executionCtx.waitUntil(
    c.env.DB.prepare("UPDATE api_keys SET last_used = datetime('now') WHERE id = ?").bind(row.id).run()
  );

  await next();
});
