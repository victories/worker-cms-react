import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { Bindings, Variables } from '../../types';
import { getLayoutComponent } from '../../lib/theme-renderer';
import { SEOHead } from '../../components/SEOHead';
import { getPostBySlug, getPostTaxonomies, getSiteTheme, getMenuByLocation, getRecentComments, getSidebarData, getAmpSettings, getPostMeta, getAnalyticsSettings, enrichThemeWithAdEmbed, getHeaderNavFromSidebar, getRichSnippetsSettings, hasWhiteLabel } from '../../lib/public-db';
import { buildArticleSchema, buildBreadcrumbSchema, renderJsonLd } from '../../lib/schema';
import { getEffectiveSetting } from '../../lib/settings';
import { langPrefix } from '../../lib/lang';
import { pluginEngine } from '../../lib/plugins/engine';
import { processAllShortcodes, ShortcodeContext } from '../../lib/shortcodes/index';
import { processLayout } from '../../lib/layout';
import { buildNavTree } from '../../lib/nav-utils';
import { renderAmpForPost } from './amp/dynamic';
import { renderLayoutDebugHTML } from '../../components/LayoutDebug';
import { getRecaptchaSettings } from '../../lib/recaptcha';

/** Pick first non-empty value after stripping shortcodes/HTML */
function pickDescription(...candidates: (string | undefined | null)[]): string {
  for (const c of candidates) {
    if (!c) continue;
    const clean = c.replace(/\[[^\]]*\]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (clean) return clean;
  }
  return '';
}

const post = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCommentDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

