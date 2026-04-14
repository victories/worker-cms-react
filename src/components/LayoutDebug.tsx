/**
 * Layout Debug Renderer — ?lay query parameter
 * Shows a visual blueprint/wireframe of the page structure:
 * header, nav, layout rows/columns, sidebar widgets, footer widgets
 */

import type { SidebarData, SidebarWidget } from '../lib/public-db';

interface LayoutRow {
  id: string;
  columns: { width: number; shortcode: string; params: Record<string, string> }[];
}
interface PageLayout {
  rows: LayoutRow[];
}

export interface LayoutDebugProps {
  siteName: string;
  pageTitle: string;
  pageSlug: string;
  pageType: 'page' | 'post' | 'homepage-static' | 'homepage-blog';
  layout?: PageLayout | null;
  sidebarData?: SidebarData | null;
  navItems?: { title: string; url: string }[];
  lang: string;
  hasContent: boolean;
}

function _esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _widgetLabel(w: SidebarWidget): string {
  const config = w.config ? JSON.parse(w.config) : {};
  let detail = '';
  switch (w.widget_type) {
    case 'menu': detail = ` → ${config.menu_slug || '?'} (${config.style || 'yatay'})`; break;
    case 'text': detail = ` → "${(config.content || config.text || '').substring(0, 30)}…"`; break;
    case 'custom_html': detail = ` → ${(config.html || '').substring(0, 30)}…`; break;
    default: if (config && Object.keys(config).length > 0) detail = ` → ${JSON.stringify(config).substring(0, 40)}`;
  }
  return `${w.widget_type}${detail}`;
}

function _renderWidgetBox(w: SidebarWidget): string {
  return `<div class="lay-widget-box">
    <span class="lay-badge">${_esc(w.widget_type)}</span>
    ${w.title ? `<span class="lay-widget-title">${_esc(w.title)}</span>` : ''}
    <span class="lay-widget-detail">${_esc(_widgetLabel(w))}</span>
    <span class="lay-pos">pos: ${w.position}</span>
  </div>`;
}

