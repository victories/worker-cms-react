// LayoutPublisher — Editorial CMS theme with dashboard sidebar, ad slots,
// swappable pastel palettes (lavender/blush/cream/periwinkle) and built-in
// dark mode toggle. Renders both the light and dark CSS variable sets so
// the front-end can flip `<html data-theme>` instantly without a reload.

import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SiteTheme, SidebarData, MenuItemData } from '../lib/public-db';
import type { NavItem } from '../lib/nav-utils';
import { langPrefix } from '../lib/lang';
import { findPaletteVariant } from '../lib/themeEngine';
import { SYSTEM_THEMES } from '../lib/themePresets';
import { renderWidget } from './WidgetRenderer';

interface LayoutPublisherProps {
  siteName: string;
  siteTagline?: string;
  theme: SiteTheme;
  lang: string;
  defaultLang: string;
  head?: any;
  navItems?: NavItem[];
  pluginHead?: string;
  pluginBodyStart?: string;
  pluginBodyEnd?: string;
  analyticsHead?: string;
  analyticsBody?: string;
  isHomepage?: boolean;
  currentPath?: string;
  sidebarData?: SidebarData;
  hidePoweredBy?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function cssVarBlock(vars: Record<string, string>): string {
  // Convert snake_case keys → kebab-case CSS custom properties
  // e.g. primary_color → --primary-color
  return Object.entries(vars)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `  --${k.replace(/_/g, '-')}: ${v};`)
    .join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Main component ────────────────────────────────────────────────────────

export const LayoutPublisher: FC<PropsWithChildren<LayoutPublisherProps>> = (props) => {
  const {
    siteName,
    siteTagline,
    theme,
    lang,
    defaultLang,
    head,
    navItems,
    children,
    pluginHead,
    pluginBodyStart,
    pluginBodyEnd,
    analyticsHead,
    analyticsBody,
    currentPath,
    sidebarData,
    hidePoweredBy,
  } = props;

  const lp = langPrefix(lang, defaultLang);
  const fontFamily = theme.font_family || 'Plus Jakarta Sans';
  const headingFont = theme.heading_font_family || 'Playfair Display';

  // Resolve palette for the Publisher theme. If the active palette slug is
  // unknown we fall back to the theme's default palette; if there is still
  // nothing we synthesise light+dark blocks from the flat SiteTheme so the
  // CSS variable layer stays consistent across themes.
  const publisherPreset = SYSTEM_THEMES.find(t => t.slug === 'publisher');
  const defaultPaletteSlug = publisherPreset?.default_palette || 'lavender';
  const activePaletteSlug = theme.palette_slug || defaultPaletteSlug;
  const activeMode: 'light' | 'dark' = theme.color_mode === 'dark' ? 'dark' : 'light';
  const variant = findPaletteVariant('publisher', activePaletteSlug);

  const lightVars: Record<string, string> = variant
    ? (variant.light as Record<string, string>)
    : {
        primary_color: theme.primary_color,
        secondary_color: theme.secondary_color,
        bg_color: theme.bg_color,
        surface_color: theme.surface_color,
        text_color: theme.text_color,
        text_secondary_color: theme.text_secondary_color,
        border_color: theme.border_color,
        header_bg_color: theme.header_bg_color,
        header_text_color: theme.header_text_color,
        footer_bg_color: theme.footer_bg_color,
        footer_text_color: theme.footer_text_color,
        link_color: theme.link_color,
        link_hover_color: theme.link_hover_color,
      };

  const darkVars: Record<string, string> = variant
    ? (variant.dark as Record<string, string>)
    : lightVars;

  const supportsDarkMode = theme.supports_dark_mode === true;

  // ── Google Fonts ───────────────────────────────────────────────────────
  const fontsQuery = [
    'Plus+Jakarta+Sans:wght@400;500;600;700',
    'Playfair+Display:wght@400;500;600;700',
  ].join('&family=');
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontsQuery}&display=swap`;

  // ── Navigation items (fallback to a small default set) ────────────────
  const defaultNav: NavItem[] = [
    { title: 'Home', url: `${lp}/`, children: [] },
    { title: 'Articles', url: `${lp}/category/articles`, children: [] },
    { title: 'About', url: `${lp}/page/about`, children: [] },
    { title: 'Contact', url: `${lp}/page/contact`, children: [] },
  ];
  const nav = (navItems && navItems.length > 0) ? navItems : defaultNav;

  // ── Footer widgets (reuse existing footer sidebar data) ───────────────
  // NOTE: the admin widget manager only exposes footer-1, footer-2, footer-3;
  // footer-4 exists in the DB schema but has no UI to populate it, so we
  // do not render a 4th column (matches Layout.tsx / LayoutModern pattern).
  const FOOTER_AREAS = ['footer-1', 'footer-2', 'footer-3'] as const;
  type FooterArea = typeof FOOTER_AREAS[number];
  const footerCols: Record<FooterArea, any[]> = {
    'footer-1': sidebarData?.footerWidgets?.['footer-1'] || [],
    'footer-2': sidebarData?.footerWidgets?.['footer-2'] || [],
    'footer-3': sidebarData?.footerWidgets?.['footer-3'] || [],
  };
  const renderW = (widget: any, wrapClass: string) =>
    renderWidget({ widget, wrapClass, sidebarData, lang, lp });
  const hasSidebarWidgets = !!(sidebarData && (sidebarData.widgets?.length || 0) > 0);
  const hasFooterWidgets = FOOTER_AREAS.some((a) => footerCols[a].length > 0);

  // ── Inline boot script for dark mode persistence ──────────────────────
  // Runs before body paint to avoid a flash of wrong theme.
  const bootScript = supportsDarkMode ? `
    (function(){
      try {
        var saved = localStorage.getItem('wp-color-mode');
        if (saved === 'dark' || saved === 'light') {
          document.documentElement.setAttribute('data-theme', saved);
        }
      } catch(e) {}
    })();
  ` : '';

  const toggleScript = supportsDarkMode ? `
    (function(){
      var btn = document.getElementById('pub-mode-toggle');
      if (!btn) return;
      btn.addEventListener('click', function(){
        var cur = document.documentElement.getAttribute('data-theme') || 'light';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('wp-color-mode', next); } catch(e) {}
      });
    })();
  ` : '';

  // ── Inline CSS ─────────────────────────────────────────────────────────
  const inlineCss = `
