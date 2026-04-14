import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { getLayoutComponent } from '../../lib/theme-renderer';
import { SEOHead } from '../../components/SEOHead';
import { PostCard } from '../../components/PostCard';
import { Pagination } from '../../components/Pagination';
import { getSiteTheme, getPublicPosts, getPostTaxonomies, getMenuByLocation, getSiteCategories, getSidebarData, getHomepageSettings, getPageById, getPostMeta, getAnalyticsSettings, enrichThemeWithAdEmbed, getHeaderNavFromSidebar, getRichSnippetsSettings, hasWhiteLabel } from '../../lib/public-db';
import { buildWebSiteSchema, buildOrganizationSchema, buildItemListSchema, renderJsonLd } from '../../lib/schema';
import { langPrefix } from '../../lib/lang';
import { pluginEngine } from '../../lib/plugins/engine';
import { processAllShortcodes, ShortcodeContext } from '../../lib/shortcodes/index';
import { processLayout } from '../../lib/layout';
import { buildNavTree } from '../../lib/nav-utils';

/** Pick first non-empty value after stripping shortcodes/HTML */
function pickDescription(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    if (!c) continue;
    const clean = c.replace(/\[[^\]]*\]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (clean) return clean;
  }
  return '';
}
import { renderLayoutDebugHTML } from '../../components/LayoutDebug';

