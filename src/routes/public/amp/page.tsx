/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../../types';
import { renderAMPLayout } from '../../../components/AMPLayout';
import { getPostBySlug, getAmpSettings, getSiteTheme, enrichThemeWithAdEmbed, getRichSnippetsSettings } from '../../../lib/public-db';
import { convertToAMP, getRequiredAMPComponents, generateStructuredData } from '../../../lib/amp';
import { processAllShortcodes, ShortcodeContext } from '../../../lib/shortcodes/index';
import { langPrefix } from '../../../lib/lang';

const ampPage = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function renderAmpPage(c: any, lang: string, slug: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  // Check if AMP is enabled for this site
  const ampConfig = await getAmpSettings(c.env.DB, siteId);
  if (!ampConfig.amp_enabled) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);

  const p = await getPostBySlug(c.env.DB, siteId, slug, lang);
  if (!p) return c.notFound();

  // Only serve AMP for post_type = 'page'
  if (p.post_type !== 'page') return c.notFound();

  // Only serve AMP if amp_enabled is set on the post
  if ((p as any).amp_enabled !== 1) return c.notFound();

  const baseUrl = new URL(c.req.url);
  const origin = baseUrl.origin;

  // Canonical URL points to the non-AMP page version
  const canonicalUrl = `${origin}${lp}/page/${slug}`;

  // Resolve featured image
  const ogImage = p.og_image_r2_key
    ? `${origin}/uploads/${p.og_image_r2_key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`
    : p.featured_image_url
      ? `${origin}/uploads/${p.featured_image_url.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`
      : undefined;

  const title = p.seo_title || p.title;
  const description = p.seo_description || p.excerpt || '';

  // Process shortcodes then convert to AMP-valid HTML
  const scCtx: ShortcodeContext = {
    db: c.env.DB, siteId, lang, defaultLang,
    origin, langPrefix: lp,
  };
  const processedContent = await processAllShortcodes(p.content || '', scCtx);
  const ampContent = convertToAMP(processedContent, origin);
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

  // Build the page body HTML
  const featuredImgHtml = ogImage
    ? `<amp-img src="${escHtml(ogImage)}" alt="${escHtml(p.title)}" width="800" height="450" layout="responsive" class="amp-featured-img"></amp-img>`
    : '';

  const bodyHtml = `
  <div class="container">
    <article class="amp-article">
      <h1>${escHtml(p.title)}</h1>

      ${featuredImgHtml}

      <div class="amp-content">
        ${ampContent}
      </div>
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

// Default language: /amp/page/:slug (no lang prefix)
// Route path includes /page/ prefix since this is mounted at /amp
ampPage.get('/page/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const slug = c.req.param('slug');
  return renderAmpPage(c, site.default_language || 'tr', slug);
});

// Non-default language: /amp/:lang/page/:slug
ampPage.get('/:lang{[a-z]{2}}/page/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const slug = c.req.param('slug');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/amp/page/${slug}`);
  return renderAmpPage(c, lang, slug);
});

export default ampPage;
