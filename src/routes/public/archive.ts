import { Hono } from 'hono';
import { createElement, Fragment } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { PublisherLayout } from '../../ssr/layouts/PublisherLayout';
import { Archive } from '../../ssr/pages/Archive';
import { SEOHead } from '../../ssr/components/SEOHead';
import {
  getSiteTheme,
  getTaxonomyBySlug,
  getPostsByTaxonomy,
  getPostTaxonomies,
  getMenuByLocation,
  getSidebarData,
  getAnalyticsSettings,
  enrichThemeWithAdEmbed,
  getHeaderNavFromSidebar,
  getRichSnippetsSettings,
  hasWhiteLabel,
} from '../../lib/public-db';
import {
  buildCollectionPageSchema,
  buildBreadcrumbSchema,
  buildItemListSchema,
  renderJsonLd,
} from '../../lib/schema';
import { langPrefix } from '../../lib/lang';
import { collectPluginSlots } from '../../lib/plugins/react-bridge';
import { PUBLISHER_CLIENT_JS } from '../../ssr/__generated__/publisher-client';

/**
 * Public category/tag archive handler — React SSR port (Faz 4).
 *
 * The old `archive.tsx` was parameterised by `type` at render time
 * inside a Hono JSX handler — this rewrite keeps the same split and
 * swaps the render layer to `<Shell><PublisherLayout><Archive/>`.
 *
 * `handleArchive()` does ALL the data fetching and passes pre-built
 * props down to the pure `<Archive>` component. The route variants
 * below wrap it for default / non-default language + category / tag.
 */

const archiveRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function renderArchivePage(
  c: any,
  type: 'category' | 'tag',
  lang: string,
  slug: string
): Promise<Response> {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);
  const page = parseInt(c.req.query('page') || '1');

  const [taxonomy, theme, sidebarData, analytics, rsConfig, whiteLabel] =
    await Promise.all([
      getTaxonomyBySlug(c.env.DB, siteId, slug, type, lang),
      getSiteTheme(c.env.DB, siteId, c.env.CACHE),
      getSidebarData(c.env.DB, siteId, lang, c.env.CACHE),
      getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
      getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
      hasWhiteLabel(c.env.DB, siteId),
    ]);
  await enrichThemeWithAdEmbed(theme);

  if (!taxonomy) return c.notFound();

  const pluginSlots = await collectPluginSlots(site);

  const { posts, total } = await getPostsByTaxonomy(
    c.env.DB,
    siteId,
    taxonomy.id,
    lang,
    page,
    theme.posts_per_page
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

  const headerMenu =
    getHeaderNavFromSidebar(sidebarData) ||
    (await getMenuByLocation(c.env.DB, siteId, 'primary', lang));
  const navItems = (headerMenu?.items ?? []) as any[];

  const baseUrl = new URL(c.req.url);
  const canonicalUrl = `${baseUrl.origin}${lp}/${type}/${slug}`;
  const typeLabel =
    type === 'category'
      ? lang === 'tr'
        ? 'Kategori'
        : 'Category'
      : lang === 'tr'
        ? 'Etiket'
        : 'Tag';

  // ---- JSON-LD ----
  let archiveJsonLd = '';
  if (rsConfig.enabled && rsConfig.archives) {
    const schemas: (Record<string, unknown> | null)[] = [
      buildCollectionPageSchema(
        {
          name: taxonomy.name,
          slug: taxonomy.slug,
          type,
          description: taxonomy.description,
          count: total,
        },
        { name: site.name, description: site.description },
        canonicalUrl,
        { lang }
      ),
    ];
    if (rsConfig.breadcrumbs) {
      schemas.push(
        buildBreadcrumbSchema([
          {
            name: lang === 'tr' ? 'Ana Sayfa' : 'Home',
            url: `${baseUrl.origin}${lp || '/'}`,
          },
          { name: typeLabel, url: canonicalUrl },
          { name: taxonomy.name, url: canonicalUrl },
        ])
      );
    }
    const itemListPosts = posts.map((p: any) => ({
      title: p.title,
      url: `${baseUrl.origin}${lp}/${p.slug}`,
    }));
    const itemList = buildItemListSchema(itemListPosts);
    if (itemList) schemas.push(itemList);
    archiveJsonLd = renderJsonLd(...schemas);
  }

  // ---- Analytics nodes ----
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

  const seoHead = createElement(SEOHead, {
    title: `${typeLabel}: ${taxonomy.name}`,
    description: taxonomy.description || `${typeLabel}: ${taxonomy.name}`,
    canonicalUrl,
    siteName: site.name,
    lang,
    jsonLd: archiveJsonLd || undefined,
  });

  return renderPage(
    createElement(Shell, {
      lang,
      themeClass: theme.color_mode === 'dark' ? 'dark' : undefined,
      themeBootScript: DEFAULT_THEME_BOOT,
      head: createElement(
        Fragment,
        null,
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
        activePath: baseUrl.pathname,
        sidebarData,
        showSidebar: true,
        supportsDarkMode: theme.supports_dark_mode ?? false,
        hidePoweredBy: whiteLabel,
        footerText: theme.footer_text || undefined,
        children: createElement(Archive, {
          type,
          taxonomy,
          posts: postsWithTax,
          totalPosts: total,
          currentPage: page,
          totalPages,
          paginationBase: `${lp}/${type}/${slug}`,
          siteId,
          lang,
          lp,
        }),
      }),
    })
  );
}

// ---- Default language (no prefix) ----
archiveRoute.get('/category/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return renderArchivePage(
    c,
    'category',
    site.default_language || 'tr',
    c.req.param('slug')
  );
});

archiveRoute.get('/tag/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return renderArchivePage(
    c,
    'tag',
    site.default_language || 'tr',
    c.req.param('slug')
  );
});

// ---- Non-default language (with prefix) ----
archiveRoute.get('/:lang{[a-z]{2}}/category/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang)
    return c.redirect(`/category/${c.req.param('slug')}`);
  return renderArchivePage(c, 'category', lang, c.req.param('slug'));
});

archiveRoute.get('/:lang{[a-z]{2}}/tag/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/tag/${c.req.param('slug')}`);
  return renderArchivePage(c, 'tag', lang, c.req.param('slug'));
});

export default archiveRoute;
