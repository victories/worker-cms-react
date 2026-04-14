import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { getLayoutComponent } from '../../lib/theme-renderer';
import { SEOHead } from '../../components/SEOHead';
import { PostCard } from '../../components/PostCard';
import { Pagination } from '../../components/Pagination';
import { getSiteTheme, getTaxonomyBySlug, getPostsByTaxonomy, getPostTaxonomies, getMenuByLocation, getSidebarData, getAnalyticsSettings, enrichThemeWithAdEmbed, getHeaderNavFromSidebar, getRichSnippetsSettings, hasWhiteLabel } from '../../lib/public-db';
import { buildCollectionPageSchema, buildBreadcrumbSchema, buildItemListSchema, renderJsonLd } from '../../lib/schema';
import { langPrefix } from '../../lib/lang';
import { pluginEngine } from '../../lib/plugins/engine';
import { buildNavTree } from '../../lib/nav-utils';

const archive = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function handleArchive(c: any, type: 'category' | 'tag', lang: string, slug: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);
  const page = parseInt(c.req.query('page') || '1');

  const [taxonomy, theme, sidebarData, analytics, rsConfig, whiteLabel] = await Promise.all([
    getTaxonomyBySlug(c.env.DB, siteId, slug, type, lang),
    getSiteTheme(c.env.DB, siteId, c.env.CACHE),
    getSidebarData(c.env.DB, siteId, lang, c.env.CACHE),
    getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
    getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
    hasWhiteLabel(c.env.DB, siteId),
  ]);
  await enrichThemeWithAdEmbed(theme);

  if (!taxonomy) return c.notFound();

  // Execute plugin hooks for page injection
  const [pluginHead, pluginBodyStart, pluginBodyEnd] = await Promise.all([
    pluginEngine.executeFilter('page.head', '', site),
    pluginEngine.executeFilter('page.bodyStart', '', site),
    pluginEngine.executeFilter('page.bodyEnd', '', site),
  ]);

  const { posts, total } = await getPostsByTaxonomy(
    c.env.DB, siteId, taxonomy.id, lang, page, theme.posts_per_page
  );

  const postsWithTax = await Promise.all(
    posts.map(async (post) => ({
      post,
      categories: await getPostTaxonomies(c.env.DB, post.id).then(
        (taxes) => taxes.filter((t) => t.type === 'category')
      ),
    }))
  );

  const totalPages = Math.ceil(total / theme.posts_per_page);
  // Header nav: prefer header-area widget menu, fallback to primary location
  const headerMenu = getHeaderNavFromSidebar(sidebarData)
    || await getMenuByLocation(c.env.DB, siteId, 'primary', lang);
  const navItems = buildNavTree(headerMenu?.items || []);
  const baseUrl = new URL(c.req.url);
  const canonicalUrl = `${baseUrl.origin}${lp}/${type}/${slug}`;
  const typeLabel = type === 'category'
    ? (lang === 'tr' ? 'Kategori' : 'Category')
    : (lang === 'tr' ? 'Etiket' : 'Tag');

  // Build JSON-LD for archive page
  let archiveJsonLd = '';
  if (rsConfig.enabled && rsConfig.archives) {
    const schemas: (Record<string, unknown> | null)[] = [
      buildCollectionPageSchema(
        { name: taxonomy.name, slug: taxonomy.slug, type, description: taxonomy.description, count: total },
        { name: site.name, description: site.description },
        canonicalUrl,
        { lang },
      ),
    ];
    if (rsConfig.breadcrumbs) {
      schemas.push(buildBreadcrumbSchema([
        { name: lang === 'tr' ? 'Ana Sayfa' : 'Home', url: `${baseUrl.origin}${lp || '/'}` },
        { name: typeLabel, url: canonicalUrl },
        { name: taxonomy.name, url: canonicalUrl },
      ]));
    }
    const itemListPosts = posts.map((p: any) => ({
      title: p.title,
      url: `${baseUrl.origin}${lp}/${p.slug}`,
    }));
    const itemList = buildItemListSchema(itemListPosts);
    if (itemList) schemas.push(itemList);
    archiveJsonLd = renderJsonLd(...schemas);
  }

  const ThemeLayout = getLayoutComponent(theme.template);
  return c.html(
    <ThemeLayout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
      pluginHead={pluginHead} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
      analyticsHead={analytics.head_code} analyticsBody={analytics.body_code}
      hidePoweredBy={whiteLabel}
      currentPath={new URL(c.req.url).pathname} sidebarData={sidebarData}
      head={
        <SEOHead
          title={`${typeLabel}: ${taxonomy.name}`}
          description={taxonomy.description || `${typeLabel}: ${taxonomy.name}`}
          canonicalUrl={canonicalUrl}
          siteName={site.name}
          lang={lang}
          jsonLd={archiveJsonLd}
        />
      }
    >
      <div class="archive-header">
        <h1>{typeLabel}: {taxonomy.name}</h1>
        {taxonomy.description && <p>{taxonomy.description}</p>}
        <p style="color:#94a3b8;font-size:0.85rem;margin-top:0.25rem">
          {total} {lang === 'tr' ? 'yazı' : (total === 1 ? 'post' : 'posts')}
        </p>
      </div>

      {posts.length === 0 ? (
        <div class="empty-state">
          <p>{lang === 'tr' ? 'Bu kategoride yazı yok' : 'No posts in this category'}</p>
        </div>
      ) : (
        <>
          {postsWithTax.map(({ post, categories: cats }, idx) => (
            <PostCard post={post} lang={lang} defaultLang={defaultLang} categories={cats} siteId={siteId} isLCP={idx === 0 && page === 1} />
          ))}
          <Pagination currentPage={page} totalPages={totalPages} baseUrl={`${lp}/${type}/${slug}`} lang={lang} />
        </>
      )}
    </ThemeLayout>
  );
}

// Default language (no prefix)
archive.get('/category/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return handleArchive(c, 'category', site.default_language || 'tr', c.req.param('slug'));
});

archive.get('/tag/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  return handleArchive(c, 'tag', site.default_language || 'tr', c.req.param('slug'));
});

// Non-default language (with prefix)
archive.get('/:lang{[a-z]{2}}/category/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/category/${c.req.param('slug')}`);
  return handleArchive(c, 'category', lang, c.req.param('slug'));
});

archive.get('/:lang{[a-z]{2}}/tag/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/tag/${c.req.param('slug')}`);
  return handleArchive(c, 'tag', lang, c.req.param('slug'));
});

export default archive;
