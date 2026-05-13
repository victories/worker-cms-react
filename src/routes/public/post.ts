import { Hono } from 'hono';
import { createElement, Fragment, type ReactNode } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { PublisherLayout } from '../../ssr/layouts/PublisherLayout';
import { Post, type PostCommentViewModel } from '../../ssr/pages/Post';
import { Page } from '../../ssr/pages/Page';
import { LandingPage } from '../../ssr/pages/Landing';
import { loadLandingConfig } from './landing';
import { LANDING_CLIENT_JS } from '../../ssr/__generated__/landing-client';
import { TAILWIND_LANDING_CSS } from '../../ssr/__generated__/tailwind-landing';
import { SEOHead } from '../../ssr/components/SEOHead';
import { ThemeStyles } from '../../ssr/components/ThemeStyles';
import {
  getPostBySlug,
  getPostTaxonomies,
  getSiteTheme,
  getMenuByLocation,
  getRecentComments,
  getSidebarData,
  getAmpSettings,
  getPostMeta,
  getAnalyticsSettings,
  enrichThemeWithAdEmbed,
  getHeaderNavFromSidebar,
  getRichSnippetsSettings,
  hasWhiteLabel,
} from '../../lib/public-db';
import { extractDesignSidebarNeeds } from '../../lib/themes/layout-helpers';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  renderJsonLd,
} from '../../lib/schema';
import { getEffectiveSetting } from '../../lib/settings';
import { langPrefix } from '../../lib/lang';
import { processAllShortcodes, renderShortcodeBatch, ShortcodeContext } from '../../lib/shortcodes/index';
import { processLayout } from '../../lib/layout';
import { renderAmpForPost } from './amp/dynamic';
import { getRecaptchaSettings } from '../../lib/recaptcha';
import {
  collectDocumentSlots,
  collectSiteLayoutSlots,
  collectPostLayoutSlots,
} from '../../lib/plugins/collectors';
import { PUBLISHER_CLIENT_JS } from '../../ssr/__generated__/publisher-client';

/**
 * Public single-post / single-page handler — React SSR port (Faz 4).
 *
 * A single route (`/:slug`) serves both post and page rows — they
 * live in the same `posts` table, differentiated by `post_type`. The
 * handler branches at render time:
 *
 *   - `post_type === 'page'`  → `<Page>` (title + content, no meta)
 *   - `post_type === 'post'`  → `<Post>` (title + meta + featured
 *     image + content + tags + comments)
 *
 * Comments still POST to `/api/comments/submit` via a vanilla JS
 * boot script rendered at parse time — it's the same handler logic
 * as the old Hono JSX version, just built as a string and dropped
 * into the Post component via `dangerouslySetInnerHTML`. Faz 7 will
 * swap it for a proper React island.
 */

const postRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

/**
 * Build the comment-form boot script exactly the way the old handler
 * did — interpolated localised strings and the optional reCAPTCHA
 * site key — and return it as a raw HTML string to be injected via
 * dangerouslySetInnerHTML. This mirrors `renderPost()` in the
 * pre-Faz-4 post.tsx.
 */
function buildCommentFormBootHtml(opts: {
  lang: string;
  recaptchaSiteKey: string | '';
  cspNonce?: string;
}): string {
  const { lang, recaptchaSiteKey, cspNonce } = opts;
  const siteKeyJs = recaptchaSiteKey
    ? `var __rcSiteKey='${recaptchaSiteKey}';`
    : `var __rcSiteKey='';`;
  // Nonce attribute must come before any other content; HTML attribute
  // names are validated by the CSP parser before checking script content.
  const nonceAttr = cspNonce ? ` nonce="${cspNonce}"` : '';
  return `<script${nonceAttr}>
${siteKeyJs}
(function(){
  var form=document.getElementById('comment-form');
  if(!form)return;
  var successEl=form.parentElement.querySelector('.comment-form-success');
  var errorEl=form.parentElement.querySelector('.comment-form-error');
  var btn=document.getElementById('comment-submit-btn');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    successEl.style.display='none';errorEl.style.display='none';
    var name=form.querySelector('[name=author_name]').value.trim();
    var content=form.querySelector('[name=content]').value.trim();
    if(!name||!content){errorEl.textContent='${
      lang === 'tr'
        ? 'Ad ve yorum alanları zorunludur.'
        : 'Name and comment are required.'
    }';errorEl.style.display='block';return;}
    btn.disabled=true;btn.textContent='${
      lang === 'tr' ? 'Gönderiliyor...' : 'Submitting...'
    }';
    function doSubmit(token){
      var data={post_id:parseInt(form.dataset.postId),author_name:name,author_email:form.querySelector('[name=author_email]').value.trim(),content:content};
      if(token)data.recaptcha_token=token;
      fetch('/api/comments/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){return r.json()})
      .then(function(res){
        if(res.success){successEl.textContent=res.data.message||'${
          lang === 'tr' ? 'Yorumunuz gönderildi!' : 'Comment submitted!'
        }';successEl.style.display='block';form.reset();}
        else{errorEl.textContent=res.error||'${
          lang === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'
        }';errorEl.style.display='block';}
      })
      .catch(function(){errorEl.textContent='${
        lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.'
      }';errorEl.style.display='block';})
      .finally(function(){btn.disabled=false;btn.textContent='${
        lang === 'tr' ? 'Yorum Gönder' : 'Submit Comment'
      }';});
    }
    if(__rcSiteKey&&typeof grecaptcha!=='undefined'){
      grecaptcha.ready(function(){grecaptcha.execute(__rcSiteKey,{action:'comment'}).then(doSubmit);});
    }else{doSubmit(null);}
  });
})();
</script>`;
}

