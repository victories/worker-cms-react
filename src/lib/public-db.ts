// Public DB query helpers — no auth required, used by SSR routes
// All queries are site_id scoped

import { cached } from './cache';
import { loadActiveTheme as loadActiveThemeV2 } from './themes/engine';
import type { ActiveTheme, CssVars } from './themes/types';

export interface PublicPost {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  status: string;
  post_type: string;
  language: string;
  featured_image_id: number | null;
  comment_status: string;
  is_sticky: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_r2_key: string | null;
  amp_enabled: number;
  published_at: string | null;
  created_at: string;
  author_name: string;
  author_email: string | null;
  featured_image_url: string | null;
}

export interface PublicTaxonomy {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  count: number;
}

/**
 * Resolved theme + site settings combined into a single object for
 * public render pipelines. v2 shape — replaces the old hex-colour
 * `SiteTheme` which assumed one of three hand-written Hono layouts.
 *
 * Colour tokens live in `cssLight` / `cssDark` as bare HSL triples
 * keyed with leading `--` (shadcn format). Route handlers hand these
 * to `<ThemeStyles light={theme.cssLight} dark={theme.cssDark} />`
 * in the Shell head to override the Tailwind defaults at request time.
 *
 * The non-colour fields (site_logo, posts_per_page, AMP ad fields,
 * ...) are site-specific settings pulled from the `settings` table.
 */
export interface SiteTheme {
  // Resolved theme identity
  themeSlug: string;                  // e.g. 'default-publisher'
  themeName: string;
  paletteSlug: string;                // e.g. 'neutral' | 'rose' | 'emerald'
  paletteName: string;
  color_mode: 'light' | 'dark';       // active display mode
  supports_dark_mode: boolean;        // whether the theme opts into dark toggle
  /** CSS custom properties to apply on `:root`. */
  cssLight: CssVars;
  /** CSS custom properties to apply on `.dark`. */
  cssDark: CssVars;

  // Site-level settings (loaded from `settings` table)
  site_logo: string;
  site_tagline: string;
  footer_text: string;
  posts_per_page: number;

  // AMP / header ad embed — still live on SiteTheme because every
  // public route (and AMP routes in particular) reads these fields
  // immediately after the getSiteTheme call.
  header_ad_code: string;
  header_ad_domain: string;
  header_ad_desktop: boolean;         // show ad on desktop (true) or AMP only (false)
  header_ad_embed_html: string;       // cached embed HTML from aurora worker
  header_ad_amp_css: string;          // extracted CSS for AMP inline injection
  header_ad_amp_body: string;         // extracted HTML body for AMP inline injection

  // Layout-level ad slots; raw HTML or shortcodes. Empty = hidden.
  ad_top_code?: string;
  ad_mid_code?: string;
}

/**
 * Compose a `SiteTheme` from the v2 `ActiveTheme` + empty site
 * settings. Route handlers layer the `settings` values (logo, tagline,
 * posts_per_page, ad code, ...) on top during `getSiteTheme`.
 */
function baseSiteThemeFromActive(active: ActiveTheme): SiteTheme {
  return {
    themeSlug: active.themeSlug,
    themeName: active.themeName,
    paletteSlug: active.paletteSlug,
    paletteName: active.paletteName,
    color_mode: active.colorMode,
    supports_dark_mode: active.supportsDarkMode,
    cssLight: active.cssLight,
    cssDark: active.cssDark,
    site_logo: '',
    site_tagline: '',
    footer_text: '',
    posts_per_page: 10,
    header_ad_code: '',
    header_ad_domain: '',
    header_ad_desktop: true,
    header_ad_embed_html: '',
    header_ad_amp_css: '',
    header_ad_amp_body: '',
  };
}

export interface AmpConfig {
  amp_enabled: boolean;
  amp_url_format: string; // '/amp/slug' | '/slug/amp' | '/slug?amp=1'
  amp_custom_domain: string;
}

const DEFAULT_AMP_CONFIG: AmpConfig = {
  amp_enabled: false,
  amp_url_format: '/amp/slug',
  amp_custom_domain: '',
};