:root {
${cssVarBlock(lightVars)}
  --pub-font: '${fontFamily}', system-ui, -apple-system, sans-serif;
  --pub-heading-font: '${headingFont}', Georgia, serif;
  --pub-radius-card: 12px;
  --pub-radius-btn: 8px;
  --pub-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06);
  --pub-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04);
}
[data-theme="dark"] {
${cssVarBlock(darkVars)}
  --pub-shadow-sm: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.4);
  --pub-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg-color);
  color: var(--text-color);
  font-family: var(--pub-font);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s ease, color 0.3s ease;
}
a { color: var(--link-color); text-decoration: none; transition: color 0.2s ease; }
a:hover { color: var(--link-hover-color); }
h1, h2, h3, h4, h5, h6 {
  font-family: var(--pub-heading-font);
  color: var(--text-color);
  margin: 0 0 0.5em;
  line-height: 1.25;
}

/* ── Layout primitives ───────────────────────────────────────── */
.pub-container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }

/* ── Ad banners (rendered only when user provides ad code) ──── */
.pub-ad-top, .pub-ad-mid {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 16px 0;
}
.pub-ad-mid { border-top: 1px solid var(--border-color); margin: 48px 0; }
.pub-ad-slot {
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  font-size: 14px;
}
.pub-ad-slot > * { max-width: 100%; }

/* ── Header ──────────────────────────────────────────────────── */
.pub-header {
  background: var(--header-bg-color);
  color: var(--header-text-color);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(8px);
}
.pub-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  max-width: 1400px;
  margin: 0 auto;
  gap: 24px;
}
.pub-brand { display: flex; align-items: center; gap: 12px; font-family: var(--pub-heading-font); font-weight: 700; font-size: 22px; color: var(--header-text-color); }
.pub-brand-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--primary-color);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 18px;
}
.pub-header-nav {
  display: flex; gap: 24px;
  font-family: var(--pub-font); font-size: 14px; font-weight: 500;
}
.pub-header-nav a { color: var(--header-text-color); opacity: 0.85; }
.pub-header-nav a:hover { opacity: 1; color: var(--primary-color); }
.pub-header-tools { display: flex; align-items: center; gap: 12px; }
.pub-search {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 8px 14px;
  min-width: 260px;
  color: var(--text-secondary-color);
  font-size: 14px;
}
.pub-search input {
  border: 0; background: transparent; outline: none;
  color: var(--text-color); flex: 1; font-family: inherit; font-size: 14px;
}
.pub-search input::placeholder { color: var(--text-secondary-color); }
.pub-mode {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  border-radius: 999px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}
.pub-mode:hover { border-color: var(--primary-color); color: var(--primary-color); }
.pub-mode .icon-sun { display: none; }
[data-theme="dark"] .pub-mode .icon-sun { display: inline; }
[data-theme="dark"] .pub-mode .icon-moon { display: none; }