function _renderColumn(col: { width: number; shortcode: string; params: Record<string, string> }): string {
  const paramStr = Object.entries(col.params || {})
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${_esc(k)}="${_esc(v)}"`)
    .join(' ');
  const isContent = col.shortcode === 'icerik';
  const scDisplay = isContent
    ? '📝 İçerik (Editör)'
    : col.shortcode
      ? `[${_esc(col.shortcode)}${paramStr ? ' ' + paramStr : ''}]`
      : '(boş)';
  return `<div class="lay-col" style="flex:0 0 ${col.width}%;min-width:0">
    <div class="lay-col-inner ${isContent ? 'lay-content-col' : ''}">
      <div class="lay-col-width">${col.width}%</div>
      <div class="lay-col-sc">${scDisplay}</div>
    </div>
  </div>`;
}

const CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;padding:1.5rem;min-height:100vh}
.lay-header{background:#1e293b;border:2px solid #334155;border-radius:12px;padding:1.5rem;margin-bottom:1rem}
.lay-header h1{font-size:1.1rem;color:#38bdf8;margin-bottom:0.5rem}
.lay-header .lay-meta{display:flex;gap:1.5rem;flex-wrap:wrap;font-size:0.8rem;color:#94a3b8}
.lay-header .lay-meta strong{color:#e2e8f0}
.lay-section-label{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;padding:0.5rem 0.75rem;background:#1e293b;border-radius:6px;margin:0.75rem 0 0.5rem;display:inline-block}
.lay-page-grid{display:flex;gap:1rem;margin-bottom:1rem}
.lay-main{flex:1;min-width:0}
.lay-sidebar-col{width:320px;flex-shrink:0}
.lay-block{background:#1e293b;border:2px dashed #334155;border-radius:8px;padding:1rem;margin-bottom:0.75rem}
.lay-block-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#475569;margin-bottom:0.5rem}
.lay-nav{display:flex;gap:0.5rem;flex-wrap:wrap}
.lay-nav-item{background:#334155;color:#cbd5e1;padding:0.3rem 0.75rem;border-radius:4px;font-size:0.75rem}
.lay-row{display:flex;gap:8px;margin-bottom:8px;background:#0f172a;border-radius:6px;padding:8px;border:1px solid #1e293b}
.lay-row-label{font-size:0.6rem;color:#475569;margin-bottom:4px;font-weight:600}
.lay-col{min-width:0}
.lay-col-inner{background:#1e293b;border:2px solid #334155;border-radius:6px;padding:0.75rem;min-height:60px;position:relative}
.lay-col-inner.lay-content-col{border-color:#38bdf8;background:#0c4a6e}
.lay-col-width{font-size:0.6rem;color:#64748b;position:absolute;top:4px;right:8px;font-weight:700}
.lay-col-sc{font-size:0.8rem;color:#f1f5f9;font-family:'Fira Code',monospace;word-break:break-all}
.lay-content-col .lay-col-sc{color:#7dd3fc}
.lay-no-layout{background:#1e293b;border:2px solid #334155;border-radius:8px;padding:1.5rem;text-align:center;color:#94a3b8}
.lay-no-layout .lay-icon{font-size:2rem;margin-bottom:0.5rem}
.lay-widget-box{background:#0f172a;border:1px solid #334155;border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.4rem;font-size:0.75rem;position:relative}
.lay-badge{background:#7c3aed;color:#fff;padding:0.15rem 0.4rem;border-radius:3px;font-size:0.65rem;font-weight:600;margin-right:0.4rem}
.lay-widget-title{color:#e2e8f0;font-weight:600}
.lay-widget-detail{color:#64748b;display:block;margin-top:0.2rem;font-family:'Fira Code',monospace;font-size:0.7rem}
.lay-pos{position:absolute;top:4px;right:8px;font-size:0.6rem;color:#475569}
.lay-footer-grid{display:flex;gap:1rem}
.lay-footer-area{flex:1;min-width:0}
.lay-footer-area-label{font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#475569;margin-bottom:0.5rem;padding-bottom:0.3rem;border-bottom:1px solid #334155}
.lay-footer-bottom{background:#1e293b;border:2px solid #334155;border-radius:8px;padding:0.75rem;text-align:center;color:#64748b;font-size:0.75rem;margin-top:0.5rem}
.lay-blog-listing{background:#1e293b;border:2px solid #334155;border-radius:8px;padding:1.5rem}
.lay-post-card{background:#0f172a;border:1px solid #334155;border-radius:6px;padding:0.5rem 0.75rem;margin-bottom:0.3rem;font-size:0.75rem;color:#94a3b8}
.lay-close{position:fixed;top:1rem;right:1rem;background:#ef4444;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;font-size:0.8rem;cursor:pointer;font-weight:600;z-index:999;text-decoration:none}
.lay-close:hover{background:#dc2626}
@media(max-width:768px){
  .lay-page-grid{flex-direction:column}
  .lay-sidebar-col{width:100%}
  .lay-footer-grid{flex-direction:column}
  .lay-row{flex-direction:column}
  .lay-col{flex:1 1 100%!important}
}`;

/**
 * Generate raw HTML string for layout debug (used from route handlers)
 */
export function renderLayoutDebugHTML(props: LayoutDebugProps): string {
  const { siteName, pageTitle, pageSlug, pageType, layout, sidebarData, navItems, lang, hasContent } = props;

  const sidebarWidgets = sidebarData?.widgets || [];
  const footer1 = sidebarData?.footerWidgets?.['footer-1'] || [];
  const footer2 = sidebarData?.footerWidgets?.['footer-2'] || [];
  const footer3 = sidebarData?.footerWidgets?.['footer-3'] || [];
  const hasFooter = footer1.length > 0 || footer2.length > 0 || footer3.length > 0;
  const hasSidebar = sidebarWidgets.length > 0;

  // Current page URL without ?lay for the back link
  const backHref = pageSlug ? `/${_esc(pageSlug)}` : '/';

  let html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Layout Debug — ${_esc(pageTitle)}</title>
<meta name="robots" content="noindex,nofollow">
<style>${CSS}</style>
</head>
<body>
<a class="lay-close" href="${backHref}">← Sayfaya Dön</a>

<div class="lay-header">
  <h1>📐 Layout Debug — ${_esc(pageTitle)}</h1>
  <div class="lay-meta">
    <span><strong>Site:</strong> ${_esc(siteName)}</span>
    <span><strong>Slug:</strong> /${_esc(pageSlug || '(anasayfa)')}</span>
    <span><strong>Tip:</strong> ${_esc(pageType)}</span>
    <span><strong>Dil:</strong> ${_esc(lang)}</span>
  </div>
</div>`;

  // HEADER / NAV
  html += `<div class="lay-section-label">🔝 HEADER + NAVİGASYON</div>
<div class="lay-block">
  <div class="lay-block-label">Navigasyon Menüsü (primary)</div>
  <div class="lay-nav">`;
  if (navItems && navItems.length > 0) {
    for (const item of navItems) {
      html += `<div class="lay-nav-item">${_esc(item.title)} → ${_esc(item.url)}</div>`;
    }
  } else {
    html += `<div style="color:#475569;font-size:0.75rem">Menü öğesi yok</div>`;
  }
  html += `</div></div>`;

  // CONTENT GRID
  html += `<div class="lay-section-label">📄 İÇERİK ALANI</div>
<div class="lay-page-grid">
  <div class="lay-main">`;

  if (pageType === 'homepage-blog') {
    html += `<div class="lay-blog-listing">
      <div class="lay-block-label">Blog Yazı Listesi (Anasayfa)</div>
      <div class="lay-post-card">📰 Yazı kartı 1</div>
      <div class="lay-post-card">📰 Yazı kartı 2</div>
      <div class="lay-post-card">📰 Yazı kartı ...</div>
      <div style="font-size:0.7rem;color:#475569;margin-top:0.5rem">Sayfalama: ?page=N</div>
    </div>`;
  } else if (layout && layout.rows && layout.rows.length > 0) {
    html += `<div class="lay-block">
      <div class="lay-block-label">Sayfa Layout Builder (${layout.rows.length} satır)</div>`;
    for (let ri = 0; ri < layout.rows.length; ri++) {
      const row = layout.rows[ri];
      html += `<div class="lay-row-label">Satır ${ri + 1} — ${row.columns.length} sütun</div>
      <div class="lay-row">`;
      for (const col of row.columns) {
        html += _renderColumn(col);
      }
      html += `</div>`;
    }
    html += `</div>`;
  } else if (hasContent) {
    html += `<div class="lay-no-layout">
      <div class="lay-icon">📝</div>
      <div>Düz İçerik (Layout Builder yok)</div>
      <div style="font-size:0.7rem;color:#475569;margin-top:0.3rem">Editör içeriği + shortcode işleme</div>
    </div>`;
  } else {
    html += `<div class="lay-no-layout">
      <div class="lay-icon">⚠️</div>
      <div>İçerik yok</div>
    </div>`;
  }

  html += `</div>`; // close lay-main

  // SIDEBAR
  if (hasSidebar) {
    html += `<div class="lay-sidebar-col">
    <div class="lay-block">
      <div class="lay-block-label">Kenar Çubuğu (sidebar) — ${sidebarWidgets.length} widget</div>`;
    for (const w of sidebarWidgets) {
      html += _renderWidgetBox(w);
    }
    html += `</div></div>`;
  }

  html += `</div>`; // close lay-page-grid

  // FOOTER WIDGETS
  if (hasFooter) {
    html += `<div class="lay-section-label">🦶 FOOTER WİDGET ALANLARI</div>
    <div class="lay-block">
      <div class="lay-footer-grid">`;
    const areas = [
      { label: 'Footer 1', widgets: footer1 },
      { label: 'Footer 2', widgets: footer2 },
      { label: 'Footer 3', widgets: footer3 },
    ];
    for (const area of areas) {
      html += `<div class="lay-footer-area">
        <div class="lay-footer-area-label">${area.label} (${area.widgets.length})</div>`;
      if (area.widgets.length > 0) {
        for (const w of area.widgets) { html += _renderWidgetBox(w); }
      } else {
        html += `<div style="color:#334155;font-size:0.7rem;padding:0.5rem">Boş</div>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  }

  // FOOTER BOTTOM
  html += `<div class="lay-footer-bottom">Footer Alt Metin (tema ayarlarından)</div>`;
  html += `</body></html>`;

  return html;
}
