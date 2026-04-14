import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('widget', async (params, _inner, ctx) => {
  const area = params.alan || params.area || '';
  const widgetType = params.tip || params.type || '';

  if (!area && !widgetType) return '<!-- [widget] alan veya tip gerekli -->';

  let sql = `SELECT id, widget_type, title, config, position FROM widgets
             WHERE site_id = ? AND is_active = 1 AND language = ?`;
  const binds: any[] = [ctx.siteId, ctx.lang];

  if (area) {
    sql += ` AND area = ?`;
    binds.push(area);
  }
  if (widgetType) {
    sql += ` AND widget_type = ?`;
    binds.push(widgetType);
  }

  sql += ` ORDER BY position ASC`;

  const result = await ctx.db.prepare(sql).bind(...binds).all<any>();
  const widgets = result.results || [];

  if (widgets.length === 0) return `<!-- [widget] bulunamadi: alan=${esc(area)} tip=${esc(widgetType)} -->`;

  const widgetHtml = widgets.map((w: any) => {
    let config: any = {};
    try { config = JSON.parse(w.config || '{}'); } catch { /* ignore */ }

    const titleHtml = w.title ? `<h3 class="widget-title">${esc(w.title)}</h3>` : '';
    let contentHtml = '';

    // Render based on widget_type
    switch (w.widget_type) {
      case 'text':
      case 'html':
        contentHtml = config.content || '';
        break;
      case 'recent_posts':
        // Will be handled by son-yazilar shortcode inside if needed
        contentHtml = `<div data-widget="recent-posts" data-count="${config.count || 5}"></div>`;
        break;
      case 'categories':
        contentHtml = `<div data-widget="categories"></div>`;
        break;
      default:
        contentHtml = config.content || '';
    }

    return `<div class="sc-widget sc-widget-${esc(w.widget_type)}">${titleHtml}<div class="widget-content">${contentHtml}</div></div>`;
  }).join('');

  return `<div class="sc-widget-area">${widgetHtml}</div>`;
});
