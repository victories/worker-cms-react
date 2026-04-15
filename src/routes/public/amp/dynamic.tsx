/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../../types';
import { renderAMPLayout } from '../../../components/AMPLayout';
import { getPostBySlug, getPostTaxonomies, getAmpSettings, getSiteTheme, enrichThemeWithAdEmbed, getRichSnippetsSettings } from '../../../lib/public-db';
import { convertToAMP, getRequiredAMPComponents, generateStructuredData } from '../../../lib/amp';
import { processAllShortcodes, ShortcodeContext } from '../../../lib/shortcodes/index';
import { langPrefix } from '../../../lib/lang';

const ampDynamic = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Exported for use by ?amp=1 query param handler in post.tsx
export async function renderAmpForPost(c: any, lang: string, slug: string) {
  return renderAmpDynamic(c, lang, slug);
}

async function renderAmpDynamic(c: any, lang: string, slug: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const ampConfig = await getAmpSettings(c.env.DB, siteId);
  if (!ampConfig.amp_enabled) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);

  const p = await getPostBySlug(c.env.DB, siteId, slug, lang);
  if (!p) return c.notFound();

  // Only serve AMP if amp_enabled is set on the post
  if ((p as any).amp_enabled !== 1) return c.notFound();

  const taxonomies = await getPostTaxonomies(c.env.DB, p.id);
  const categories = taxonomies.filter((t) => t.type === 'category');
  const tags = taxonomies.filter((t) => t.type === 'tag');

  const baseUrl = new URL(c.req.url);
  const origin = baseUrl.origin;

  // Canonical URL — points to the non-AMP version on the main domain
  // If custom domain, canonical points back to the main site
  let canonicalOrigin = origin;
  if (ampConfig.amp_custom_domain) {
    // We need to figure out the main site origin from domain lookup
    // The request is on the custom AMP domain; canonical should be the main domain
    // We can get the primary domain from the site's domains
    const primaryDomain = await c.env.DB.prepare(
      'SELECT domain FROM domains WHERE site_id = ? AND is_primary = 1 LIMIT 1'
    ).bind(siteId).first<{ domain: string }>();
    if (primaryDomain) {
      canonicalOrigin = `https://${primaryDomain.domain}`;
    }
  }

  const isPage = p.post_type === 'page';
  const canonicalUrl = isPage
    ? `${canonicalOrigin}${lp}/page/${slug}`
    : `${canonicalOrigin}${lp}/${slug}`;

  // Resolve featured image
  const ogImage = p.og_image_r2_key
    ? `${canonicalOrigin}/uploads/${p.og_image_r2_key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`
    : p.featured_image_url
      ? `${canonicalOrigin}/uploads/${p.featured_image_url.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`
      : undefined;

  const title = p.seo_title || p.title;
  const description = p.seo_description || p.excerpt || '';

  // Process shortcodes then convert to AMP-valid HTML
  const scCtx: ShortcodeContext = {
    db: c.env.DB, siteId, lang, defaultLang,
    origin: canonicalOrigin, langPrefix: lp,
  };
  const processedContent = await processAllShortcodes(p.content || '', scCtx);
  const ampContent = convertToAMP(processedContent, canonicalOrigin);
  const ampComponents = getRequiredAMPComponents(ampContent);

  // Generate JSON-LD structured data (conditional on rich snippets AMP toggle)
  const rsConfig = await getRichSnippetsSettings(c.env.DB, siteId);
  const structuredData = (rsConfig.enabled && rsConfig.amp)
    ? generateStructuredData(
        {
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          content: p.content,
          published_at: p.published_at,
          created_at: p.created_at,
        },
        { name: rsConfig.publisherName || site.name, description: site.description },
        canonicalUrl,
        {
          author: { display_name: p.author_name },
          image: ogImage || null,
        },
      )
    : undefined;

  // Build the article body HTML
  const categoryHtml = categories
    .map((cat) => `<a href="${canonicalOrigin}${lp}/category/${escHtml(cat.slug)}" class="tag">${escHtml(cat.name)}</a>`)
    .join(' ');

  const tagsHtml = tags.length > 0
    ? `<div class="amp-tags">
        <span class="amp-tags-label">${lang === 'tr' ? 'Etiketler:' : 'Tags:'}</span>
        ${tags.map((tag, i) => `<a href="${canonicalOrigin}${lp}/tag/${escHtml(tag.slug)}">${escHtml(tag.name)}</a>${i < tags.length - 1 ? ', ' : ''}`).join('')}
      </div>`
    : '';

  const featuredImgHtml = ogImage
    ? `<amp-img src="${escHtml(ogImage)}" alt="${escHtml(p.title)}" width="800" height="450" layout="responsive" class="amp-featured-img"></amp-img>`
    : '';

  const bodyHtml = `
  <div class="container">
    <article class="amp-article">
      <h1>${escHtml(p.title)}</h1>
      ${p.post_type === 'post' ? `
      <div class="amp-meta">
        <span>${escHtml(p.author_name)}</span>
        <span>&middot;</span>
        <span>${p.published_at ? formatDate(p.published_at, lang) : ''}</span>
        ${categoryHtml}
      </div>` : ''}

      ${featuredImgHtml}

      <div class="amp-content">
        ${ampContent}
      </div>

      ${tagsHtml}
    </article>

    <p class="amp-canonical">
      <a href="${escHtml(canonicalUrl)}">${lang === 'tr' ? 'Tam versiyonu goruntule' : 'View full version'}</a>
    </p>
  </div>`;

  const theme = await getSiteTheme(c.env.DB, siteId);
  await enrichThemeWithAdEmbed(theme);
  return c.html(
    renderAMPLayout({
      title,
      description,
      canonicalUrl,
      lang,
      siteName: site.name,
      ogImage,
      ampComponents,
      structuredData,
      headerAdCss: theme.header_ad_amp_css,
      headerAdHtml: theme.header_ad_amp_body,
      children: bodyHtml,
    })
  );
}

// ---- Suffix format: /:slug/amp ----
ampDynamic.get('/:slug/amp', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const siteId = c.get('siteId');
  if (!siteId) return c.notFound();

  const ampConfig = await getAmpSettings(c.env.DB, siteId);
  // Only handle if the site uses suffix format or custom domain
  if (ampConfig.amp_url_format !== '/slug/amp' && !ampConfig.amp_custom_domain) return c.notFound();

  const slug = c.req.param('slug');
  return renderAmpDynamic(c, site.default_language || 'tr', slug);
});

// Suffix format with lang: /:lang/:slug/amp
ampDynamic.get('/:lang{[a-z]{2}}/:slug/amp', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const siteId = c.get('siteId');
  if (!siteId) return c.notFound();

  const ampConfig = await getAmpSettings(c.env.DB, siteId);
  if (ampConfig.amp_url_format !== '/slug/amp' && !ampConfig.amp_custom_domain) return c.notFound();

  const lang = c.req.param('lang');
  const slug = c.req.param('slug');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/${slug}/amp`);
  return renderAmpDynamic(c, lang, slug);
});

export default ampDynamic;
