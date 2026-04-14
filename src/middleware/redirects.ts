import type { Context, Next } from 'hono';
import type { Bindings, Variables } from '../types';
import { renderErrorPage } from '../components/ErrorPage';

export async function redirectMiddleware(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const path = new URL(c.req.url).pathname;

  // Skip internal paths
  if (
    path.startsWith('/api/') ||
    path.startsWith('/admin') ||
    path.startsWith('/uploads/') ||
    path.startsWith('/git/') ||
    path.startsWith('/feed') ||
    path.startsWith('/sitemap')
  ) {
    await next();
    return;
  }

  const siteId = c.get('siteId');
  if (!siteId) {
    await next();
    return;
  }

  // Lookup redirect for this path
  const redirect = await c.env.DB.prepare(
    'SELECT * FROM redirects WHERE site_id = ? AND source_path = ? AND is_active = 1'
  ).bind(siteId, path).first<{
    id: number;
    target_url: string | null;
    status_code: number;
  }>();

  if (!redirect) {
    await next();
    return;
  }

  // Increment hit count (fire and forget)
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      'UPDATE redirects SET hit_count = hit_count + 1 WHERE id = ?'
    ).bind(redirect.id).run().catch(() => {})
  );

  const code = redirect.status_code;
  const site = c.get('site') as any;
  const lang = site?.default_language || 'tr';
  const siteName = site?.name;

  // Handle error status codes with styled error pages
  if (code === 403) {
    return c.html(renderErrorPage({ statusCode: 403, lang, siteName }), 403);
  }
  if (code === 404) {
    return c.html(renderErrorPage({ statusCode: 404, lang, siteName }), 404);
  }
  if (code === 410) {
    return c.html(renderErrorPage({ statusCode: 410, lang, siteName }), 410);
  }

  // 301 / 302 redirect
  if (redirect.target_url) {
    return c.redirect(redirect.target_url, code as 301 | 302);
  }

  // Fallback: no target URL for redirect code — pass through
  await next();
}