async function renderPost(c: any, lang: string, slug: string) {
  const site = c.get('site');
  const siteId = c.get('siteId');
  if (!site || !siteId) return c.notFound();

  // Check for ?amp=1 query param — serve AMP version if site uses that format
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

  // Check site-wide settings (comments, reading time)
  const siteSettings = await c.env.DB.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key IN ('comments_enabled', 'show_reading_time')"
  ).bind(siteId).all<{ key: string; value: string }>();
  const settingsMap: Record<string, string> = {};
  for (const row of siteSettings.results) {
    settingsMap[row.key] = row.value;
  }
  const siteCommentsEnabled = settingsMap.comments_enabled !== 'false'; // default: enabled
  const showComments = siteCommentsEnabled && p.comment_status === 'open';
  const showReadingTime = settingsMap.show_reading_time === 'true'; // default: disabled

  const [theme, taxonomies, comments, sidebarData, ampConfig, recaptchaConfig, analytics, rsConfig, whiteLabel] = await Promise.all([
    getSiteTheme(c.env.DB, siteId, c.env.CACHE),
    getPostTaxonomies(c.env.DB, p.id),
    showComments ? getRecentComments(c.env.DB, p.id) : Promise.resolve([]),
    getSidebarData(c.env.DB, siteId, lang, c.env.CACHE),
    getAmpSettings(c.env.DB, siteId),
    getRecaptchaSettings(c.env.DB, siteId),
    getAnalyticsSettings(c.env.DB, siteId, c.env.CACHE),
    getRichSnippetsSettings(c.env.DB, siteId, c.env.CACHE),
    hasWhiteLabel(c.env.DB, siteId),
  ]);
  await enrichThemeWithAdEmbed(theme);

  const categories = taxonomies.filter((t) => t.type === 'category');
  const tags = taxonomies.filter((t) => t.type === 'tag');
  // Header nav: prefer header-area widget menu, fallback to primary location
  const headerMenu = getHeaderNavFromSidebar(sidebarData)
    || await getMenuByLocation(c.env.DB, siteId, 'primary', lang);
  const navItems = buildNavTree(headerMenu?.items || []);

  // Execute plugin hooks for page injection
  const pluginHead = await pluginEngine.executeFilter('page.head', '', site);
  const pluginBodyStart = await pluginEngine.executeFilter('page.bodyStart', '', site);
  const pluginBodyEnd = await pluginEngine.executeFilter('page.bodyEnd', '', site);

  // Check for page layout
  const layoutJson = await getPostMeta(c.env.DB, p.id, 'page_layout');
  const baseUrl = new URL(c.req.url);

  // ?lay debug mode — show layout blueprint instead of rendered page
  if (baseUrl.searchParams.has('lay')) {
    let parsedLayout = null;
    if (layoutJson) {
      try { parsedLayout = JSON.parse(layoutJson); } catch {}
    }
    const debugHtml = renderLayoutDebugHTML({
      siteName: site.name,
      pageTitle: p.title,
      pageSlug: slug,
      pageType: p.post_type === 'page' ? 'page' : 'post',
      layout: parsedLayout,
      sidebarData,
      navItems,
      lang,
      hasContent: !!(p.content && p.content.trim()),
    });
    return c.html(debugHtml);
  }

  const scCtx: ShortcodeContext = {
    db: c.env.DB, siteId, lang, defaultLang,
    origin: baseUrl.origin, langPrefix: lp,
  };

  let renderedContent: string;
  if (layoutJson) {
    try {
      const layout = JSON.parse(layoutJson);
      const postContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
      renderedContent = await processLayout(layout, scCtx, postContent);
    } catch {
      renderedContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
      renderedContent = await processAllShortcodes(renderedContent, scCtx);
    }
  } else {
    renderedContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
    renderedContent = await processAllShortcodes(renderedContent, scCtx);
  }
  const canonicalUrl = `${baseUrl.origin}${lp}/${slug}`;
  const ogImage = p.og_image_r2_key
    ? `${baseUrl.origin}/uploads/${p.og_image_r2_key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`
    : p.featured_image_url
      ? `${baseUrl.origin}/uploads/${p.featured_image_url.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`
      : undefined;

  const title = p.seo_title || p.title;
  const description = pickDescription(p.seo_description, p.excerpt, '');

  // Build AMP URL if the post has AMP enabled and site AMP is on
  let ampUrl: string | undefined;
  if ((p as any).amp_enabled === 1 && ampConfig.amp_enabled) {
    if (ampConfig.amp_custom_domain) {
      // Custom domain: always serves as https://custom-domain/slug
      const customOrigin = ampConfig.amp_custom_domain.startsWith('http')
        ? ampConfig.amp_custom_domain
        : `https://${ampConfig.amp_custom_domain}`;
      ampUrl = `${customOrigin}${lp}/${slug}`;
    } else {
      // Use URL format setting
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

  // Build JSON-LD structured data
  let jsonLd = '';
  const isArticle = p.post_type === 'post';
  if (rsConfig.enabled && ((isArticle && rsConfig.posts) || (!isArticle && rsConfig.pages))) {
    const logoUrl = rsConfig.publisherLogo || (theme.site_logo ? `${baseUrl.origin}/uploads/${theme.site_logo.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}` : undefined);
    const tzSetting = await getEffectiveSetting(c.env.DB, siteId, 'timezone', 'Europe/Istanbul');
    const articleSchema = buildArticleSchema(p, { name: rsConfig.publisherName || site.name, description: site.description }, canonicalUrl, {
      ogImage, logoUrl, lang, categories, tags,
      timezone: tzSetting.value,
      siteUrl: baseUrl.origin,
    });
    const schemas: (Record<string, unknown> | null)[] = [articleSchema];
    if (rsConfig.breadcrumbs) {
      const breadcrumbItems = [
        { name: site.name, url: `${baseUrl.origin}${lp || '/'}` },
        ...(categories.length > 0 ? [{ name: categories[0].name, url: `${baseUrl.origin}${lp}/category/${categories[0].slug}` }] : []),
        { name: p.title, url: canonicalUrl },
      ];
      schemas.push(buildBreadcrumbSchema(breadcrumbItems));
    }
    jsonLd = renderJsonLd(...schemas);
  }

  // Hide reading time if setting is disabled
  const hideReadingTimeCSS = showReadingTime ? '' : '<style>.seo-reading-time{display:none!important}</style>';

  const ThemeLayout = getLayoutComponent(theme.template);
  return c.html(
    <ThemeLayout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
      pluginHead={pluginHead + hideReadingTimeCSS} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
      analyticsHead={analytics.head_code} analyticsBody={analytics.body_code}
      hidePoweredBy={whiteLabel}
      currentPath={new URL(c.req.url).pathname} sidebarData={sidebarData}
      head={
        <SEOHead
          title={title}
          description={description}
          keywords={p.seo_keywords || undefined}
          canonicalUrl={canonicalUrl}
          ampUrl={ampUrl}
          ogImage={ogImage}
          ogType="article"
          siteName={site.name}
          lang={lang}
          publishedAt={p.published_at || undefined}
          authorName={p.author_name}
          jsonLd={jsonLd}
        />
      }
    >
      <article class="post-single">
        <h1>{p.title}</h1>
        <div class="post-meta">
          <span>{p.author_name}</span>
          <span>&middot;</span>
          <span>{p.published_at ? formatDate(p.published_at, lang) : ''}</span>
          {categories.map((cat) => (
            <a href={`${lp}/category/${cat.slug}`} class="tag">{cat.name}</a>
          ))}
        </div>

        {p.featured_image_url && raw(`<img class="featured-img" src="/uploads/${p.featured_image_url.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}" alt="${p.title.replace(/"/g, '&quot;')}" fetchpriority="high">`)}

        <div class="post-content">
          {raw(renderedContent)}
        </div>

        {tags.length > 0 && (
          <div class="post-tags">
            <span class="label">{lang === 'tr' ? 'Etiketler:' : 'Tags:'}</span>
            {tags.map((tag) => (
              <a href={`${lp}/tag/${tag.slug}`}>{tag.name}</a>
            ))}
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div class="comments-section">
            <h3>
              {lang === 'tr' ? `Yorumlar (${comments.length})` : `Comments (${comments.length})`}
            </h3>
            {comments.length === 0 ? (
              <p style="color:var(--gray-400);font-size:0.9rem">
                {lang === 'tr' ? 'Henüz yorum yok.' : 'No comments yet.'}
              </p>
            ) : (
              comments.map((comment: any) => (
                <div class="comment">
                  <div class="comment-header">
                    <span class="comment-avatar">{(comment.author_name || 'A').charAt(0).toUpperCase()}</span>
                    <div>
                      <div class="comment-author">{comment.author_name}</div>
                      <div class="comment-date">{formatCommentDate(comment.created_at, lang)}</div>
                    </div>
                  </div>
                  <div class="comment-content">{raw(comment.content)}</div>
                </div>
              ))
            )}

            {/* Comment Form */}
            <div class="comment-form-wrapper" style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--gray-200, #e5e7eb);">
              <h4 style="margin:0 0 1rem 0;font-size:1.1rem;">
                {lang === 'tr' ? 'Yorum Yaz' : 'Leave a Comment'}
              </h4>
              <div class="comment-form-success" style="display:none;padding:12px;background:#c6f6d5;color:#22543d;border-radius:6px;margin-bottom:1rem;font-size:0.9rem;"></div>
              <div class="comment-form-error" style="display:none;padding:12px;background:#fed7d7;color:#9b2c2c;border-radius:6px;margin-bottom:1rem;font-size:0.9rem;"></div>
              <form id="comment-form" data-post-id={String(p.id)}>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;font-weight:600;color:var(--gray-700, #374151);">
                      {lang === 'tr' ? 'Adınız' : 'Name'} <span style="color:#e53e3e;">*</span>
                    </label>
                    <input type="text" name="author_name" required
                      style="width:100%;padding:8px 12px;border:1px solid var(--gray-300, #d1d5db);border-radius:6px;font-size:0.9rem;box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="display:block;margin-bottom:4px;font-size:0.85rem;font-weight:600;color:var(--gray-700, #374151);">
                      {lang === 'tr' ? 'E-posta' : 'Email'}
                    </label>
                    <input type="email" name="author_email"
                      style="width:100%;padding:8px 12px;border:1px solid var(--gray-300, #d1d5db);border-radius:6px;font-size:0.9rem;box-sizing:border-box;" />
                  </div>
                </div>
                <div style="margin-bottom:12px;">
                  <label style="display:block;margin-bottom:4px;font-size:0.85rem;font-weight:600;color:var(--gray-700, #374151);">
                    {lang === 'tr' ? 'Yorumunuz' : 'Comment'} <span style="color:#e53e3e;">*</span>
                  </label>
                  <textarea name="content" rows={4} required
                    style="width:100%;padding:8px 12px;border:1px solid var(--gray-300, #d1d5db);border-radius:6px;font-size:0.9rem;box-sizing:border-box;resize:vertical;"
                    placeholder={lang === 'tr' ? 'Yorumunuzu buraya yazın...' : 'Write your comment here...'}></textarea>
                </div>
                <button type="submit" id="comment-submit-btn" style="
                  padding:10px 24px;background:var(--primary, #4a90d9);color:#fff;border:none;
                  border-radius:6px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:opacity 0.2s;">
                  {lang === 'tr' ? 'Yorum Gönder' : 'Submit Comment'}
                </button>
              </form>
            </div>

            {/* Comment form script */}
            {raw(`<script>
${recaptchaConfig.enabled && recaptchaConfig.onComments && recaptchaConfig.siteKey
  ? `var __rcSiteKey='${recaptchaConfig.siteKey}';`
  : `var __rcSiteKey='';`}
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
    if(!name||!content){errorEl.textContent='${lang === 'tr' ? 'Ad ve yorum alanları zorunludur.' : 'Name and comment are required.'}';errorEl.style.display='block';return;}
    btn.disabled=true;btn.textContent='${lang === 'tr' ? 'Gönderiliyor...' : 'Submitting...'}';
    function doSubmit(token){
      var data={post_id:parseInt(form.dataset.postId),author_name:name,author_email:form.querySelector('[name=author_email]').value.trim(),content:content};
      if(token)data.recaptcha_token=token;
      fetch('/api/comments/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){return r.json()})
      .then(function(res){
        if(res.success){successEl.textContent=res.data.message||'${lang === 'tr' ? 'Yorumunuz gönderildi!' : 'Comment submitted!'}';successEl.style.display='block';form.reset();}
        else{errorEl.textContent=res.error||'${lang === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.'}';errorEl.style.display='block';}
      })
      .catch(function(){errorEl.textContent='${lang === 'tr' ? 'Bağlantı hatası.' : 'Connection error.'}';errorEl.style.display='block';})
      .finally(function(){btn.disabled=false;btn.textContent='${lang === 'tr' ? 'Yorum Gönder' : 'Submit Comment'}';});
    }
    if(__rcSiteKey&&typeof grecaptcha!=='undefined'){
      grecaptcha.ready(function(){grecaptcha.execute(__rcSiteKey,{action:'comment'}).then(doSubmit);});
    }else{doSubmit(null);}
  });
})();
</script>`)}
            {recaptchaConfig.enabled && recaptchaConfig.onComments && recaptchaConfig.siteKey && (
              raw(`<script src="https://www.google.com/recaptcha/api.js?render=${recaptchaConfig.siteKey}"></script>`)
            )}
          </div>
        )}
      </article>
    </ThemeLayout>
  );
}

// Default language: /:slug (no lang prefix)
post.get('/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const slug = c.req.param('slug');
  return renderPost(c, site.default_language || 'tr', slug);
});

// Non-default language: /:lang/:slug
post.get('/:lang{[a-z]{2}}/:slug', async (c) => {
  const site = c.get('site');
  if (!site) return c.notFound();
  const lang = c.req.param('lang');
  const slug = c.req.param('slug');
  const defaultLang = site.default_language || 'tr';
  if (lang === defaultLang) return c.redirect(`/${slug}`);
  return renderPost(c, lang, slug);
});

export default post;
