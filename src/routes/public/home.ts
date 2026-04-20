import { Hono } from 'hono';
import { createElement, Fragment } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { PublisherLayout } from '../../ssr/layouts/PublisherLayout';
import { Home } from '../../ssr/pages/Home';
import { SEOHead } from '../../ssr/components/SEOHead';
import { ThemeStyles } from '../../ssr/components/ThemeStyles';
import {
  getSiteTheme,
  getPublicPosts,
  getPostTaxonomies,
  getMenuByLocation,
  getSidebarData,
  getHomepageSettings,
  getPageById,
  getPostMeta,
  getAnalyticsSettings,
  enrichThemeWithAdEmbed,
  getHeaderNavFromSidebar,
  getRichSnippetsSettings,
  hasWhiteLabel,
} from '../../lib/public-db';
import { extractMenuSlugsFromDesign } from '../../lib/themes/layout-helpers';
import {
  buildWebSiteSchema,
  buildOrganizationSchema,
  buildItemListSchema,
  renderJsonLd,
} from '../../lib/schema';
import { langPrefix } from '../../lib/lang';
import { processAllShortcodes, ShortcodeContext } from '../../lib/shortcodes/index';
import { processLayout } from '../../lib/layout';
import {
  collectDocumentSlots,
  collectSiteLayoutSlots,
} from '../../lib/plugins/collectors';
import { PUBLISHER_CLIENT_JS } from '../../ssr/__generated__/publisher-client';

/**
 * Public homepage handler — React SSR port (Faz 4).
 *
 * The old `home.tsx` was a Hono JSX route that concatenated a string
 * document by hand via `<ThemeLayout>`. This rewrite keeps ALL the
 * data fetching, plugin hook collection, shortcode expansion, layout
 * JSON processing, and JSON-LD building identical, and swaps only
 * the render layer to `<Shell><PublisherLayout><Home/></...>`.
 *
 * File extension is `.ts` (not `.tsx`) because we use `createElement`
 * instead of JSX — keeps us away from the Hono/React JSX pragma
 * conflict that would otherwise need per-file tsconfig overrides.
 *
 * Two render modes:
 *   1. Static page as homepage: admin pinned a CMS page via
 *      `show_on_front = page` + `page_on_front = <id>`. We load that
 *      page, run its layout JSON (if any), process its shortcodes,
 *      apply the `post.beforeRender` plugin filter, and render
 *      through `<Home mode="static">` → `<PostContent>` → `<Prose>`.
 *   2. Blog listing: the default. Paginated post grid.
 */

const homeRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Pick first non-empty value after stripping shortcodes/HTML. */
function pickDescription(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    if (!c) continue;
    const clean = c
      .replace(/\[[^\]]*\]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean) return clean;
  }
  return '';
}

