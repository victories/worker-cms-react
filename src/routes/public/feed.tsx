/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { getPublicPosts } from '../../lib/public-db';
import { langPrefix } from '../../lib/lang';

const feed = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Strip shortcode/HTML tags for clean text */
function stripShortcodes(text: string): string {
  return text.replace(/\[[^\]]*\]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRFC822(dateStr: string): string {
  try {
    return new Date(dateStr).toUTCString();
  } catch {
    return dateStr;
  }
}

async function generateFeed(c: any, lang: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);

  const { posts } = await getPublicPosts(c.env.DB, siteId, lang, { perPage: 20 });
  const baseUrl = new URL(c.req.url);
  const siteUrl = `${baseUrl.origin}`;

  const items = posts.map((p) => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${siteUrl}${lp}/${p.slug}</link>
      <guid isPermaLink="true">${siteUrl}${lp}/${p.slug}</guid>
      <description>${escapeXml(stripShortcodes(p.excerpt || ''))}</description>
      <pubDate>${p.published_at ? toRFC822(p.published_at) : ''}</pubDate>
      <dc:creator>${escapeXml(p.author_name || '')}</dc:creator>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(site.description || '')}</description>
    <language>${lang}</language>
    <atom:link href="${siteUrl}${lp}/feed" rel="self" type="application/rss+xml" />
    <lastBuildDate>${posts[0]?.published_at ? toRFC822(posts[0].published_at) : new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}

// Default language (no prefix): /feed
feed.get('/feed', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return generateFeed(c, site.default_language || 'tr');
});

// Non-default language: /:lang/feed
feed.get('/:lang{[a-z]{2}}/feed', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect('/feed');
  return generateFeed(c, lang);
});

export default feed;