/* ── Main content grid ───────────────────────────────────────── */
.pub-main { padding: 48px 0; }
.pub-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 48px;
  align-items: start;
}
.pub-grid.has-sidebar {
  grid-template-columns: minmax(0, 1fr) 340px;
}
@media (max-width: 1024px) {
  .pub-grid.has-sidebar { grid-template-columns: 1fr; }
  .pub-search { min-width: 0; }
}

/* ── Article cards ───────────────────────────────────────────── */
.pub-section-title {
  font-family: var(--pub-heading-font);
  font-size: 32px;
  margin: 0 0 24px;
  position: relative;
  padding-bottom: 12px;
}
.pub-section-title::after {
  content: '';
  position: absolute;
  left: 0; bottom: 0;
  width: 64px; height: 3px;
  background: var(--primary-color);
  border-radius: 2px;
}
.pub-card-list { display: flex; flex-direction: column; gap: 24px; }
.pub-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--pub-radius-card);
  box-shadow: var(--pub-shadow-sm);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.pub-card:hover { transform: translateY(-2px); box-shadow: var(--pub-shadow-md); }
.pub-card-body { padding: 24px; }
.pub-card-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--primary-color);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.pub-card-title {
  font-family: var(--pub-heading-font);
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
  line-height: 1.3;
}
.pub-card-title a { color: var(--text-color); }
.pub-card-title a:hover { color: var(--primary-color); }
.pub-card-excerpt { color: var(--text-secondary-color); font-size: 15px; margin: 0 0 16px; }
.pub-card-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: var(--text-secondary-color); }

/* ── Right sidebar (user widgets) ─────────────────────────────── */
.pub-sidebar { display: flex; flex-direction: column; gap: 24px; position: sticky; top: 88px; }
.pub-sidebar-widget,
.pub-sidebar > * {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--pub-radius-card);
  box-shadow: var(--pub-shadow-sm);
  padding: 24px;
}
.pub-sidebar-widget h3,
.pub-sidebar-widget .widget-title,
.pub-sidebar > * > h3:first-child {
  font-family: var(--pub-heading-font);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text-color);
}
.pub-sidebar-widget ul { list-style: none; padding: 0; margin: 0; }
.pub-sidebar-widget ul li { padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 14px; }
.pub-sidebar-widget ul li:last-child { border-bottom: 0; padding-bottom: 0; }
.pub-sidebar-widget ul li a { color: var(--text-color); }
.pub-sidebar-widget ul li a:hover { color: var(--primary-color); }

/* ── Footer ──────────────────────────────────────────────────── */
.pub-footer {
  background: var(--footer-bg-color);
  color: var(--footer-text-color);
  margin-top: 80px;
  border-top: 1px solid var(--border-color);
}
/* Top padding lives on the grid (not the footer) so a widget-less
 * footer collapses cleanly to just the bottom strip without leaving
 * an empty 64px gap above the social + copyright row.
 *
 * auto-fit+minmax lets the grid adapt when only 1 or 2 of the 3
 * footer widget areas are populated — no stray empty slots. */
.pub-footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 40px;
  padding: 64px 0 48px;
}
.pub-footer-col h4 {
  color: var(--primary-color);
  font-family: var(--pub-font);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 0 16px;
}
.pub-footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.pub-footer-col a { color: var(--footer-text-color); font-size: 14px; }
.pub-footer-col a:hover { color: var(--primary-color); }