export async function getAmpSettings(db: D1Database, siteId: number): Promise<AmpConfig> {
  const rows = await db.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key IN ('amp_enabled', 'amp_url_format', 'amp_custom_domain')"
  ).bind(siteId).all();

  const config = { ...DEFAULT_AMP_CONFIG };
  for (const row of rows.results) {
    const r = row as { key: string; value: string };
    switch (r.key) {
      case 'amp_enabled': config.amp_enabled = r.value === 'true' || r.value === '1'; break;
      case 'amp_url_format': config.amp_url_format = r.value || '/amp/slug'; break;
      case 'amp_custom_domain': config.amp_custom_domain = r.value || ''; break;
    }
  }
  return config;
}

// --- Rich Snippets Settings ---

export interface RichSnippetsConfig {
  enabled: boolean;
  posts: boolean;
  pages: boolean;
  homepage: boolean;
  archives: boolean;
  breadcrumbs: boolean;
  amp: boolean;
  publisherName: string;
  publisherLogo: string;
}

const DEFAULT_RS_CONFIG: RichSnippetsConfig = {
  enabled: true,
  posts: true,
  pages: true,
  homepage: true,
  archives: true,
  breadcrumbs: true,
  amp: true,
  publisherName: '',
  publisherLogo: '',
};

export async function getRichSnippetsSettings(db: D1Database, siteId: number, kv?: KVNamespace): Promise<RichSnippetsConfig> {
  return cached(kv, `site:${siteId}:richsnippets`, 3600, async () => {
    const rows = await db.prepare(
      "SELECT key, value FROM settings WHERE site_id = ? AND key LIKE 'rs_%'"
    ).bind(siteId).all();

    const config = { ...DEFAULT_RS_CONFIG };
    for (const row of rows.results) {
      const r = row as { key: string; value: string };
      switch (r.key) {
        case 'rs_enabled': config.enabled = r.value !== 'false'; break;
        case 'rs_posts': config.posts = r.value !== 'false'; break;
        case 'rs_pages': config.pages = r.value !== 'false'; break;
        case 'rs_homepage': config.homepage = r.value !== 'false'; break;
        case 'rs_archives': config.archives = r.value !== 'false'; break;
        case 'rs_breadcrumbs': config.breadcrumbs = r.value !== 'false'; break;
        case 'rs_amp': config.amp = r.value !== 'false'; break;
        case 'rs_publisher_name': config.publisherName = r.value || ''; break;
        case 'rs_publisher_logo': config.publisherLogo = r.value || ''; break;
      }
    }
    return config;
  });
}

export async function getSiteTheme(
  db: D1Database,
  siteId: number,
  kv?: KVNamespace
): Promise<SiteTheme> {
  return cached(kv, `site:${siteId}:theme`, 3600, async () => {
    // --- Load active theme (themes + site_themes) via the v2 engine ---
    const active = await loadActiveThemeV2(db, siteId);
    const theme = baseSiteThemeFromActive(active);

    // --- Layer site-level settings (logo, tagline, ad code, ...) ---
    const settingsRows = await db
      .prepare(
        `SELECT key, value FROM settings
           WHERE site_id = ?
             AND key IN (
               'theme_logo_url',
               'site_tagline',
               'theme_footer_text',
               'posts_per_page',
               'theme_header_ad_code',
               'theme_header_ad_domain',
               'theme_header_ad_desktop',
               'theme_ad_top_code',
               'theme_ad_mid_code'
             )`
      )
      .bind(siteId)
      .all();

    for (const row of settingsRows.results) {
      const r = row as { key: string; value: string };
      switch (r.key) {
        case 'theme_logo_url':
          theme.site_logo = r.value || '';
          break;
        case 'site_tagline':
          theme.site_tagline = r.value || '';
          break;
        case 'theme_footer_text':
          theme.footer_text = r.value || '';
          break;
        case 'posts_per_page':
          theme.posts_per_page = parseInt(r.value) || 10;
          break;
        case 'theme_header_ad_code':
          theme.header_ad_code = r.value || '';
          break;
        case 'theme_header_ad_domain':
          theme.header_ad_domain = r.value || '';
          break;
        case 'theme_header_ad_desktop':
          theme.header_ad_desktop = r.value !== 'false' && r.value !== '0';
          break;
        case 'theme_ad_top_code':
          theme.ad_top_code = r.value || undefined;
          break;
        case 'theme_ad_mid_code':
          theme.ad_mid_code = r.value || undefined;
          break;
      }
    }

    // Expand [shortcode] patterns inside ad slot codes so admins can
    // reuse site-wide shortcodes (e.g. [google-ads-header]) as a single
    // source of truth. Raw HTML passes through untouched.
    if (
      (theme.ad_top_code && theme.ad_top_code.indexOf('[') !== -1) ||
      (theme.ad_mid_code && theme.ad_mid_code.indexOf('[') !== -1)
    ) {
      try {
        const { loadShortcodes, processShortcodes } = await import(
          './shortcodes'
        );
        const shortcodes = await loadShortcodes(db, siteId);
        if (theme.ad_top_code) {
          theme.ad_top_code = processShortcodes(theme.ad_top_code, shortcodes);
        }
        if (theme.ad_mid_code) {
          theme.ad_mid_code = processShortcodes(theme.ad_mid_code, shortcodes);
        }
      } catch {
        // If shortcode loading fails, fall back to raw content
        // (safer than breaking the page).
      }
    }

    return theme;
  });
}

