import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../types';

/**
 * Content-Security-Policy middleware (nonce-based, Report-Only).
 *
 * Generates a 128-bit random nonce per request and stashes it in
 * `c.var.cspNonce`. Inline `<script>` / `<style>` tags emitted by our
 * SSR layer must carry `nonce={cspNonce}` so they pass the policy
 * while attacker-injected inline markup gets rejected.
 *
 * The policy uses `'strict-dynamic'` for scripts — once a nonced
 * script runs, anything it loads inherits trust. That keeps Google
 * Analytics / GTM / oEmbed scripts working without a static
 * `script-src` allowlist.
 *
 * Routes skipped:
 *   - `/admin/*`         → SPA needs `'unsafe-inline'` for now, ships
 *                          its own bundle, owned by us
 *   - `/amp/*`           → AMP serves its own strict CSP via amphtml
 *                          headers; do not override
 *   - `?amp=1` query     → same — AMP dynamic route
 *
 * Non-HTML responses (RSS feed, sitemap.xml, JSON API, media) are
 * skipped via a Content-Type check after `next()`.
 *
 * **Mode: Report-Only.** Shipped as `Content-Security-Policy-Report-Only`
 * so browsers report violations but do not block. After a week of
 * production monitoring with zero false positives, flip the header
 * name to `Content-Security-Policy` to enforce.
 *
 * TODO: switch to enforcing CSP after monitoring report-only for a week.
 */

const CSP_DIRECTIVES = (nonce: string): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com",
    "connect-src 'self' https:",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

/** 16 random bytes → 22-char URL-safe base64 nonce (no padding). */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, '');
}

export const cspMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const nonce = generateNonce();
  c.set('cspNonce', nonce);

  await next();

  // Only attach CSP to HTML responses we actually own.
  const ct = c.res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return;

  const url = new URL(c.req.url);
  const path = url.pathname;

  // Admin SPA — runs its own bundle, untouched for now.
  if (path === '/admin' || path.startsWith('/admin/')) return;

  // AMP routes — AMP runtime ships its own CSP; do not override.
  if (path === '/amp' || path.startsWith('/amp/')) return;
  if (url.searchParams.get('amp') === '1') return;

  c.res.headers.set('Content-Security-Policy-Report-Only', CSP_DIRECTIVES(nonce));
});
