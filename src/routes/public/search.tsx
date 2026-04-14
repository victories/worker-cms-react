import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { getLayoutComponent } from '../../lib/theme-renderer';
import { SEOHead } from '../../components/SEOHead';
import { PostCard } from '../../components/PostCard';
import { Pagination } from '../../components/Pagination';
import { getSiteTheme, searchPosts, getPostTaxonomies, getMenuByLocation, getSidebarData, getAnalyticsSettings, enrichThemeWithAdEmbed, getHeaderNavFromSidebar, getRichSnippetsSettings, hasWhiteLabel } from '../../lib/public-db';
import { buildSearchResultsSchema, renderJsonLd } from '../../lib/schema';
import { langPrefix } from '../../lib/lang';
import { pluginEngine } from '../../lib/plugins/engine';
import { buildNavTree } from '../../lib/nav-utils';
import { logSearch } from '../../lib/search';

const search = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function handleSearch(c: any, lang: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);
  const query = c.req.query('q') || '';
  const page = parseInt(c.req.query('page') || '1');

  const [theme, sidebarData, analytics, rsConfig, whiteLabel] = await Promise.all([
    getSiteTheme(c.env.DB, siteId, c.env.CACHE),
    getSidebarData(c.env.DB, siteId, lang, c.env.CACHE),
    getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
    getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
    hasWhiteLabel(c.env.DB, siteId),
  ]);
  await enrichThemeWithAdEmbed(theme);

  // Header nav: prefer header-area widget menu, fallback to primary location
  const headerMenu = getHeaderNavFromSidebar(sidebarData)
    || await getMenuByLocation(c.env.DB, siteId, 'primary', lang);
  const navItems = buildNavTree(headerMenu?.items || []);

  // Execute plugin hooks for page injection
  const [pluginHead, pluginBodyStart, pluginBodyEnd] = await Promise.all([
    pluginEngine.executeFilter('page.head', '', site),
    pluginEngine.executeFilter('page.bodyStart', '', site),
    pluginEngine.executeFilter('page.bodyEnd', '', site),
  ]);

  const ThemeLayout = getLayoutComponent(theme.template);

  if (!query.trim()) {
    return c.html(
      <ThemeLayout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
        pluginHead={pluginHead} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
        analyticsHead={analytics.head_code} analyticsBody={analytics.body_code}
        hidePoweredBy={whiteLabel}
        currentPath={new URL(c.req.url).pathname} sidebarData={sidebarData}
        head={
          <SEOHead title={lang === 'tr' ? 'Arama' : 'Search'} siteName={site.name} lang={lang} />
        }
      >
        <div class="search-results-header">
          <h1>{lang === 'tr' ? 'Arama' : 'Search'}</h1>
          <p>{lang === 'tr' ? 'Aramak istediğinizi yazın.' : 'Enter your search query.'}</p>
        </div>
        <form class="search-form" action={`${lp}/search`} method="get" style="max-width:500px;margin:2rem 0">
          <input type="text" name="q" placeholder={lang === 'tr' ? 'Ara...' : 'Search...'} />
          <button type="submit">{lang === 'tr' ? 'Ara' : 'Search'}</button>
        </form>
      </ThemeLayout>
    );
  }

  const { posts, total } = await searchPosts(c.env.DB, siteId, query, lang, page, theme.posts_per_page);

  // Log search query for analytics (fire-and-forget)
  if (c.executionCtx) {
    c.executionCtx.waitUntil(logSearch(c.env.DB, siteId, query, total, lang).catch(() => {}));
  }

  const postsWithTax = await Promise.all(
    posts.map(async (post) => ({
      post,
      categories: await getPostTaxonomies(c.env.DB, post.id).then(
        (taxes) => taxes.filter((t) => t.type === 'category')
      ),
    }))
  );

  const totalPages = Math.ceil(total / theme.posts_per_page);

  // Build JSON-LD for search results
  let searchJsonLd = '';
  if (rsConfig.enabled) {
    const baseUrl = new URL(c.req.url);
    const searchCanonical = `${baseUrl.origin}${lp}/search?q=${encodeURIComponent(query)}`;
    searchJsonLd = renderJsonLd(
      buildSearchResultsSchema(query, { name: site.name, description: site.description }, searchCanonical, { lang }),
    );
  }

  return c.html(
    <ThemeLayout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
      pluginHead={pluginHead} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
      analyticsHead={analytics.head_code} analyticsBody={analytics.body_code}
      currentPath={new URL(c.req.url).pathname} sidebarData={sidebarData}
      head={
        <SEOHead title={`${lang === 'tr' ? 'Arama' : 'Search'}: ${query}`} siteName={site.name} lang={lang} jsonLd={searchJsonLd} />
      }
    >
      <div class="search-results-header">
        <h1>{lang === 'tr' ? 'Arama Sonuçları' : 'Search Results'}</h1>
        <p>
          "{query}" — {total} {lang === 'tr' ? 'sonuç bulundu' : (total === 1 ? 'result found' : 'results found')}
        </p>
      </div>

      {posts.length === 0 ? (
        <div class="empty-state">
          <p>{lang === 'tr' ? 'Sonuç bulunamadı' : 'No results found'}</p>
        </div>
      ) : (
        <>
          {postsWithTax.map(({ post, categories: cats }, idx) => (
            <PostCard post={post} lang={lang} defaultLang={defaultLang} categories={cats} siteId={siteId} isLCP={idx === 0} />
          ))}
          <Pagination currentPage={page} totalPages={totalPages} baseUrl={`${lp}/search?q=${encodeURIComponent(query)}`} lang={lang} />
        </>
      )}
    </ThemeLayout>
  );
}

// Default language (no prefix)
search.get('/search', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return handleSearch(c, site.default_language || 'tr');
});

// Non-default language (with prefix)
search.get('/:lang{[a-z]{2}}/search', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect('/search' + (c.req.query('q') ? `?q=${c.req.query('q')}` : ''));
  return handleSearch(c, lang);
});

export default search;