/**
 * Check if a site has white_label enabled via its owner's active subscription package.
 */
export async function hasWhiteLabel(db: D1Database, siteId: number): Promise<boolean> {
  const result = await db.prepare(
    `SELECT p.white_label FROM user_sites us
     JOIN subscriptions sub ON sub.user_id = us.user_id AND sub.status = 'active'
     JOIN packages p ON p.id = sub.package_id
     WHERE us.site_id = ? AND p.white_label = 1 LIMIT 1`
  ).bind(siteId).first<{ white_label: number }>();
  return result?.white_label === 1;
}

const AURORA_EMBED_BASE = 'https://aurora-amp-worker.example.workers.dev/embed/';

/**
 * Fetch the ad embed HTML from the aurora worker.
 * Uses Cloudflare edge cache (1h TTL) so subsequent requests are instant.
 */
export async function fetchHeaderAdEmbed(domain: string): Promise<string> {
  if (!domain) return '';
  try {
    const resp = await fetch(`${AURORA_EMBED_BASE}${encodeURIComponent(domain)}`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as any);
    if (!resp.ok) return '';
    let html = await resp.text();
    // Strip @import url(...) that blocks rendering while fonts load
    html = html.replace(/@import\s+url\([^)]*\)\s*;?/g, '');
    return html;
  } catch {
    return '';
  }
}

/**
 * Split embed HTML into CSS and body parts for AMP inline injection.
 * Strips @import, extracts all <style> content, removes <script> tags (except JSON-LD stays),
 * and converts <img> to <amp-img>.
 */
export function splitEmbedForAMP(raw: string): { css: string; body: string } {
  // Extract all CSS from <style> tags
  let css = '';
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = styleRe.exec(raw)) !== null) {
    css += m[1] + '\n';
  }
  // Strip @import
  css = css.replace(/@import\s+url\([^)]*\)\s*;?/g, '');

  // Remove <style> tags from body
  let body = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Remove <script> tags (JSON-LD structured data not needed in body for AMP — already in head)
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Convert <img> to <amp-img> with layout="responsive"
  body = body.replace(/<img\s([^>]*)>/gi, (_, attrs) => {
    if (!/layout=/i.test(attrs)) attrs += ' layout="responsive"';
    return `<amp-img ${attrs}></amp-img>`;
  });

  return { css: css.trim(), body: body.trim() };
}

/**
 * Enrich a SiteTheme with the ad embed HTML if header_ad_domain is set.
 * Also prepares AMP-specific split (css + body) for inline injection.
 */
export async function enrichThemeWithAdEmbed(theme: SiteTheme): Promise<SiteTheme> {
  if (theme.header_ad_domain) {
    const rawHtml = await fetchHeaderAdEmbed(theme.header_ad_domain);
    if (rawHtml) {
      if (theme.header_ad_desktop) {
        theme.header_ad_embed_html = rawHtml;
      }
      // Always prepare AMP parts (AMP uses domain regardless of desktop toggle)
      const { css, body } = splitEmbedForAMP(rawHtml);
      theme.header_ad_amp_css = css;
      theme.header_ad_amp_body = body;
    }
  }
  return theme;
}

