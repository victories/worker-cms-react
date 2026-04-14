import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables, UserRole } from '../types';
import { verifyToken } from '../lib/auth';

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

// AI access control - checks ai_enabled permission on user
export const requireAiAccess = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: 'Yetkilendirme gerekli / Authorization required' }, 401);

  // super_admin bypasses all limits
  if (user.role === 'super_admin') { await next(); return; }

  const userRecord = await c.env.DB.prepare(
    'SELECT ai_enabled FROM users WHERE id = ?'
  ).bind(user.sub).first<{ ai_enabled: number }>();

  if (!userRecord || userRecord.ai_enabled !== 1) {
    return c.json({ success: false, error: 'AI özelliklerine erişiminiz yok / AI access not enabled' }, 403);
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