.pub-footer-bottom {
  border-top: 1px solid var(--border-color);
  padding: 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.pub-social { display: flex; gap: 10px; }
.pub-social a {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 999px;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  color: var(--footer-text-color);
  font-size: 14px;
}
.pub-social a:hover { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
.pub-copy { font-size: 13px; color: var(--footer-text-color); }
`;

  // ── Render ─────────────────────────────────────────────────────────────
  return raw(`<!DOCTYPE html>
<html lang="${lang}" data-theme="${activeMode}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(siteName)}${siteTagline ? ' — ' + escapeHtml(siteTagline) : ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${googleFontsUrl}" />
<style>${inlineCss}</style>
${bootScript ? `<script>${bootScript}</script>` : ''}
${analyticsHead || ''}
${pluginHead || ''}
${(typeof head === 'string' ? head : '') || ''}
</head>
<body data-palette="${escapeHtml(activePaletteSlug)}">
${analyticsBody || ''}
${pluginBodyStart || ''}

${theme.ad_top_code && theme.ad_top_code.trim() ? `
<!-- 1. Top full-width ad banner (user-configured) -->
<div class="pub-ad-top">
  <div class="pub-container">
    <div class="pub-ad-slot" data-slot="header-top">${theme.ad_top_code}</div>
  </div>
</div>
` : ''}

<!-- 2. Header -->
<header class="pub-header">
  <div class="pub-header-inner">
    <a href="${lp}/" class="pub-brand">
      <span class="pub-brand-icon">${escapeHtml(siteName.charAt(0).toUpperCase())}</span>
      <span>${escapeHtml(siteName)}</span>
    </a>
    <nav class="pub-header-nav">
      ${nav.map(n => `<a href="${escapeHtml(n.url)}">${escapeHtml(n.title)}</a>`).join('')}
    </nav>
    <div class="pub-header-tools">
      <form class="pub-search" action="${lp}/search" method="get" role="search">
        <span aria-hidden="true">&#x1F50D;</span>
        <input type="search" name="q" placeholder="Search articles, pages, media..." />
      </form>
      ${supportsDarkMode ? `
      <button type="button" id="pub-mode-toggle" class="pub-mode" aria-label="Toggle color mode">
        <span class="icon-moon" aria-hidden="true">&#x1F319;</span>
        <span class="icon-sun" aria-hidden="true">&#x2600;</span>
      </button>
      ` : ''}
    </div>
  </div>
</header>

<!-- 3. Main content (optional right sidebar with user widgets) -->
<main class="pub-main">
  <div class="pub-container pub-grid${hasSidebarWidgets ? ' has-sidebar' : ''}">
    <section class="pub-content">
      <h2 class="pub-section-title">Latest Articles</h2>
      <div class="pub-card-list">
        ${children}
      </div>
    </section>
    ${hasSidebarWidgets ? `
    <aside class="pub-sidebar" aria-label="Sidebar">
      ${(sidebarData!.widgets as any[]).map(w => renderW(w, 'pub-sidebar-widget')).join('')}
    </aside>
    ` : ''}
  </div>
</main>

${theme.ad_mid_code && theme.ad_mid_code.trim() ? `
<!-- 4. Mid full-width ad banner (user-configured) -->
<div class="pub-ad-mid">
  <div class="pub-container">
    <div class="pub-ad-slot" data-slot="content-mid">${theme.ad_mid_code}</div>
  </div>
</div>
` : ''}

<!-- 5. Footer -->
<footer class="pub-footer">
  <div class="pub-container">
    ${hasFooterWidgets ? `
    <div class="pub-footer-grid">
      ${FOOTER_AREAS
        .filter((area) => footerCols[area].length > 0)
        .map((area) => `
        <div class="pub-footer-col">${footerCols[area].map((w: any) => renderW(w, 'pub-footer-widget')).join('')}</div>
      `).join('')}
    </div>
    ` : ''}
    <div class="pub-footer-bottom">
      <div class="pub-social">
        <a href="#" aria-label="Twitter/X">&#x1D54F;</a>
        <a href="#" aria-label="Facebook">f</a>
        <a href="#" aria-label="Instagram">&#x1F4F7;</a>
        <a href="#" aria-label="YouTube">&#x25B6;</a>
        <a href="#" aria-label="LinkedIn">in</a>
        <a href="#" aria-label="GitHub">&#xE1B4;</a>
      </div>
      <div class="pub-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(siteName)}. All rights reserved.${hidePoweredBy ? '' : ' &middot; Powered by WP-Worker'}</div>
    </div>
  </div>
</footer>

${pluginBodyEnd || ''}
${toggleScript ? `<script>${toggleScript}</script>` : ''}
</body>
</html>`);
};