export async function getPublicPosts(
  db: D1Database,
  siteId: number,
  lang: string,
  opts: { page?: number; perPage?: number; postType?: string; sticky?: boolean } = {},
  kv?: KVNamespace
): Promise<{ posts: PublicPost[]; total: number }> {
  return cached(kv, `site:${siteId}:${lang || 'all'}:posts:${opts.page || 1}:${opts.perPage || 10}`, 300, async () => {
    const page = opts.page || 1;
    const perPage = opts.perPage || 10;
    const postType = opts.postType || 'post';
    const offset = (page - 1) * perPage;

    let where = "p.site_id = ? AND p.status = 'publish' AND p.post_type = ? AND p.language = ?";
    const params: any[] = [siteId, postType, lang];

    if (opts.sticky !== undefined) {
      where += ' AND p.is_sticky = ?';
      params.push(opts.sticky ? 1 : 0);
    }

    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM posts p WHERE ${where}`
    ).bind(...params).first<{ total: number }>();

    const posts = await db.prepare(
      `SELECT p.*, u.display_name as author_name, u.email as author_email,
       m.r2_key as featured_image_url
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE ${where}
       ORDER BY p.is_sticky DESC, p.published_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, perPage, offset).all();

    return {
      posts: posts.results as unknown as PublicPost[],
      total: countResult?.total || 0,
    };
  });
}

export interface AnalyticsConfig {
  head_code: string;
  body_code: string;
}

const DEFAULT_ANALYTICS: AnalyticsConfig = { head_code: '', body_code: '' };

export async function getAnalyticsSettings(db: D1Database, siteId: number, kv?: KVNamespace): Promise<AnalyticsConfig> {
  return cached(kv, `site:${siteId}:analytics`, 3600, async () => {
    const [siteRows, globalRows] = await Promise.all([
      db.prepare("SELECT key, value FROM settings WHERE site_id = ? AND key IN ('analytics_head_code', 'analytics_body_code')").bind(siteId).all(),
      db.prepare("SELECT key, value FROM global_settings WHERE key IN ('analytics_head_code', 'analytics_body_code')").all(),
    ]);

    const siteMap = new Map((siteRows.results as any[]).map((r: any) => [r.key, r.value]));
    const globalMap = new Map((globalRows.results as any[]).map((r: any) => [r.key, r.value]));

    return {
      head_code: (siteMap.get('analytics_head_code') ?? globalMap.get('analytics_head_code') ?? '') as string,
      body_code: (siteMap.get('analytics_body_code') ?? globalMap.get('analytics_body_code') ?? '') as string,
    };
  });
}

export async function getPostBySlug(
  db: D1Database,
  siteId: number,
  slug: string,
  lang: string,
  kv?: KVNamespace
): Promise<PublicPost | null> {
  return cached(kv, `site:${siteId}:${lang || 'all'}:post:${slug}`, 300, async () => {
    const post = await db.prepare(
      `SELECT p.*, u.display_name as author_name, u.email as author_email,
       m.r2_key as featured_image_url
       FROM posts p
       LEFT JOIN users u ON p.author_id = u.id
       LEFT JOIN media m ON p.featured_image_id = m.id
       WHERE p.site_id = ? AND p.slug = ? AND p.language = ? AND p.status = 'publish'`
    ).bind(siteId, slug, lang).first();

    return post as unknown as PublicPost | null;
  });
}

export async function getPostTaxonomies(
  db: D1Database,
  postId: number
): Promise<PublicTaxonomy[]> {
  const result = await db.prepare(
    `SELECT t.* FROM taxonomies t
     JOIN post_taxonomies pt ON pt.taxonomy_id = t.id
     WHERE pt.post_id = ?`
  ).bind(postId).all();
  return result.results as unknown as PublicTaxonomy[];
}

