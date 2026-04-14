import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

// Simple in-memory rate limiter (per-isolate, resets on cold start)
// For production, consider using Cloudflare Rate Limiting API
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number = 60, windowSeconds: number = 60) {
  return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    cleanupStaleEntries();
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const key = `${ip}:${new URL(c.req.url).pathname.split('/').slice(0, 3).join('/')}`;

    const entry = requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      requestCounts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      await next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({
        success: false,
        error: 'Çok fazla istek / Too many requests',
      }, 429);
    }

    entry.count++;
    await next();
  });
}

// Cleanup stale entries during each request check (lazy cleanup)
function cleanupStaleEntries() {
  const now = Date.now();
  // Only cleanup if map is getting large
  if (requestCounts.size > 1000) {
    for (const [key, entry] of requestCounts) {
      if (now > entry.resetAt) requestCounts.delete(key);
    }
  }
}
