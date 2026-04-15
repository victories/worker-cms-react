/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { langPrefix } from '../../lib/lang';

const sitemap = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toW3CDate(dateStr: string): string {
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return dateStr;
  }
}

sitemap.get('/sitemap.xml', async (c) => {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const baseUrl = new URL(c.req.url);
  const origin = baseUrl.origin;
  const defaultLang = site.default_language || 'tr';

  // Get all published posts and pages
  const posts = await c.env.DB.prepare(
    `SELECT p.slug, p.post_type, p.language, p.published_at, p.updated_at, p.amp_enabled
     FROM posts p
     WHERE p.site_id = ? AND p.status = 'publish'
     ORDER BY p.published_at DESC`
  ).bind(siteId).all();

  // Get all taxonomy archives
  const taxonomies = await c.env.DB.prepare(
    `SELECT t.slug, t.type, t.language
     FROM taxonomies t
     WHERE t.site_id = ? AND t.count > 0
     ORDER BY t.name ASC`
  ).bind(siteId).all();

  const urls: string[] = [];

  // Home page
  urls.push(`
  <url>
    <loc>${escapeXml(origin)}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // Posts and pages
  for (const row of posts.results) {
    const p = row as { slug: string; post_type: string; language: string; published_at: string; updated_at: string; amp_enabled: number };
    const lp = langPrefix(p.language, defaultLang);
    const lastmod = p.updated_at || p.published_at;

    if (p.post_type === 'post') {
      const postUrl = `${origin}${lp}/${p.slug}`;
      const ampLine = p.amp_enabled === 1
        ? `\n    <xhtml:link rel="amphtml" href="${escapeXml(`${origin}/amp${lp}/${p.slug}`)}" />`
        : '';

      urls.push(`
  <url>
    <loc>${escapeXml(postUrl)}</loc>${ampLine}
    <lastmod>${toW3CDate(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    } else if (p.post_type === 'page') {
      const pageUrl = `${origin}${lp}/page/${p.slug}`;
      const ampLine = p.amp_enabled === 1
        ? `\n    <xhtml:link rel="amphtml" href="${escapeXml(`${origin}/amp${lp}/page/${p.slug}`)}" />`
        : '';

      urls.push(`
  <url>
    <loc>${escapeXml(pageUrl)}</loc>${ampLine}
    <lastmod>${toW3CDate(lastmod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }
  }

  // Taxonomy archives
  for (const row of taxonomies.results) {
    const t = row as { slug: string; type: string; language: string };
    const lp = langPrefix(t.language, defaultLang);
    const prefix = t.type === 'category' ? 'category' : 'tag';

    urls.push(`
  <url>
    <loc>${escapeXml(`${origin}${lp}/${prefix}/${t.slug}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

export default sitemap;
