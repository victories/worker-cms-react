import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { getPostBySlug } from '../../lib/public-db';

/**
 * llms.txt + per-page Markdown (the llmstxt.org convention).
 *
 *   /llms.txt          — LLM-friendly index of the site (title, summary,
 *                        and a linked list of pages + posts).
 *   /:slug.md          — clean Markdown of any published post/page,
 *   /:lang/:slug.md      generated on demand from the stored HTML (no
 *                        separate storage — a post's .md exists the moment
 *                        it is published).
 *
 * Must be mounted BEFORE the generic `/:slug` post route so `.md` and
 * `llms.txt` win. Plain `.ts` (no JSX) — output is text/plain.
 */
const llms = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”');
}

function stripTags(html: string): string {
  return decodeEntities(
    (html || '')
      .replace(/\[\/?[a-z0-9_-]+(?:\s[^\]]*)?\]/gi, '') // CMS shortcodes
      .replace(/<[^>]+>/g, '')
  ).replace(/\s+/g, ' ').trim();
}

function oneLine(s: string, max = 180): string {
  const t = stripTags(s || '');
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/** Lightweight, DOM-free HTML → Markdown for the .md endpoint. */
function htmlToMarkdown(html: string): string {
  let s = html || '';
  // Drop scripts/styles and CMS shortcodes ([gallery ...], [slider], ...).
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/\[\/?[a-z0-9_-]+(?:\s[^\]]*)?\]/gi, '');
  // Code blocks first (so inner tags are stripped, not double-wrapped).
  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, t) => `\n\n\`\`\`\n${stripTags(t)}\n\`\`\`\n\n`);
  // Inline elements.
  s = s.replace(/<img[^>]*?alt=["']([^"']*)["'][^>]*?src=["']([^"']*)["'][^>]*>/gi, (_m, alt, src) => `![${alt}](${src})`);
  s = s.replace(/<img[^>]*?src=["']([^"']*)["'][^>]*>/gi, (_m, src) => `![](${src})`);
  s = s.replace(/<a[^>]*?href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, t) => `[${stripTags(t)}](${href})`);
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t) => `**${stripTags(t)}**`);
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t) => `*${stripTags(t)}*`);
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, t) => `\`${stripTags(t)}\``);
  // Block elements.
  for (let i = 1; i <= 6; i++) {
    s = s.replace(new RegExp(`<h${i}[^>]*>([\\s\\S]*?)</h${i}>`, 'gi'), (_m, t) => `\n\n${'#'.repeat(i)} ${stripTags(t)}\n\n`);
  }
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, t) => `\n\n> ${stripTags(t)}\n\n`);
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `\n- ${stripTags(t)}`);
  s = s.replace(/<\/(ul|ol)>/gi, '\n\n').replace(/<(ul|ol)[^>]*>/gi, '\n');
  // Tables → simple pipe rows (readable, not a full GFM table).
  s = s.replace(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t) => `| ${stripTags(t)} `);
  s = s.replace(/<\/tr>/gi, '|\n');
  s = s.replace(/<\/(table|thead|tbody|tfoot|tr)>/gi, '\n').replace(/<(table|thead|tbody|tfoot|tr)[^>]*>/gi, '');
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');
  s = s.replace(/<\/p>/gi, '\n\n').replace(/<p[^>]*>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(div|section|article|figure|figcaption)>/gi, '\n').replace(/<(div|section|article|figure|figcaption)[^>]*>/gi, '');
  // Strip anything left, decode entities, tidy whitespace.
  s = s.replace(/<[^>]+>/g, '');
  s = decodeEntities(s);
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

// ---- /llms.txt ----------------------------------------------------------
llms.get('/llms.txt', async (c) => {
  const site = c.get('site') as any;
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const origin = new URL(c.req.url).origin;
  const lang = (site.default_language as string) || 'tr';
  const name = (site.name as string) || 'Site';
  const desc = (site.description as string) || '';

  const [pages, posts] = await Promise.all([
    c.env.DB.prepare(
      `SELECT slug, title, excerpt FROM posts
       WHERE site_id = ? AND post_type = 'page' AND status = 'publish' AND language = ?
       ORDER BY title ASC`
    ).bind(siteId, lang).all<{ slug: string; title: string; excerpt: string | null }>(),
    c.env.DB.prepare(
      `SELECT slug, title, excerpt FROM posts
       WHERE site_id = ? AND post_type = 'post' AND status = 'publish' AND language = ?
       ORDER BY published_at DESC LIMIT 200`
    ).bind(siteId, lang).all<{ slug: string; title: string; excerpt: string | null }>(),
  ]);

  let out = `# ${name}\n`;
  if (desc) out += `\n> ${oneLine(desc, 300)}\n`;
  out += `\nLLM-friendly index of ${name}. Every linked entry has a clean Markdown version at the same URL with a \`.md\` suffix.\n`;

  const list = (rows: { slug: string; title: string; excerpt: string | null }[]) =>
    rows.map((r) => `- [${r.title}](${origin}/${r.slug}.md)${r.excerpt ? ': ' + oneLine(r.excerpt) : ''}`).join('\n');

  if (pages.results.length) out += `\n## Pages\n\n${list(pages.results)}\n`;
  if (posts.results.length) out += `\n## Posts\n\n${list(posts.results)}\n`;

  return c.text(out, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' });
});

// ---- /:slug.md (and /:lang/:slug.md) ------------------------------------
async function serveMarkdown(c: any, slug: string, lang: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const p = await getPostBySlug(c.env.DB, siteId, slug, lang, c.env.CACHE);
  if (!p) return c.notFound();

  const origin = new URL(c.req.url).origin;
  const date = p.published_at ? new Date(p.published_at as string).toISOString().slice(0, 10) : '';

  let out = `# ${p.title}\n`;
  if (p.excerpt) out += `\n> ${oneLine(p.excerpt as string)}\n`;
  out += `\n_${date ? date + ' · ' : ''}${origin}/${slug}_\n\n`;
  out += htmlToMarkdown((p.content as string) || '');

  return c.text(out, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' });
}

llms.get('/:slug{.+\\.md}', (c) => {
  const site = c.get('site') as any;
  const slug = c.req.param('slug').replace(/\.md$/i, '');
  return serveMarkdown(c, slug, (site?.default_language as string) || 'tr');
});

llms.get('/:lang{[a-z]{2}}/:slug{.+\\.md}', (c) => {
  const slug = c.req.param('slug').replace(/\.md$/i, '');
  return serveMarkdown(c, slug, c.req.param('lang'));
});

export default llms;
