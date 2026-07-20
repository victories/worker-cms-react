import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

// Helper: check if host is the admin domain (primary or workers.dev fallback)
function isAdminDomain(host: string, env: any): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, '');
  const adminDomain = (env.ADMIN_DOMAIN || '').toLowerCase().replace(/:\d+$/, '');
  if (adminDomain && (h === adminDomain || h === `www.${adminDomain}`)) return true;
  if (h.endsWith('.workers.dev')) return true;
  return false;
}

// Domain → site_id resolution middleware
// This is the CRITICAL middleware that enables multi-site functionality
export const siteResolver = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  // `X-Site-Host` is set by our upstream proxy when it fronts a customer
  // domain and forwards to this worker over `*.workers.dev`. When present it
  // is the authoritative host for site resolution (the wire `Host` header is
  // the workers.dev routing name). See the fetch wrapper in `index.ts`.
  const proxyHost = (c.req.header('x-site-host') || '').trim().toLowerCase();
  const host = proxyHost || c.req.header('host') || '';

  // Admin domain handling
  if (isAdminDomain(host, c.env)) {
    const url = new URL(c.req.url);
    const path = url.pathname;
    // For API/admin requests on admin domain, support X-Site-Id header
    if (path.startsWith('/api/') || path.startsWith('/admin')) {
      const siteIdHeader = c.req.header('X-Site-Id');
      if (siteIdHeader) {
        const siteId = parseInt(siteIdHeader);
        if (!isNaN(siteId)) {
          const site = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?')
            .bind(siteId)
            .first();
          if (site) {
            c.set('siteId', site.id as number);
            c.set('site', site as any);
          }
        }
      }
    } else if (path !== '/' && !path.startsWith('/uploads/') && !path.startsWith('/git/')) {
      // Public page paths on admin domain: resolve site from domain
      // so pages like /iletisim, /gizlilik etc. work on the admin domain
      const domain = host.toLowerCase().replace(/:\d+$/, '');
      const siteDomain = await c.env.DB.prepare(
        'SELECT sd.*, s.* FROM site_domains sd JOIN sites s ON sd.site_id = s.id WHERE sd.domain = ?'
      ).bind(domain).first();
      if (siteDomain) {
        c.set('siteId', siteDomain.site_id as number);
        c.set('site', {
          id: siteDomain.site_id,
          name: siteDomain.name,
          slug: siteDomain.slug,
          description: siteDomain.description,
          status: siteDomain.status,
          is_management: (siteDomain as any).is_management,
          default_language: siteDomain.default_language,
          created_at: siteDomain.created_at,
          updated_at: siteDomain.updated_at,
        } as any);
      }
    }
    await next();
    return;
  }

  // Admin panel and API requests: site resolved from X-Site-Id header
  const url = new URL(c.req.url);
  const path = url.pathname;
  if (path.startsWith('/api/') || path.startsWith('/admin')) {
    const siteIdHeader = c.req.header('X-Site-Id');
    if (siteIdHeader) {
      const siteId = parseInt(siteIdHeader);
      if (!isNaN(siteId)) {
        const site = await c.env.DB.prepare('SELECT * FROM sites WHERE id = ?')
          .bind(siteId)
          .first();
        if (site) {
          c.set('siteId', site.id as number);
          c.set('site', site as any);
        }
      }
    }

    // Fallback: for public API endpoints without X-Site-Id (contact form, comments, etc.)
    // resolve site from domain so forms on the public site work
    if (!c.get('siteId')) {
      const domain = host.toLowerCase().replace(/:\d+$/, '');
      const domainWithPort = host.toLowerCase();
      let siteDomain = await c.env.DB.prepare(
        'SELECT sd.*, s.* FROM site_domains sd JOIN sites s ON sd.site_id = s.id WHERE sd.domain = ?'
      ).bind(domainWithPort).first();
      if (!siteDomain) {
        siteDomain = await c.env.DB.prepare(
          'SELECT sd.*, s.* FROM site_domains sd JOIN sites s ON sd.site_id = s.id WHERE sd.domain = ?'
        ).bind(domain).first();
      }
      if (siteDomain) {
        c.set('siteId', siteDomain.site_id as number);
        c.set('site', {
          id: siteDomain.site_id,
          name: siteDomain.name,
          slug: siteDomain.slug,
          description: siteDomain.description,
          status: siteDomain.status,
          is_management: (siteDomain as any).is_management,
          default_language: siteDomain.default_language,
          created_at: siteDomain.created_at,
          updated_at: siteDomain.updated_at,
        } as any);
      }
    }

    // For admin/API without X-Site-Id or domain match, siteId stays null (some endpoints don't need it)
    await next();
    return;
  }

  // Public site: resolve site from domain
  const domain = host.toLowerCase().replace(/:\d+$/, ''); // Remove port for matching
  const domainWithPort = host.toLowerCase(); // Keep port for localhost matching

  // Domain -> site çözümü. KRİTİK: KV'de cache'le (pozitif + negatif). Aksi
  // halde her istek (bot seli dahil) D1'e vurur ve D1 boğulur (2026-07-20 olayı).
  let siteDomain: any = null;
  let fromCache = false;
  const kv = c.env.CACHE;
  const cacheKey = `siteres:${domainWithPort}`;
  if (kv) {
    try {
      const hit = await kv.get(cacheKey);
      if (hit !== null) {
        fromCache = true;
        const p = JSON.parse(hit);
        siteDomain = p && p.__none__ ? null : p;
      }
    } catch { /* KV hatası → D1'e düş */ }
  }
  if (!fromCache) {
    siteDomain = await c.env.DB.prepare(
      'SELECT sd.*, s.* FROM site_domains sd JOIN sites s ON sd.site_id = s.id WHERE sd.domain = ?'
    ).bind(domainWithPort).first();
    if (!siteDomain) {
      siteDomain = await c.env.DB.prepare(
        'SELECT sd.*, s.* FROM site_domains sd JOIN sites s ON sd.site_id = s.id WHERE sd.domain = ?'
      ).bind(domain).first();
    }
    if (kv) {
      const toStore = siteDomain ? JSON.stringify(siteDomain) : '{"__none__":true}';
      c.executionCtx.waitUntil(kv.put(cacheKey, toStore, { expirationTtl: 60 }));
    }
  }

  if (!siteDomain) {
    // No domain match — let the route handler decide (root shows landing page, others 404)
    await next();
    return;
  }

  // Check if site is paused — return 403 for public visitors
  if ((siteDomain as any).status === 'paused') {
    return c.html(
      `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>403 - Site Kullanıma Kapalı</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#334155}
.c{text-align:center;padding:2rem}.code{font-size:6rem;font-weight:800;color:#e2e8f0;line-height:1}.msg{font-size:1.25rem;margin-top:.5rem;color:#64748b}.sub{font-size:.875rem;margin-top:1rem;color:#94a3b8}</style>
</head>
<body><div class="c"><div class="code">403</div><div class="msg">Bu site şu anda kullanıma kapalıdır.</div><div class="sub">This site is currently unavailable.</div></div></body>
</html>`,
      403
    );
  }

  c.set('siteId', siteDomain.site_id as number);
  c.set('site', {
    id: siteDomain.site_id,
    name: siteDomain.name,
    slug: siteDomain.slug,
    description: siteDomain.description,
    status: siteDomain.status,
    is_management: (siteDomain as any).is_management,
    default_language: siteDomain.default_language,
    created_at: siteDomain.created_at,
    updated_at: siteDomain.updated_at,
  } as any);

  await next();
});