export async function getTaxonomyBySlug(
  db: D1Database,
  siteId: number,
  slug: string,
  type: string,
  lang: string
): Promise<PublicTaxonomy | null> {
  const tax = await db.prepare(
    `SELECT t.*,
       (SELECT COUNT(*) FROM post_taxonomies pt
        JOIN posts p ON p.id = pt.post_id
        WHERE pt.taxonomy_id = t.id AND p.status = 'publish') AS count
     FROM taxonomies t
     WHERE t.site_id = ? AND t.slug = ? AND t.type = ? AND t.language = ?`
  ).bind(siteId, slug, type, lang).first();
  return tax as unknown as PublicTaxonomy | null;
}

export async function getPostsByTaxonomy(
  db: D1Database,
  siteId: number,
  taxonomyId: number,
  lang: string,
  page: number = 1,
  perPage: number = 10
): Promise<{ posts: PublicPost[]; total: number }> {
  const offset = (page - 1) * perPage;

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM posts p
     JOIN post_taxonomies pt ON pt.post_id = p.id
     WHERE pt.taxonomy_id = ? AND p.site_id = ? AND p.status = 'publish' AND p.language = ?`
  ).bind(taxonomyId, siteId, lang).first<{ total: number }>();

  const posts = await db.prepare(
    `SELECT p.*, u.display_name as author_name, u.email as author_email,
     m.r2_key as featured_image_url
     FROM posts p
     JOIN post_taxonomies pt ON pt.post_id = p.id
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN media m ON p.featured_image_id = m.id
     WHERE pt.taxonomy_id = ? AND p.site_id = ? AND p.status = 'publish' AND p.language = ?
     ORDER BY p.published_at DESC LIMIT ? OFFSET ?`
  ).bind(taxonomyId, siteId, lang, perPage, offset).all();

  return {
    posts: posts.results as unknown as PublicPost[],
    total: countResult?.total || 0,
  };
}

export async function searchPosts(
  db: D1Database,
  siteId: number,
  query: string,
  lang: string,
  page: number = 1,
  perPage: number = 10
): Promise<{ posts: PublicPost[]; total: number }> {
  // Try FTS5 first, fallback to LIKE if table doesn't exist
  try {
    const { searchPostsFTS } = await import('./search');
    const result = await searchPostsFTS(db, siteId, query, lang, page, perPage);
    return { posts: result.posts as unknown as PublicPost[], total: result.total };
  } catch {
    // FTS5 table not ready, fall back to LIKE
  }

  const offset = (page - 1) * perPage;
  const like = `%${query}%`;

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM posts p
     WHERE p.site_id = ? AND p.status = 'publish' AND p.language = ?
     AND (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)`
  ).bind(siteId, lang, like, like, like).first<{ total: number }>();

  const posts = await db.prepare(
    `SELECT p.*, u.display_name as author_name, u.email as author_email,
     m.r2_key as featured_image_url
     FROM posts p
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN media m ON p.featured_image_id = m.id
     WHERE p.site_id = ? AND p.status = 'publish' AND p.language = ?
     AND (p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)
     ORDER BY p.published_at DESC LIMIT ? OFFSET ?`
  ).bind(siteId, lang, like, like, like, perPage, offset).all();

  return {
    posts: posts.results as unknown as PublicPost[],
    total: countResult?.total || 0,
  };
}

export async function getMenuByLocation(
  db: D1Database,
  siteId: number,
  location: string,
  lang: string
): Promise<{ id: number; name: string; items: any[] } | null> {
  const menu = await db.prepare(
    `SELECT * FROM menus WHERE site_id = ? AND location = ? AND language = ?`
  ).bind(siteId, location, lang).first();

  if (!menu) return null;

  const items = await db.prepare(
    `SELECT * FROM menu_items WHERE menu_id = ? ORDER BY position ASC`
  ).bind(menu.id).all();

  return {
    id: menu.id as number,
    name: menu.name as string,
    items: items.results,
  };
}

/**
 * Get header navigation menu.
 * Priority: 1) header-area widget with menu  2) menus.location='primary'
 * Called AFTER getSidebarData so we can use sidebarData.headerWidgets + menus.
 */
export function getHeaderNavFromSidebar(
  sidebarData: SidebarData
): { id: number; name: string; items: any[] } | null {
  // Check header widgets for a menu widget
  for (const w of sidebarData.headerWidgets) {
    if (w.widget_type === 'menu' && w.config) {
      try {
        const cfg = JSON.parse(w.config);
        const slug = cfg.menu_slug || cfg.menuSlug;
        if (slug && sidebarData.menus[slug]) {
          const m = sidebarData.menus[slug];
          return { id: 0, name: m.name, items: m.items };
        }
      } catch {}
    }
  }
  return null;
}

