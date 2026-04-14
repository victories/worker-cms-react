// Shared widget renderer — used by both Starter and Modern themes
import type { PublicTaxonomy, SidebarData, SidebarWidget, MenuItemData } from '../lib/public-db';

interface WidgetRendererProps {
  widget: SidebarWidget;
  wrapClass: string;
  sidebarData: SidebarData | undefined;
  lang: string;
  lp: string; // langPrefix result
}

export function renderWidget({ widget, wrapClass, sidebarData, lang, lp }: WidgetRendererProps): any {
  const config = widget.config ? JSON.parse(widget.config) : {};

  if (widget.widget_type === 'categories' && sidebarData && sidebarData.categories.length > 0) {
    return (
      <div class={wrapClass}>
        <h3>{widget.title || (lang === 'tr' ? 'Kategoriler' : 'Categories')}</h3>
        <ul>
          {sidebarData.categories.map((cat: PublicTaxonomy) => (
            <li><a href={`${lp}/category/${cat.slug}`}>{cat.name} <span class="count">{cat.count}</span></a></li>
          ))}
        </ul>
      </div>
    );
  }

  if (widget.widget_type === 'recent_posts' && sidebarData && sidebarData.recentPosts.length > 0) {
    return (
      <div class={wrapClass}>
        <h3>{widget.title || (lang === 'tr' ? 'Son Yazılar' : 'Recent Posts')}</h3>
        <ul>
          {sidebarData.recentPosts.map((p: any) => (
            <li><a href={`${lp}/${p.slug}`}>{p.title}</a></li>
          ))}
        </ul>
      </div>
    );
  }

  if (widget.widget_type === 'tags' && sidebarData && sidebarData.tags.length > 0) {
    return (
      <div class={wrapClass}>
        <h3>{widget.title || (lang === 'tr' ? 'Etiketler' : 'Tags')}</h3>
        <div class="tag-cloud">
          {sidebarData.tags.map((tag: PublicTaxonomy) => (
            <a href={`${lp}/tag/${tag.slug}`} class="tag-link">{tag.name}</a>
          ))}
        </div>
      </div>
    );
  }

  if (widget.widget_type === 'text') {
    return (
      <div class={wrapClass}>
        {widget.title && <h3>{widget.title}</h3>}
        <div class="widget-text">{config.content || config.text || ''}</div>
      </div>
    );
  }

  if (widget.widget_type === 'menu' && sidebarData && sidebarData.menus) {
    const menuSlug = config.menu_slug;
    const menuStyle = config.style || 'yatay';
    const menuData = menuSlug ? sidebarData.menus[menuSlug] : null;
    if (menuData && menuData.items.length > 0) {
      const topLevel = menuData.items.filter((i: MenuItemData) => !i.parent_id);
      const getChildren = (parentId: number) => menuData.items.filter((i: MenuItemData) => i.parent_id === parentId);
      const direction = menuStyle === 'dikey' || menuStyle === 'vertical' ? 'sc-menu-vertical' : 'sc-menu-horizontal';
      const renderMenuItem = (item: MenuItemData): any => {
        const subs = getChildren(item.id);
        const cls = item.css_class ? ` ${item.css_class}` : '';
        const target = item.target && item.target !== '_self' ? item.target : undefined;
        return (
          <li class={`sc-menu-item${subs.length > 0 ? ' has-children' : ''}${cls}`}>
            <a href={item.url || '#'} target={target}>{item.title}</a>
            {subs.length > 0 && (
              <ul class="sc-submenu">
                {subs.map(renderMenuItem)}
              </ul>
            )}
          </li>
        );
      };
      return (
        <div class={wrapClass}>
          {widget.title && <h3>{widget.title}</h3>}
          <nav class={`sc-menu ${direction}`}>
            <ul>
              {topLevel.map(renderMenuItem)}
            </ul>
          </nav>
        </div>
      );
    }
  }

  return null;
}
