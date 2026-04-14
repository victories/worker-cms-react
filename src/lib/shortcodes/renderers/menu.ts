import { registerShortcode } from '../registry';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

registerShortcode('menu', async (params, _inner, ctx) => {
  const slug = params.slug || params.konum || '';
  const style = params.stil || params.style || 'yatay'; // yatay | dikey

  if (!slug) return '<!-- [menu] slug gerekli -->';

  const menu = await ctx.db.prepare(
    `SELECT id, name FROM menus WHERE site_id = ? AND slug = ? AND language = ?`
  ).bind(ctx.siteId, slug, ctx.lang).first<any>();

  if (!menu) return `<!-- [menu] bulunamadi: ${esc(slug)} -->`;

  const result = await ctx.db.prepare(
    `SELECT id, parent_id, title, url, target, css_class, position FROM menu_items
     WHERE menu_id = ? ORDER BY position ASC`
  ).bind(menu.id).all<any>();

  const items = result.results || [];
  if (items.length === 0) return `<!-- [menu] ${esc(slug)}: oge yok -->`;

  // Build tree
  const topLevel = items.filter((i: any) => !i.parent_id);
  const children = (parentId: number) => items.filter((i: any) => i.parent_id === parentId);

  function renderItem(item: any): string {
    const subs = children(item.id);
    const cls = item.css_class ? ` ${esc(item.css_class)}` : '';
    const target = item.target && item.target !== '_self' ? ` target="${esc(item.target)}"` : '';
    const link = `<a href="${esc(item.url || '#')}"${target}>${esc(item.title)}</a>`;

    if (subs.length > 0) {
      const subHtml = subs.map(renderItem).join('');
      return `<li class="sc-menu-item has-children${cls}">${link}<ul class="sc-submenu">${subHtml}</ul></li>`;
    }
    return `<li class="sc-menu-item${cls}">${link}</li>`;
  }

  const direction = style === 'dikey' || style === 'vertical' ? 'sc-menu-vertical' : 'sc-menu-horizontal';
  const menuHtml = topLevel.map(renderItem).join('');

  return `<nav class="sc-menu ${direction}"><ul>${menuHtml}</ul></nav>`;
});
