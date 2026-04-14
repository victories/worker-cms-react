import type { Context, Next } from 'hono';
import type { Bindings, Variables } from '../types';

// Known bot user-agent patterns to exclude
const BOT_PATTERNS = [
  /bot\b/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /wget/i, /curl/i, /python/i, /node-fetch/i, /axios/i,
  /lighthouse/i, /pagespeed/i, /gtmetrix/i, /pingdom/i,
  /uptimerobot/i, /headlesschrome/i, /phantomjs/i,
];

// Static file extensions to skip
const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif|mp4|webm|pdf|xml|json|txt|robots)$/i;

function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

export async function pageViewTracker(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  await next();

  // Only track successful GET requests to HTML pages
  if (c.req.method !== 'GET') return;
  if (c.res.status !== 200) return;

  const contentType = c.res.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return;

  const siteId = c.get('siteId');
  if (!siteId) return;

  const url = new URL(c.req.url);
  const path = url.pathname;

  // Skip static files
  if (STATIC_EXTENSIONS.test(path)) return;

  // Skip admin and API paths
  if (path.startsWith('/api/') || path.startsWith('/admin')) return;

  const userAgent = c.req.header('user-agent') || '';
  if (!userAgent || isBot(userAgent)) return;

  // Get visitor info from CF headers
  const country = (c.req.raw as any).cf?.country || '';
  const referrer = c.req.header('referer') || '';

  // Record pageview asynchronously (don't block response)
  try {
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        `INSERT INTO page_views (site_id, path, referrer, user_agent, country, viewed_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).bind(siteId, path, referrer || null, userAgent.substring(0, 255), country || null).run()
    );
  } catch {
    // Silently fail - don't break page rendering for analytics
  }
}