const home = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function renderHome(c: any, lang: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  const defaultLang = site.default_language || 'tr';
  const page = parseInt(c.req.query('page') || '1');
  const lp = langPrefix(lang, defaultLang);

  const [theme, categories, sidebarData, homepageSettings, analytics, rsConfig, whiteLabel] = await Promise.all([
    getSiteTheme(c.env.DB, siteId, c.env.CACHE),
    getSiteCategories(c.env.DB, siteId, lang),
    getSidebarData(c.env.DB, siteId, lang, c.env.CACHE),
    getHomepageSettings(c.env.DB, siteId),
    getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
    getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
    hasWhiteLabel(c.env.DB, siteId),
  ]);
  await enrichThemeWithAdEmbed(theme);

  // Execute plugin hooks for page rendering
  const [pluginHead, pluginBodyStart, pluginBodyEnd] = await Promise.all([
    pluginEngine.executeFilter('page.head', '', site),
    pluginEngine.executeFilter('page.bodyStart', '', site),
    pluginEngine.executeFilter('page.bodyEnd', '', site),
  ]);

  // Header nav: prefer header-area widget menu, fallback to primary location
  const headerMenu = getHeaderNavFromSidebar(sidebarData)
    || await getMenuByLocation(c.env.DB, siteId, 'primary', lang);
  const navItems = buildNavTree(headerMenu?.items || []);
  const baseUrl = new URL(c.req.url);
  const canonicalUrl = `${baseUrl.origin}${lp || '/'}`;

  // ?lay debug mode — show layout blueprint
  if (baseUrl.searchParams.has('lay')) {
    let parsedLayout = null;
    let pageTitle = site.name;
    let pageSlug = '';
    let pageType: 'homepage-static' | 'homepage-blog' = 'homepage-blog';
    let hasContent = false;

    if (homepageSettings.show_on_front === 'page' && homepageSettings.page_on_front > 0) {
      const staticPage = await getPageById(c.env.DB, siteId, homepageSettings.page_on_front, lang);
      if (staticPage) {
        pageTitle = staticPage.title || site.name;
        pageSlug = staticPage.slug || '';
        pageType = 'homepage-static';
        hasContent = !!(staticPage.content && staticPage.content.trim());
        const layoutJson = await getPostMeta(c.env.DB, staticPage.id, 'page_layout');
        if (layoutJson) {
          try { parsedLayout = JSON.parse(layoutJson); } catch {}
        }
      }
    }

    const debugHtml = renderLayoutDebugHTML({
      siteName: site.name,
      pageTitle,
      pageSlug,
      pageType,
      layout: parsedLayout,
      sidebarData,
      navItems,
      lang,
      hasContent,
    });
    return c.html(debugHtml);
  }

  // --- Static Page as Homepage ---
  if (homepageSettings.show_on_front === 'page' && homepageSettings.page_on_front > 0) {
    const staticPage = await getPageById(c.env.DB, siteId, homepageSettings.page_on_front, lang);

    if (staticPage && staticPage.content) {
      // Build shortcode context
      const scCtx: ShortcodeContext = {
        db: c.env.DB,
        siteId,
        lang,
        defaultLang,
        origin: baseUrl.origin,
        langPrefix: lp,
      };

      // Check for page layout
      const layoutJson = await getPostMeta(c.env.DB, staticPage.id, 'page_layout');

      let renderedContent: string;
      if (layoutJson) {
        try {
          const layout = JSON.parse(layoutJson);
          let postContent = await processAllShortcodes(staticPage.content || '', scCtx);
          postContent = await pluginEngine.executeFilter('post.beforeRender', postContent);
          renderedContent = await processLayout(layout, scCtx, postContent);
        } catch {
          renderedContent = await processAllShortcodes(staticPage.content, scCtx);
          renderedContent = await pluginEngine.executeFilter('post.beforeRender', renderedContent);
        }
      } else {
        renderedContent = await processAllShortcodes(staticPage.content, scCtx);
        renderedContent = await pluginEngine.executeFilter('post.beforeRender', renderedContent);
      }

      // Build JSON-LD for static homepage
      let staticJsonLd = '';
      if (rsConfig.enabled && rsConfig.homepage) {
        const logoUrl = rsConfig.publisherLogo || (theme.site_logo ? `${baseUrl.origin}/uploads/${theme.site_logo.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}` : undefined);
        const searchPath = lp ? `${lp}/search` : '/search';
        staticJsonLd = renderJsonLd(
          buildWebSiteSchema({ name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl, lang, searchPath }),
          buildOrganizationSchema({ name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl }),
        );
      }

      const ThemeLayout = getLayoutComponent(theme.template);
      // Always hide reading time on homepage
      const hideReadingTimeCSS = '<style>.seo-reading-time{display:none!important}</style>';
      return c.html(
        <ThemeLayout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
          pluginHead={pluginHead + hideReadingTimeCSS} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
          analyticsHead={analytics.head_code} analyticsBody={analytics.body_code}
          hidePoweredBy={whiteLabel}
          isHomepage={true} currentPath={new URL(c.req.url).pathname} sidebarData={sidebarData}
          head={
            <SEOHead
              title={staticPage.seo_title || staticPage.title || site.name}
              description={pickDescription(staticPage.seo_description, staticPage.excerpt, theme.site_tagline, site.description)}
              canonicalUrl={canonicalUrl}
              siteName={site.name}
              lang={lang}
              jsonLd={staticJsonLd}
            />
          }
        >
          <div class="static-homepage" dangerouslySetInnerHTML={{ __html: renderedContent }} />
        </ThemeLayout>
      );
    }
    // If static page not found, fall through to blog listing
  }

  // --- Default: Blog Post Listing ---
  const { posts, total } = await getPublicPosts(c.env.DB, siteId, lang, {
    page,
    perPage: theme.posts_per_page,
  }, c.env.CACHE);

  const postsWithTax = await Promise.all(
    posts.map(async (post) => ({
      post,
      categories: await getPostTaxonomies(c.env.DB, post.id).then(
        (taxes) => taxes.filter((t) => t.type === 'category')
      ),
    }))
  );

  const totalPages = Math.ceil(total / theme.posts_per_page);

  // Build JSON-LD for blog listing homepage
  let blogJsonLd = '';
  if (rsConfig.enabled && rsConfig.homepage) {
    const logoUrl = rsConfig.publisherLogo || (theme.site_logo ? `${baseUrl.origin}/uploads/${theme.site_logo.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}` : undefined);
    const searchPath = lp ? `${lp}/search` : '/search';
    const itemListPosts = posts.map((p: any) => ({
      title: p.title,
      url: `${baseUrl.origin}${lp}/${p.slug}`,
    }));
    blogJsonLd = renderJsonLd(
      buildWebSiteSchema({ name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl, lang, searchPath }),
      buildOrganizationSchema({ name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, { logoUrl }),
      buildItemListSchema(itemListPosts),
    );
  }

  const ThemeLayout = getLayoutComponent(theme.template);
  return c.html(
    <ThemeLayout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
      pluginHead={pluginHead} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
          analyticsHead={analytics.head_code} analyticsBody={analytics.body_code}
      hidePoweredBy={whiteLabel}
      isHomepage={true} currentPath={new URL(c.req.url).pathname} sidebarData={sidebarData}
      head={
        <SEOHead
          title={site.name}
          description={theme.site_tagline || `${site.name} - ${site.description || ''}`}
          canonicalUrl={canonicalUrl}
          siteName={site.name}
          lang={lang}
          jsonLd={blogJsonLd}
        />
      }
    >
      {posts.length === 0 ? (
        <div class="empty-state">
          <p>{lang === 'tr' ? 'Henüz yazı yok' : 'No posts yet'}</p>
        </div>
      ) : (
        <>
          {postsWithTax.map(({ post, categories: cats }, idx) => (
            <PostCard post={post} lang={lang} defaultLang={defaultLang} categories={cats} siteId={siteId} isLCP={idx === 0 && page === 1} />
          ))}
          <Pagination currentPage={page} totalPages={totalPages} baseUrl={lp || '/'} lang={lang} />
        </>
      )}
    </ThemeLayout>
  );
}

// Default language: / (no prefix)
home.get('/', async (c) => {
  const site = c.get('site');
  if (!site) {
    // No site resolved for this domain — show landing page
    const adminDomain = c.env.ADMIN_DOMAIN || 'workercms.com';
    return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WorkerCms</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f1f5f9}
.card{background:white;padding:3rem;border-radius:1rem;box-shadow:0 4px 6px -1px rgb(0 0 0/0.1);text-align:center;max-width:500px}
h1{color:#1e293b;margin-bottom:0.5rem}p{color:#64748b}a{color:#2563eb;text-decoration:none;font-weight:500}
</style></head>
<body><div class="card"><h1>WorkerCms</h1><p>Modern Multi-Site CMS</p><p><a href="https://${adminDomain}/">Yönetim Paneli →</a></p></div></body></html>`);
  }
  return renderHome(c, site.default_language || 'tr');
});

// Non-default language: /:lang
home.get('/:lang{[a-z]{2}}', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const defaultLang = site.default_language || 'tr';
  // If someone visits /tr (default lang with prefix), redirect to /
  if (lang === defaultLang) return c.redirect('/');
  return renderHome(c, lang);
});

export default home;