async function renderPostPage(
  c: any,
  lang: string,
  slug: string
): Promise<Response> {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();
  const cspNonce: string | undefined = c.get('cspNonce');

  // ?amp=1 passthrough to the AMP renderer when the site uses the
  // query-string AMP URL format.
  const url = new URL(c.req.url);
  if (url.searchParams.get('amp') === '1') {
    const ampConfig = await getAmpSettings(c.env.DB, siteId);
    if (ampConfig.amp_enabled && ampConfig.amp_url_format === '/slug?amp=1') {
      return renderAmpForPost(c, lang, slug);
    }
  }

  const defaultLang = site.default_language || 'tr';
  const lp = langPrefix(lang, defaultLang);

  const p = await getPostBySlug(c.env.DB, siteId, slug, lang, c.env.CACHE);
  if (!p) return c.notFound();

  // Site-wide settings that gate comments + reading time display.
  // The `.all<T>()` generic trips TS2347 ("Untyped function calls may
  // not accept type arguments") against the current `@cloudflare/
  // workers-types` version used in this repo, so we cast the row shape
  // locally instead.
  const siteSettings = (await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key IN ('comments_enabled', 'show_reading_time')"
  )
    .bind(siteId)
    .all()) as { results: Array<{ key: string; value: string }> };
  const settingsMap: Record<string, string> = {};
  for (const row of siteSettings.results) {
    settingsMap[row.key] = row.value;
  }
  const siteCommentsEnabled = settingsMap.comments_enabled !== 'false';
  const showComments = siteCommentsEnabled && p.comment_status === 'open';
  const showReadingTime = settingsMap.show_reading_time === 'true';

  const postDesignNeeds = extractDesignSidebarNeeds(c.get('activeDesign'));
  const postSidebarNeeds = {
    extraMenuSlugs: postDesignNeeds.menuSlugs,
    needCategories: postDesignNeeds.needCategories,
    needRecentPosts: postDesignNeeds.needRecentPosts,
    needTags: postDesignNeeds.needTags,
  };

  const [
    theme,
    taxonomies,
    comments,
    sidebarData,
    ampConfig,
    recaptchaConfig,
    analytics,
    rsConfig,
    whiteLabel,
  ] = await Promise.all([
    getSiteTheme(c.env.DB, siteId, c.env.CACHE),
    getPostTaxonomies(c.env.DB, p.id),
    showComments ? getRecentComments(c.env.DB, p.id) : Promise.resolve([]),
    getSidebarData(c.env.DB, siteId, lang, c.env.CACHE, postSidebarNeeds),
    getAmpSettings(c.env.DB, siteId),
    getRecaptchaSettings(c.env.DB, siteId),
    getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
    getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
    hasWhiteLabel(c.env.DB, siteId),
  ]);
  await enrichThemeWithAdEmbed(theme);

  const categories = taxonomies.filter((t) => t.type === 'category');
  const tags = taxonomies.filter((t) => t.type === 'tag');

  const headerMenu =
    getHeaderNavFromSidebar(sidebarData) ||
    (await getMenuByLocation(c.env.DB, siteId, 'primary', lang));
  const navItems = (headerMenu?.items ?? []) as any[];

  // Plugin render slots — site-level + per-post, pre-fetched in parallel.
  const [pluginSlots, siteSlots, postSlots] = await Promise.all([
    collectDocumentSlots(site),
    collectSiteLayoutSlots(site),
    collectPostLayoutSlots(p),
  ]);

  // ---- Content rendering ----
  const layoutJson = await getPostMeta(c.env.DB, p.id, 'page_layout');
  const baseUrl = new URL(c.req.url);
  const currentPath = baseUrl.pathname;

  const scCtx: ShortcodeContext = {
    db: c.env.DB,
    siteId,
    lang,
    defaultLang,
    origin: baseUrl.origin,
    langPrefix: lp,
  };

  const layoutShortcodeOutputs =
    postDesignNeeds.shortcodes.length > 0
      ? await renderShortcodeBatch(postDesignNeeds.shortcodes, scCtx)
      : undefined;

  let renderedContent: string;
  if (layoutJson) {
    try {
      const layout = JSON.parse(layoutJson);
      const postContent = await processAllShortcodes(p.content || '', scCtx);
      renderedContent = await processLayout(layout, scCtx, postContent);
    } catch {
      renderedContent = await processAllShortcodes(p.content || '', scCtx);
    }
  } else {
    renderedContent = await processAllShortcodes(p.content || '', scCtx);
  }

  // ---- Canonical + OG image ----
  const canonicalUrl = `${baseUrl.origin}${lp}/${slug}`;
  const ogImage = p.og_image_r2_key
    ? `${baseUrl.origin}/uploads/${p.og_image_r2_key.replace(
        `sites/${siteId}/uploads/`,
        `s/${siteId}/`
      )}`
    : p.featured_image_url
      ? `${baseUrl.origin}/uploads/${p.featured_image_url.replace(
          `sites/${siteId}/uploads/`,
          `s/${siteId}/`
        )}`
      : undefined;

  const title = p.seo_title || p.title;
  const description = pickDescription(p.seo_description, p.excerpt, '');

  // ---- AMP URL alternate ----
  let ampUrl: string | undefined;
  if ((p as any).amp_enabled === 1 && ampConfig.amp_enabled) {
    if (ampConfig.amp_custom_domain) {
      const customOrigin = ampConfig.amp_custom_domain.startsWith('http')
        ? ampConfig.amp_custom_domain
        : `https://${ampConfig.amp_custom_domain}`;
      ampUrl = `${customOrigin}${lp}/${slug}`;
    } else {
      switch (ampConfig.amp_url_format) {
        case '/slug/amp':
          ampUrl = `${baseUrl.origin}${lp}/${slug}/amp`;
          break;
        case '/slug?amp=1':
          ampUrl = `${baseUrl.origin}${lp}/${slug}?amp=1`;
          break;
        case '/amp/slug':
        default:
          ampUrl = `${baseUrl.origin}/amp${lp}/${slug}`;
          break;
      }
    }
  }

  // ---- JSON-LD ----
  let jsonLd = '';
  const isArticle = p.post_type === 'post';
  if (
    rsConfig.enabled &&
    ((isArticle && rsConfig.posts) || (!isArticle && rsConfig.pages))
  ) {
    const logoUrl =
      rsConfig.publisherLogo ||
      (theme.site_logo
        ? `${baseUrl.origin}/uploads/${theme.site_logo.replace(
            `sites/${siteId}/uploads/`,
            `s/${siteId}/`
          )}`
        : undefined);
    const tzSetting = await getEffectiveSetting(
      c.env.DB,
      siteId,
      'timezone',
      'Europe/Istanbul'
    );
    const articleSchema = buildArticleSchema(
      p,
      {
        name: rsConfig.publisherName || site.name,
        description: site.description,
      },
      canonicalUrl,
      {
        ogImage,
        logoUrl,
        lang,
        categories,
        tags,
        timezone: tzSetting.value,
        siteUrl: baseUrl.origin,
      }
    );
    const schemas: (Record<string, unknown> | null)[] = [articleSchema];
    if (rsConfig.breadcrumbs) {
      const breadcrumbItems = [
        { name: site.name, url: `${baseUrl.origin}${lp || '/'}` },
        ...(categories.length > 0
          ? [
              {
                name: categories[0].name,
                url: `${baseUrl.origin}${lp}/category/${categories[0].slug}`,
              },
            ]
          : []),
        { name: p.title, url: canonicalUrl },
      ];
      schemas.push(buildBreadcrumbSchema(breadcrumbItems));
    }
    jsonLd = renderJsonLd(...schemas);
  }

  // ---- Analytics + reading-time CSS override ----
  const hideReadingTimeCss = showReadingTime
    ? ''
    : '<style>.seo-reading-time{display:none!important}</style>';
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
  const hideReadingTimeNode = hideReadingTimeCss
    ? createElement('style', {
        dangerouslySetInnerHTML: {
          __html: '.seo-reading-time{display:none!important}',
        },
      })
    : null;

  // Per-site theme palette override (Theme Studio design wins).
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

  // ---- Featured image src (rewritten) ----
  const featuredImageSrc = p.featured_image_url
    ? `/uploads/${p.featured_image_url.replace(
        `sites/${siteId}/uploads/`,
        `s/${siteId}/`
      )}`
    : undefined;

  // ---- Comment form boot + reCAPTCHA script ----
  let commentFormBootHtml: string | undefined;
  let recaptchaScriptHtml: string | undefined;
  if (showComments) {
    const recaptchaSiteKey =
      recaptchaConfig.enabled &&
      recaptchaConfig.onComments &&
      recaptchaConfig.siteKey
        ? recaptchaConfig.siteKey
        : '';
    commentFormBootHtml = buildCommentFormBootHtml({
      lang,
      recaptchaSiteKey,
      cspNonce,
    });
    if (recaptchaSiteKey) {
      // External reCAPTCHA loader — strict-dynamic propagates trust to
      // its sub-resources once this nonced tag executes.
      const nonceAttr = cspNonce ? ` nonce="${cspNonce}"` : '';
      recaptchaScriptHtml = `<script${nonceAttr} src="https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}"></script>`;
    }
  }

  // ---- SEO head ----
  const seoHead = createElement(SEOHead, {
    title,
    description,
    keywords: p.seo_keywords || undefined,
    canonicalUrl,
    ampUrl,
    ogImage,
    ogType: 'article',
    siteName: site.name,
    lang,
    publishedAt: p.published_at || undefined,
    authorName: p.author_name,
    jsonLd: jsonLd || undefined,
  });

  // ---- Page body: branch on post_type ----
  const comments_vm: PostCommentViewModel[] = comments.map((c: any) => ({
    id: c.id,
    author_name: c.author_name,
    content: c.content,
    created_at: c.created_at,
  }));

  const isPage = p.post_type === 'page';

  // Management site (workercms.com itself): render static pages with
  // the landing v2 chrome — same nav / footer / ink+amber palette as
  // /landing. Keeps /iletisim, /gizlilik, /sartlar visually coherent
  // with the marketing site instead of inheriting the publisher
  // shadcn theme used by tenants like example.com.
  if (isPage && site.is_management === 1) {
    const landingCfg = await loadLandingConfig(c);
    if (landingCfg) {
      const brandName = landingCfg.brand?.name || site.name || 'Worker CMS';
      return renderPage(
        createElement(Shell, {
          lang,
          title: `${p.title} — ${brandName}`,
          description: p.excerpt || p.seo_description || undefined,
          themeClass: 'dark',
          // themeBootScript intentionally omitted — landing v2 is dark-only
          cspNonce,
          tailwindCss: TAILWIND_LANDING_CSS,
          head: createElement(
            Fragment,
            null,
            seoHead,
            createElement('link', {
              key: 'gf-1',
              rel: 'preconnect',
              href: 'https://fonts.googleapis.com',
            }),
            createElement('link', {
              key: 'gf-2',
              rel: 'preconnect',
              href: 'https://fonts.gstatic.com',
              crossOrigin: 'anonymous',
            }),
            createElement('link', {
              key: 'gf-3',
              rel: 'stylesheet',
              href:
                'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700' +
                '&family=Instrument+Serif' +
                '&family=JetBrains+Mono:wght@400&display=swap',
            }),
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
              nonce: cspNonce,
              dangerouslySetInnerHTML: { __html: LANDING_CLIENT_JS },
            })
          ),
          children: createElement(LandingPage, {
            title: p.title,
            contentHtml: renderedContent,
            excerpt: p.excerpt,
            config: landingCfg,
          }),
        })
      );
    }
  }

  const pageBody: ReactNode = isPage
    ? createElement(Page, {
        title: p.title,
        contentHtml: renderedContent,
        excerpt: p.excerpt,
      })
    : createElement(Post, {
        post: p,
        contentHtml: renderedContent,
        lang,
        lp,
        siteId,
        categories,
        tags,
        featuredImageSrc,
        showComments,
        comments: comments_vm,
        commentFormBootHtml,
        recaptchaScriptHtml,
        postHeaderSlot: createElement(Fragment, null, ...postSlots.postHeader),
        postFooterSlot: createElement(Fragment, null, ...postSlots.postFooter),
      });

  return renderPage(
    createElement(Shell, {
      lang,
      themeClass: theme.color_mode === 'dark' ? 'dark' : undefined,
      themeBootScript: DEFAULT_THEME_BOOT,
      cspNonce,
      head: createElement(
        Fragment,
        null,
        themeStylesNode,
        seoHead,
        hideReadingTimeNode,
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
          nonce: cspNonce,
          dangerouslySetInnerHTML: { __html: PUBLISHER_CLIENT_JS },
        })
      ),
      children: createElement(PublisherLayout, {
        design: c.get('activeDesign'),
        shortcodeOutputs: layoutShortcodeOutputs,
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
        children: pageBody,
      }),
    })
  );
}

// Default language: /:slug (no lang prefix)
postRoute.get('/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const slug = c.req.param('slug');
  return renderPostPage(c, site.default_language || 'tr', slug);
});

// Non-default language: /:lang/:slug
postRoute.get('/:lang{[a-z]{2}}/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const slug = c.req.param('slug');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/${slug}`);
  return renderPostPage(c, lang, slug);
});

export default postRoute;
