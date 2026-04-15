import { Hono } from 'hono';
import { createElement, Fragment } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { PublisherLayout } from '../../ssr/layouts/PublisherLayout';
import { Search } from '../../ssr/pages/Search';
import { SEOHead } from '../../ssr/components/SEOHead';
import { ThemeStyles } from '../../ssr/components/ThemeStyles';
import {
  getSiteTheme,
  searchPosts,
  getPostTaxonomies,
  getMenuByLocation,
  getSidebarData,
  getAnalyticsSettings,
  enrichThemeWithAdEmbed,
  getHeaderNavFromSidebar,
  getRichSnippetsSettings,
  hasWhiteLabel,
} from '../../lib/public-db';
import { buildSearchResultsSchema, renderJsonLd } from '../../lib/schema';
import { langPrefix } from '../../lib/lang';
import {
  collectDocumentSlots,
  collectSiteLayoutSlots,
} from '../../lib/plugins/collectors';
import { logSearch } from '../../lib/search';
import { PUBLISHER_CLIENT_JS } from '../../ssr/__generated__/publisher-client';

/**
 * Public full-text search handler — React SSR port (Faz 4).
 *
 * Matches the old `search.tsx` behaviour: empty query shows the
 * prompt, non-empty query runs `searchPosts`, fires a
 * fire-and-forget `logSearch` for analytics, then renders results
 * through `<Shell><PublisherLayout><Search/>`.
 */

const searchRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function renderSearchPage(c: any, lang: string): Promise<Response> {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);
  const query = c.req.query('q') || '';
  const page = parseInt(c.req.query('page') || '1');

  const [theme, sidebarData, analytics, rsConfig, whiteLabel] =
    await Promise.all([
      getSiteTheme(c.env.DB, siteId, c.env.CACHE),
      getSidebarData(c.env.DB, siteId, lang, c.env.CACHE),
      getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
      getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
      hasWhiteLabel(c.env.DB, siteId),
    ]);
  await enrichThemeWithAdEmbed(theme);

  const headerMenu =
    getHeaderNavFromSidebar(sidebarData) ||
    (await getMenuByLocation(c.env.DB, siteId, 'primary', lang));
  const navItems = (headerMenu?.items ?? []) as any[];

  const [pluginSlots, siteSlots] = await Promise.all([
    collectDocumentSlots(site),
    collectSiteLayoutSlots(site),
  ]);

  const baseUrl = new URL(c.req.url);
  const currentPath = baseUrl.pathname;
  const searchAction = `${lp}/search`;

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

  const themeStylesNode = createElement(ThemeStyles, {
    light: theme.cssLight,
    dark: theme.supports_dark_mode ? theme.cssDark : undefined,
  });

  // ---- Empty query: prompt ----
  if (!query.trim()) {
    const seoHead = createElement(SEOHead, {
      title: lang === 'tr' ? 'Arama' : 'Search',
      siteName: site.name,
      lang,
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
          showSidebar: false,
          supportsDarkMode: theme.supports_dark_mode ?? false,
          hidePoweredBy: whiteLabel,
          footerText: theme.footer_text || undefined,
          headerRight: createElement(Fragment, null, ...siteSlots.headerRight),
          sidebarTop: createElement(Fragment, null, ...siteSlots.sidebarTop),
          sidebarBottom: createElement(Fragment, null, ...siteSlots.sidebarBottom),
          footerStart: createElement(Fragment, null, ...siteSlots.footerStart),
          footerEnd: createElement(Fragment, null, ...siteSlots.footerEnd),
          children: createElement(Search, {
            mode: 'empty',
            searchAction,
            lang,
          }),
        }),
      })
    );
  }

  // ---- Non-empty query: run FTS ----
  const { posts, total } = await searchPosts(
    c.env.DB,
    siteId,
    query,
    lang,
    page,
    theme.posts_per_page
  );

  // Fire-and-forget analytics log (doesn't block response)
  if (c.executionCtx) {
    c.executionCtx.waitUntil(
      logSearch(c.env.DB, siteId, query, total, lang).catch(() => {})
    );
  }

  const postsWithTax = await Promise.all(
    posts.map(async (post) => ({
      post,
      categories: (await getPostTaxonomies(c.env.DB, post.id)).filter(
        (t) => t.type === 'category'
      ),
    }))
  );

  const totalPages = Math.ceil(total / theme.posts_per_page);

  // JSON-LD
  let searchJsonLd = '';
  if (rsConfig.enabled) {
    const searchCanonical = `${baseUrl.origin}${lp}/search?q=${encodeURIComponent(
      query
    )}`;
    searchJsonLd = renderJsonLd(
      buildSearchResultsSchema(
        query,
        { name: site.name, description: site.description },
        searchCanonical,
        { lang }
      )
    );
  }

  const seoHead = createElement(SEOHead, {
    title: `${lang === 'tr' ? 'Arama' : 'Search'}: ${query}`,
    siteName: site.name,
    lang,
    jsonLd: searchJsonLd || undefined,
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
        children: createElement(Search, {
          mode: 'results',
          query,
          posts: postsWithTax,
          total,
          currentPage: page,
          totalPages,
          paginationBase: `${lp}/search?q=${encodeURIComponent(query)}`,
          siteId,
          lang,
          lp,
        }),
      }),
    })
  );
}

// Default language (no prefix)
searchRoute.get('/search', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return renderSearchPage(c, site.default_language || 'tr');
});

// Non-default language (with prefix)
searchRoute.get('/:lang{[a-z]{2}}/search', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang)
    return c.redirect(
      '/search' + (c.req.query('q') ? `?q=${c.req.query('q')}` : '')
    );
  return renderSearchPage(c, lang);
});

export default searchRoute;