async function renderHomePage(c: any, lang: string): Promise<Response> {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const page = parseInt(c.req.query('page') || '1');
  const lp = langPrefix(lang, defaultLang);

  const designForLayout = c.get('activeDesign');
  const extraMenuSlugs = extractMenuSlugsFromDesign(designForLayout);

  const [
    theme,
    sidebarData,
    homepageSettings,
    analytics,
    rsConfig,
    whiteLabel,
  ] = await Promise.all([
    getSiteTheme(c.env.DB, siteId, c.env.CACHE),
    getSidebarData(c.env.DB, siteId, lang, c.env.CACHE, extraMenuSlugs),
    getHomepageSettings(c.env.DB, siteId),
    getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
    getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
    hasWhiteLabel(c.env.DB, siteId),
  ]);
  await enrichThemeWithAdEmbed(theme);

  // Plugin render slots — pre-fetched in parallel so every route
  // handler returns a fully-resolved React tree before `renderPage`.
  const [pluginSlots, siteSlots] = await Promise.all([
    collectDocumentSlots(site),
    collectSiteLayoutSlots(site),
  ]);

  // Header nav: prefer header widget menu, fall back to menus.location='primary'
  const headerMenu =
    getHeaderNavFromSidebar(sidebarData) ||
    (await getMenuByLocation(c.env.DB, siteId, 'primary', lang));
  const navItems = (headerMenu?.items ?? []) as any[];

  const baseUrl = new URL(c.req.url);
  const canonicalUrl = `${baseUrl.origin}${lp || '/'}`;
  const currentPath = baseUrl.pathname;

  // Analytics HTML strings -> body slots. Analytics head goes in the
  // head slot, analytics body goes at body end; we splice both into
  // the shared plugin slots so Shell gets a single node per slot.
  const analyticsHeadNode = analytics.head_code
    ? createElement('div', {
        key: 'analytics-head',
        dangerouslySetInnerHTML: { __html: analytics.head_code },
      })
    : null;
  const analyticsBodyNode = analytics.body_code
    ? createElement('div', {
        key: 'analytics-body',
        dangerouslySetInnerHTML: { __html: analytics.body_code },
      })
    : null;

  // Per-site theme palette override — redeclares shadcn HSL tokens on
  // :root (and .dark for supported themes). Theme Studio design wins
  // when the site has saved one, otherwise falls back to the legacy
  // theme palette. Lives in <head> so it applies before first paint.
  const activeDesign = c.get('activeDesign');
  const themeStylesNode = activeDesign && !activeDesign.isDefault
    ? createElement(ThemeStyles, {
        light: activeDesign.styleTokens.light,
        dark: activeDesign.styleTokens.dark,
        fonts: activeDesign.styleTokens.fonts,
        googleFonts: activeDesign.styleTokens.google_fonts,
      })
    : createElement(ThemeStyles, {
        light: theme.cssLight,
        dark: theme.supports_dark_mode ? theme.cssDark : undefined,
      });

  // ---- Static Page as Homepage ----
  if (
    homepageSettings.show_on_front === 'page' &&
    homepageSettings.page_on_front > 0
  ) {
    const staticPage = await getPageById(
      c.env.DB,
      siteId,
      homepageSettings.page_on_front,
      lang
    );

    if (staticPage && staticPage.content) {
      const scCtx: ShortcodeContext = {
        db: c.env.DB,
        siteId,
        lang,
        defaultLang,
        origin: baseUrl.origin,
        langPrefix: lp,
      };

      const layoutJson = await getPostMeta(c.env.DB, staticPage.id, 'page_layout');

      let renderedContent: string;
      if (layoutJson) {
        try {
          const layout = JSON.parse(layoutJson);
          const postContent = await processAllShortcodes(
            staticPage.content || '',
            scCtx
          );
          renderedContent = await processLayout(layout, scCtx, postContent);
        } catch {
          renderedContent = await processAllShortcodes(staticPage.content, scCtx);
        }
      } else {
        renderedContent = await processAllShortcodes(staticPage.content, scCtx);
      }

      // JSON-LD for static homepage
      let staticJsonLd = '';
      if (rsConfig.enabled && rsConfig.homepage) {
        const logoUrl =
          rsConfig.publisherLogo ||
          (theme.site_logo
            ? `${baseUrl.origin}/uploads/${theme.site_logo.replace(
                `sites/${siteId}/uploads/`,
                `s/${siteId}/`
              )}`
            : undefined);
        const searchPath = lp ? `${lp}/search` : '/search';
        staticJsonLd = renderJsonLd(
          buildWebSiteSchema(
            {
              name: rsConfig.publisherName || site.name,
              description: site.description,
            },
            canonicalUrl,
            { logoUrl, lang, searchPath }
          ),
          buildOrganizationSchema(
            {
              name: rsConfig.publisherName || site.name,
              description: site.description,
            },
            canonicalUrl,
            { logoUrl }
          )
        );
      }

      const seoHead = createElement(SEOHead, {
        title: staticPage.seo_title || staticPage.title || site.name,
        description: pickDescription(
          staticPage.seo_description,
          staticPage.excerpt,
          theme.site_tagline,
          site.description
        ),
        canonicalUrl,
        siteName: site.name,
        lang,
        jsonLd: staticJsonLd || undefined,
      });

      return renderPage(
        createElement(Shell, {
          lang,
          themeClass: theme.color_mode === 'dark' ? 'dark' : undefined,
          themeBootScript: DEFAULT_THEME_BOOT,
          head: createElement(
            Fragment,
            null,
            themeStylesNode,
            seoHead,
            analyticsHeadNode,
            pluginSlots.head
          ),
          bodyStart: createElement(Fragment, null, pluginSlots.bodyStart),
          bodyEnd: createElement(
            Fragment,
            null,
            pluginSlots.bodyEnd,
            analyticsBodyNode,
            createElement('script', {
              dangerouslySetInnerHTML: { __html: PUBLISHER_CLIENT_JS },
            })
          ),
          children: createElement(PublisherLayout, {
            design: c.get('activeDesign'),
            siteName: site.name,
            siteLogo: theme.site_logo || undefined,
            lang,
            lp,
            navItems,
            activePath: currentPath,
            sidebarData,
            showSidebar: false,
            supportsDarkMode: theme.supports_dark_mode ?? false,
            hidePoweredBy: whiteLabel,
            footerText: theme.footer_text || undefined,
            headerRight: createElement(Fragment, null, ...siteSlots.headerRight),
            sidebarTop: createElement(Fragment, null, ...siteSlots.sidebarTop),
            sidebarBottom: createElement(Fragment, null, ...siteSlots.sidebarBottom),
            footerStart: createElement(Fragment, null, ...siteSlots.footerStart),
            footerEnd: createElement(Fragment, null, ...siteSlots.footerEnd),
            children: createElement(Home, {
              mode: 'static',
              staticHtml: renderedContent,
            }),
          }),
        })
      );
    }
    // Static page lookup failed — fall through to blog listing.
  }

  // ---- Blog Post Listing ----
  const { posts, total } = await getPublicPosts(
    c.env.DB,
    siteId,
    lang,
    { page, perPage: theme.posts_per_page },
    c.env.CACHE
  );

  const postsWithTax = await Promise.all(
    posts.map(async (post) => ({
      post,
      categories: (await getPostTaxonomies(c.env.DB, post.id)).filter(
        (t) => t.type === 'category'
      ),
    }))
  );

  const totalPages = Math.ceil(total / theme.posts_per_page);

  // JSON-LD for blog listing homepage
  let blogJsonLd = '';
  if (rsConfig.enabled && rsConfig.homepage) {
    const logoUrl =
      rsConfig.publisherLogo ||
      (theme.site_logo
        ? `${baseUrl.origin}/uploads/${theme.site_logo.replace(
            `sites/${siteId}/uploads/`,
            `s/${siteId}/`
          )}`
        : undefined);
    const searchPath = lp ? `${lp}/search` : '/search';
    const itemListPosts = posts.map((p: any) => ({
      title: p.title,
      url: `${baseUrl.origin}${lp}/${p.slug}`,
    }));
    blogJsonLd = renderJsonLd(
      buildWebSiteSchema(
        {
          name: rsConfig.publisherName || site.name,
          description: site.description,
        },
        canonicalUrl,
        { logoUrl, lang, searchPath }
      ),
      buildOrganizationSchema(
        {
          name: rsConfig.publisherName || site.name,
          description: site.description,
        },
        canonicalUrl,
        { logoUrl }
      ),
      buildItemListSchema(itemListPosts)
    );
  }

  const seoHead = createElement(SEOHead, {
    title: site.name,
    description:
      theme.site_tagline || `${site.name} - ${site.description || ''}`,
    canonicalUrl,
    siteName: site.name,
    lang,
    jsonLd: blogJsonLd || undefined,
  });

  return renderPage(
    createElement(Shell, {
      lang,
      themeClass: theme.color_mode === 'dark' ? 'dark' : undefined,
      themeBootScript: DEFAULT_THEME_BOOT,
      head: createElement(
        Fragment,
        null,
        themeStylesNode,
        seoHead,
        analyticsHeadNode,
        pluginSlots.head
      ),
      bodyStart: createElement(Fragment, null, pluginSlots.bodyStart),
      bodyEnd: createElement(
        Fragment,
        null,
        pluginSlots.bodyEnd,
        analyticsBodyNode,
        createElement('script', {
          dangerouslySetInnerHTML: { __html: PUBLISHER_CLIENT_JS },
        })
      ),
      children: createElement(PublisherLayout, {
        siteName: site.name,
        siteLogo: theme.site_logo || undefined,
        lang,
        lp,
        navItems,
        activePath: currentPath,
        sidebarData,
        showSidebar: true,
        supportsDarkMode: theme.supports_dark_mode ?? false,
        hidePoweredBy: whiteLabel,
        footerText: theme.footer_text || undefined,
        headerRight: createElement(Fragment, null, ...siteSlots.headerRight),
        sidebarTop: createElement(Fragment, null, ...siteSlots.sidebarTop),
        sidebarBottom: createElement(Fragment, null, ...siteSlots.sidebarBottom),
        footerStart: createElement(Fragment, null, ...siteSlots.footerStart),
        footerEnd: createElement(Fragment, null, ...siteSlots.footerEnd),
        children: createElement(Home, {
          mode: 'blog',
          posts: postsWithTax,
          currentPage: page,
          totalPages,
          paginationBase: lp || '/',
          siteId,
          lp,
          lang,
        }),
      }),
    })
  );
}

// Default language: / (no prefix)
homeRoute.get('/', async (c) => {
  const site = c.get('site');
  if (!site) {
    // No site resolved for this domain — show generic landing hint.
    const adminDomain = c.env.ADMIN_DOMAIN || 'workercms.com';
    return c.html(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WorkerCms</title>` +
        `<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f1f5f9}` +
        `.card{background:white;padding:3rem;border-radius:1rem;box-shadow:0 4px 6px -1px rgb(0 0 0/0.1);text-align:center;max-width:500px}` +
        `h1{color:#1e293b;margin-bottom:0.5rem}p{color:#64748b}a{color:#2563eb;text-decoration:none;font-weight:500}` +
        `</style></head>` +
        `<body><div class="card"><h1>WorkerCms</h1><p>Modern Multi-Site CMS</p><p><a href="https://${adminDomain}/">Yönetim Paneli →</a></p></div></body></html>`
    );
  }
  return renderHomePage(c, site.default_language || 'tr');
});

// Non-default language: /:lang
homeRoute.get('/:lang{[a-z]{2}}', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  // If someone visits /tr (default lang with prefix), redirect to /
  if (lang === defaultLang) return c.redirect('/');
  return renderHomePage(c, lang);
});

export default homeRoute;