export async function getRecentComments(
  db: D1Database,
  postId: number,
  limit: number = 50
): Promise<any[]> {
  const result = await db.prepare(
    `SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC LIMIT ?`
  ).bind(postId, limit).all();
  return result.results;
}

// --- Sidebar Widget Data ---

export interface SidebarWidget {
  id: number;
  widget_type: string;
  title: string | null;
  config: string | null;
  position: number;
}

export interface MenuItemData {
  id: number;
  parent_id: number | null;
  title: string;
  url: string;
  target: string | null;
  css_class: string | null;
  position: number;
}

export interface SidebarMenuData {
  slug: string;
  name: string;
  items: MenuItemData[];
}

export interface SidebarData {
  widgets: SidebarWidget[];
  footerWidgets: { 'footer-1': SidebarWidget[]; 'footer-2': SidebarWidget[]; 'footer-3': SidebarWidget[]; 'footer-4': SidebarWidget[] };
  headerWidgets: SidebarWidget[];
  sliderWidgets: SidebarWidget[];
  categories: PublicTaxonomy[];
  recentPosts: { id: number; title: string; slug: string; published_at: string | null }[];
  tags: PublicTaxonomy[];
  menus: Record<string, SidebarMenuData>; // keyed by menu slug
}

export async function getSidebarData(
  db: D1Database,
  siteId: number,
  lang: string,
  kv?: KVNamespace
): Promise<SidebarData> {
  return cached(kv, `site:${siteId}:${lang}:sidebar`, 1800, async () => {
  // Load ALL active widgets (sidebar + footer + slider + header areas)
  const widgetResult = await db.prepare(
    "SELECT * FROM widgets WHERE site_id = ? AND area IN ('sidebar','footer-1','footer-2','footer-3','footer-4','slider','header') AND is_active = 1 ORDER BY area, position ASC"
  ).bind(siteId).all();

  const allWidgets = widgetResult.results as unknown as (SidebarWidget & { area: string })[];
  const widgets = allWidgets.filter(w => w.area === 'sidebar');
  const headerWidgets = allWidgets.filter(w => w.area === 'header');
  const sliderWidgets = allWidgets.filter(w => w.area === 'slider');
  const footerWidgets = {
    'footer-1': allWidgets.filter(w => w.area === 'footer-1'),
    'footer-2': allWidgets.filter(w => w.area === 'footer-2'),
    'footer-3': allWidgets.filter(w => w.area === 'footer-3'),
    'footer-4': allWidgets.filter(w => w.area === 'footer-4'),
  };

  const needCategories = allWidgets.some(w => w.widget_type === 'categories');
  const needRecentPosts = allWidgets.some(w => w.widget_type === 'recent_posts');
  const needTags = allWidgets.some(w => w.widget_type === 'tags');

  // Collect menu slugs from ALL menu widgets (sidebar + footer)
  const menuSlugs: string[] = [];
  for (const w of allWidgets) {
    if (w.widget_type === 'menu' && w.config) {
      try {
        const cfg = JSON.parse(w.config);
        if (cfg.menu_slug) menuSlugs.push(cfg.menu_slug);
      } catch {}
    }
  }
  const needMenus = menuSlugs.length > 0;

  const [categories, recentPosts, tags] = await Promise.all([
    needCategories
      ? db.prepare(
          `SELECT t.*,
             (SELECT COUNT(*) FROM post_taxonomies pt
              JOIN posts p ON p.id = pt.post_id
              WHERE pt.taxonomy_id = t.id AND p.status = 'publish') AS count
           FROM taxonomies t
           WHERE t.site_id = ? AND t.type = 'category' AND t.language = ?
           ORDER BY t.name ASC`
        ).bind(siteId, lang).all().then(r => r.results as unknown as PublicTaxonomy[])
      : Promise.resolve([] as PublicTaxonomy[]),
    needRecentPosts
      ? db.prepare("SELECT id, title, slug, published_at FROM posts WHERE site_id = ? AND status = 'publish' AND post_type = 'post' AND language = ? ORDER BY published_at DESC LIMIT 5")
          .bind(siteId, lang).all().then(r => r.results as unknown as any[])
      : Promise.resolve([]),
    needTags
      ? db.prepare(
          `SELECT t.*,
             (SELECT COUNT(*) FROM post_taxonomies pt
              JOIN posts p ON p.id = pt.post_id
              WHERE pt.taxonomy_id = t.id AND p.status = 'publish') AS count
           FROM taxonomies t
           WHERE t.site_id = ? AND t.type = 'tag' AND t.language = ?
           ORDER BY count DESC LIMIT 20`
        ).bind(siteId, lang).all().then(r => r.results as unknown as PublicTaxonomy[])
      : Promise.resolve([] as PublicTaxonomy[]),
  ]);

  // Load menu data for menu widgets
  const menus: Record<string, SidebarMenuData> = {};
  if (needMenus) {
    const uniqueSlugs = [...new Set(menuSlugs)];
    for (const slug of uniqueSlugs) {
      const menu = await db.prepare(
        "SELECT id, name, slug FROM menus WHERE site_id = ? AND slug = ? AND language = ?"
      ).bind(siteId, slug, lang).first<any>();
      if (menu) {
        const itemsResult = await db.prepare(
          "SELECT id, parent_id, title, url, target, css_class, position FROM menu_items WHERE menu_id = ? ORDER BY position ASC"
        ).bind(menu.id).all<MenuItemData>();
        menus[slug] = { slug: menu.slug, name: menu.name, items: (itemsResult.results || []) as MenuItemData[] };
      }
    }
  }

  return { widgets, footerWidgets, headerWidgets, sliderWidgets, categories, recentPosts, tags, menus };
  });
}

