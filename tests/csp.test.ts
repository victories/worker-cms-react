import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { cspMiddleware } from '../src/middleware/csp';
import type { Bindings, Variables } from '../src/types';

/**
 * Sets up a minimal Hono app with the CSP middleware and a single
 * `/` handler that echoes the nonce it received via the variable
 * store. Tests then hit that route and assert on header + body.
 */
function makeApp(opts: {
  path?: string;
  contentType?: string;
  body?: string;
} = {}) {
  const { path = '/', contentType = 'text/html; charset=utf-8', body } = opts;
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  app.use('*', cspMiddleware);
  app.get(path, (c) => {
    const nonce = c.get('cspNonce') || '';
    return c.body(body ?? `nonce:${nonce}`, 200, { 'content-type': contentType });
  });
  return app;
}

describe('cspMiddleware', () => {
  it('generates a non-empty base64 nonce per request', async () => {
    const app = makeApp();
    const res = await app.request('http://localhost/');
    const text = await res.text();
    const m = text.match(/^nonce:(.+)$/);
    expect(m).not.toBeNull();
    expect(m![1].length).toBeGreaterThanOrEqual(20); // 16 bytes base64 → ~22 chars
    expect(m![1]).toMatch(/^[A-Za-z0-9+/]+$/);
  });

  it('issues a fresh nonce on each request', async () => {
    const app = makeApp();
    const r1 = await app.request('http://localhost/');
    const r2 = await app.request('http://localhost/');
    expect(await r1.text()).not.toBe(await r2.text());
  });

  it('attaches Report-Only CSP header on HTML responses', async () => {
    const app = makeApp();
    const res = await app.request('http://localhost/');
    const header = res.headers.get('content-security-policy-report-only');
    expect(header).not.toBeNull();
    expect(header!).toContain("default-src 'self'");
    expect(header!).toContain("'strict-dynamic'");
    expect(header!).toContain("frame-ancestors 'none'");
    expect(header!).toContain("object-src 'none'");
    // The script-src directive must embed the freshly generated nonce.
    const body = await res.text();
    const nonce = body.replace('nonce:', '');
    expect(header!).toContain(`'nonce-${nonce}'`);
  });

  it('does NOT attach an enforcing CSP header (Report-Only only for now)', async () => {
    const app = makeApp();
    const res = await app.request('http://localhost/');
    expect(res.headers.get('content-security-policy')).toBeNull();
  });

  it('skips CSP header on non-HTML responses (RSS feed, sitemap, JSON)', async () => {
    const app = makeApp({
      path: '/feed',
      contentType: 'application/rss+xml; charset=utf-8',
      body: '<rss/>',
    });
    const res = await app.request('http://localhost/feed');
    expect(res.headers.get('content-security-policy-report-only')).toBeNull();
  });

  it('skips CSP header on /admin/* paths (SPA owns its own scripts)', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
    app.use('*', cspMiddleware);
    app.get('/admin/index.html', (c) =>
      c.body('<html></html>', 200, { 'content-type': 'text/html; charset=utf-8' })
    );
    const res = await app.request('http://localhost/admin/index.html');
    expect(res.headers.get('content-security-policy-report-only')).toBeNull();
  });

  it('skips CSP header on /amp/* paths (AMP runtime has its own CSP)', async () => {
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
    app.use('*', cspMiddleware);
    app.get('/amp/hello', (c) =>
      c.body('<html></html>', 200, { 'content-type': 'text/html; charset=utf-8' })
    );
    const res = await app.request('http://localhost/amp/hello');
    expect(res.headers.get('content-security-policy-report-only')).toBeNull();
  });

  it('skips CSP header when ?amp=1 is in the query string', async () => {
    const app = makeApp({ path: '/hello', body: '<html></html>' });
    const res = await app.request('http://localhost/hello?amp=1');
    expect(res.headers.get('content-security-policy-report-only')).toBeNull();
  });

  it('still sets the nonce variable even on skipped routes', async () => {
    // Useful so downstream code can read c.var.cspNonce without crashing.
    const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
    app.use('*', cspMiddleware);
    let observed: string | undefined;
    app.get('/admin/x', (c) => {
      observed = c.get('cspNonce');
      return c.body('<html></html>', 200, { 'content-type': 'text/html' });
    });
    await app.request('http://localhost/admin/x');
    expect(observed).toBeDefined();
    expect(observed!.length).toBeGreaterThan(0);
  });
});
