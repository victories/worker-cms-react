/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../../../types';
import { renderAMPLayout } from '../../../components/AMPLayout';
import { getAmpSettings, getHomepageSettings, getPageById, getPublicPosts, getSiteTheme, enrichThemeWithAdEmbed, getRichSnippetsSettings } from '../../../lib/public-db';
import { convertToAMP, getRequiredAMPComponents } from '../../../lib/amp';
import { buildWebSiteSchema, buildOrganizationSchema, renderJsonLd } from '../../../lib/schema';
import { processAllShortcodes, ShortcodeContext } from '../../../lib/shortcodes/index';
import { langPrefix } from '../../../lib/lang';

const ampHome = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

async function renderAmpHome(c: any, lang: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const ampConfig = await getAmpSettings(c.env.DB, siteId);
  if (!ampConfig.amp_enabled) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);
  const baseUrl = new URL(c.req.url);
  const origin = baseUrl.origin;
  const canonicalUrl = `${origin}${lp || '/'}`;

  const homepageSettings = await getHomepageSettings(c.env.DB, siteId);

  // --- Static Page as Homepage ---
  if (homepageSettings.show_on_front === 'page' && homepageSettings.page_on_front > 0) {
    const staticPage = await getPageById(c.env.DB, siteId, homepageSettings.page_on_front, lang);

    if (staticPage && staticPage.content) {
      const scCtx: ShortcodeContext = {
        db: c.env.DB, siteId, lang, defaultLang,
        origin, langPrefix: lp,
      };
      const processedContent = await processAllShortcodes(staticPage.content, scCtx);
      const ampContent = convertToAMP(processedContent, origin);
      const ampComponents = getRequiredAMPComponents(ampContent);

      const title = staticPage.seo_title || staticPage.title || site.name;
      const description = staticPage.seo_description || staticPage.excerpt || '';

      const bodyHtml = `
      <div class="container">
        <article class="amp-article">
          <h1>${escHtml(staticPage.title || site.name)}</h1>
          <div class="amp-content">
            ${ampContent}
          </div>
        </article>
        <p class="amp-canonical">
          <a href="${escHtml(canonicalUrl)}">${lang === 'tr' ? 'Tam versiyonu görüntüle' : 'View full version'}</a>
        </p>
      </div>`;

      const theme1 = await getSiteTheme(c.env.DB, siteId);
      await enrichThemeWithAdEmbed(theme1);

      // Build JSON-LD for static AMP homepage
      const rsConfig1 = await getRichSnippetsSettings(c.env.DB, siteId);
      let ampStaticJsonLd: string | undefined;
      if (rsConfig1.enabled && rsConfig1.amp && rsConfig1.homepage) {
        const logoUrl = rsConfig1.publisherLogo || (theme1.site_logo ? `${origin}/uploads/${theme1.site_logo.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}` : undefined);
        const searchPath = lp ? `${lp}/search` : '/search';
        ampStaticJsonLd = renderJsonLd(
          buildWebSiteSchema({ name: rsConfig1.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl, lang, searchPath }),
          buildOrganizationSchema({ name: rsConfig1.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl }),
        );
      }

      return c.html(
        renderAMPLayout({
          title,
          description,
          canonicalUrl,
          lang,
          siteName: site.name,
          ampComponents,
          structuredData: ampStaticJsonLd,
          headerAdCss: theme1.header_ad_amp_css,
          headerAdHtml: theme1.header_ad_amp_body,
          children: bodyHtml,
        })
      );
    }
  }

  // --- Default: Blog Post Listing ---
  const theme = await getSiteTheme(c.env.DB, siteId);
  await enrichThemeWithAdEmbed(theme);
  const { posts, total } = await getPublicPosts(c.env.DB, siteId, lang, {
    page: 1,
    perPage: theme.posts_per_page || 10,
  });

  const postListHtml = posts.length === 0
    ? `<p style="text-align:center;color:#94a3b8;padding:2rem 0">${lang === 'tr' ? 'Henüz yazı yok' : 'No posts yet'}</p>`
    : posts.map((p: any) => {
        const postUrl = `${lp}/${p.slug}`;
        const imgHtml = p.featured_image_url
          ? `<amp-img src="/uploads/${p.featured_image_url.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}" alt="${escHtml(p.title)}" width="400" height="225" layout="responsive" class="amp-card-img"></amp-img>`
          : '';
        return `<article class="amp-card">
          ${imgHtml}
          <div class="amp-card-body">
            <h2><a href="${escHtml(postUrl)}">${escHtml(p.title)}</a></h2>
            <div class="amp-meta">
              <span>${escHtml(p.author_name || '')}</span>
              <span>&middot;</span>
              <span>${p.published_at ? formatDate(p.published_at, lang) : ''}</span>
            </div>
            ${p.excerpt ? `<p class="amp-excerpt">${escHtml(p.excerpt)}</p>` : ''}
            <a href="${escHtml(postUrl)}" class="amp-read-more">${lang === 'tr' ? 'Devamını Oku →' : 'Read More →'}</a>
          </div>
        </article>`;
      }).join('\n');

  const bodyHtml = `
  <div class="container">
    <div class="amp-home-header">
      <h1>${escHtml(site.name)}</h1>
      ${site.description ? `<p>${escHtml(site.description)}</p>` : ''}
    </div>
    <div class="amp-post-list">
      ${postListHtml}
    </div>
    <p class="amp-canonical">
      <a href="${escHtml(canonicalUrl)}">${lang === 'tr' ? 'Tam versiyonu görüntüle' : 'View full version'}</a>
    </p>
  </div>`;

  // Build JSON-LD for blog listing AMP homepage
  const rsConfig = await getRichSnippetsSettings(c.env.DB, siteId);
  let ampBlogJsonLd: string | undefined;
  if (rsConfig.enabled && rsConfig.amp && rsConfig.homepage) {
    const logoUrl = rsConfig.publisherLogo || (theme.site_logo ? `${origin}/uploads/${theme.site_logo.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}` : undefined);
    const searchPath = lp ? `${lp}/search` : '/search';
    ampBlogJsonLd = renderJsonLd(
      buildWebSiteSchema({ name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl, lang, searchPath }),
      buildOrganizationSchema({ name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl }),
    );
  }

  return c.html(
    renderAMPLayout({
      title: site.name,
      description: site.description || '',
      canonicalUrl,
      lang,
      siteName: site.name,
      structuredData: ampBlogJsonLd,
      headerAdCss: theme.header_ad_amp_css,
      headerAdHtml: theme.header_ad_amp_body,
      children: bodyHtml,
    })
  );
}

// /amp/ → AMP homepage (default lang)
ampHome.get('/', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return renderAmpHome(c, site.default_language || 'tr');
});

// /amp/:lang → AMP homepage (non-default lang)
ampHome.get('/:lang{[a-z]{2}}', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  // /:lang could also be a post slug — check if it's exactly 2 lowercase letters
  // If it matches default lang, redirect
  if (lang === defaultLang) return c.redirect('/amp/');
  return renderAmpHome(c, lang);
});

export default ampHome;