// --- Homepage Settings ---

export interface HomepageSettings {
  show_on_front: 'posts' | 'page';
  page_on_front: number; // page ID, 0 = not set
}

export async function getHomepageSettings(db: D1Database, siteId: number): Promise<HomepageSettings> {
  const rows = await db.prepare(
    "SELECT key, value FROM settings WHERE site_id = ? AND key IN ('show_on_front', 'page_on_front')"
  ).bind(siteId).all();

  const settings: HomepageSettings = { show_on_front: 'posts', page_on_front: 0 };
  for (const row of rows.results) {
    const r = row as { key: string; value: string };
    if (r.key === 'show_on_front') settings.show_on_front = r.value === 'page' ? 'page' : 'posts';
    if (r.key === 'page_on_front') settings.page_on_front = parseInt(r.value) || 0;
  }
  return settings;
}

export async function getPageById(
  db: D1Database,
  siteId: number,
  pageId: number,
  lang: string
): Promise<PublicPost | null> {
  const post = await db.prepare(
    `SELECT p.*, u.display_name as author_name, u.email as author_email,
     m.r2_key as featured_image_url
     FROM posts p
     LEFT JOIN users u ON p.author_id = u.id
     LEFT JOIN media m ON p.featured_image_id = m.id
     WHERE p.id = ? AND p.site_id = ? AND p.status = 'publish'`
  ).bind(pageId, siteId).first();

  return post as unknown as PublicPost | null;
}

export async function getPostMeta(
  db: D1Database,
  postId: number,
  key: string
): Promise<string | null> {
  const result = await db.prepare(
    'SELECT meta_value FROM post_meta WHERE post_id = ? AND meta_key = ?'
  ).bind(postId, key).first<{ meta_value: string }>();
  return result?.meta_value || null;
}

export async function getSiteCategories(
  db: D1Database,
  siteId: number,
  lang: string
): Promise<PublicTaxonomy[]> {
  const result = await db.prepare(
    `SELECT t.*,
       (SELECT COUNT(*) FROM post_taxonomies pt
        JOIN posts p ON p.id = pt.post_id
        WHERE pt.taxonomy_id = t.id AND p.status = 'publish') AS count
     FROM taxonomies t
     WHERE t.site_id = ? AND t.type = 'category' AND t.language = ?
     ORDER BY t.name ASC`
  ).bind(siteId, lang).all();
  return result.results as unknown as PublicTaxonomy[];
}
