import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

// Default open CORS for everything that is not under /api/.
// Public site routes (HTML, RSS, sitemap) intentionally allow any origin
// since they serve cached, non-credentialed content.
const openCors = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Site-Id', 'X-API-Key'],
  exposeHeaders: ['X-Total-Count'],
  maxAge: 86400,
});

// External / API-key endpoints stay open: auth is by key, browsers are
// not the only client, and the cms-hub bot calls these cross-origin.
const externalCors = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Site-Id', 'X-API-Key'],
  exposeHeaders: ['X-Total-Count'],
  maxAge: 86400,
});

// Admin API endpoints (everything under /api/* except the explicit
// external surface above) — restrict to the configured admin domain
// plus same-origin to defend against cross-origin requests from
// untrusted pages while the user is logged in.
function adminCors(env: Bindings) {
  const adminDomain = (env.ADMIN_DOMAIN || '').trim();
  const allowed: string[] = [];
  if (adminDomain) {
    allowed.push(`https://${adminDomain}`);
    allowed.push(`https://www.${adminDomain}`);
  }
  // Local dev
  allowed.push('http://localhost:5173');
  allowed.push('http://localhost:8787');
  allowed.push('http://127.0.0.1:5173');
  allowed.push('http://127.0.0.1:8787');

  return cors({
    origin: (origin) => {
      if (!origin) return origin; // same-origin / curl — let through
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Site-Id', 'X-API-Key'],
    exposeHeaders: ['X-Total-Count'],
    credentials: false,
    maxAge: 86400,
  });
}

export const corsMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
  async (c, next) => {
    const path = new URL(c.req.url).pathname;
    // API-key authenticated surfaces — bot and external integrations.
    if (path.startsWith('/api/external') || path.startsWith('/api/account') || path.startsWith('/mcp')) {
      return externalCors(c, next);
    }
    // Admin/JWT API surface — restricted origin allowlist.
    if (path.startsWith('/api/')) {
      return adminCors(c.env)(c, next);
    }
    // Public site routes — open.
    return openCors(c, next);
  }
);
