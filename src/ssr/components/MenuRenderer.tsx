import { cn } from '@ui/lib/utils';
import type { MenuItemData } from '../../lib/public-db';

/**
 * MenuRenderer — recursive renderer for menus stored in the `menu_items`
 * table. Used by the menu widget (sidebar/footer areas) and anywhere a
 * theme needs to drop a nav tree inline.
 *
 * This is NOT the header navigation — that's handled by the `NavMenu`
 * primitive in `packages/ui/nav-menu.tsx`, which is optimised for a
 * sticky publisher header with CSS-only dropdowns. MenuRenderer is
 * simpler: plain vertical or horizontal nested `<ul>` trees, suitable
 * for footer columns and sidebar widgets.
 *
 * Items arrive flat with `parent_id` → we group by parent once then
 * recurse. `position` ordering is assumed pre-sorted by the data layer
 * (`getSidebarData()` in public-db.ts).
 */

export type MenuOrientation = 'horizontal' | 'vertical';

export interface MenuRendererProps {
  items: MenuItemData[];
  orientation?: MenuOrientation;
  className?: string;
}

function childrenOf(items: MenuItemData[], parentId: number | null): MenuItemData[] {
  return items.filter((i) => (i.parent_id ?? null) === parentId);
}

function MenuItem({
  item,
  allItems,
  depth,
}: {
  item: MenuItemData;
  allItems: MenuItemData[];
  depth: number;
}) {
  const subs = childrenOf(allItems, item.id);
  const hasChildren = subs.length > 0;
  const target = item.target && item.target !== '_self' ? item.target : undefined;

  return (
    <li
      className={cn(
        'sc-menu-item',
        hasChildren && 'has-children',
        item.css_class ?? undefined
      )}
    >
      <a
        href={item.url || '#'}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className="text-foreground/80 hover:text-primary transition-colors"
      >
        {item.title}
      </a>
      {hasChildren && (
        <ul className="sc-submenu ml-4 mt-1 flex flex-col gap-1">
          {subs.map((child) => (
            <MenuItem
              key={child.id}
              item={child}
              allItems={allItems}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function MenuRenderer({
  items,
  orientation = 'vertical',
  className,
}: MenuRendererProps) {
  if (!items || items.length === 0) return null;
  const roots = childrenOf(items, null);
  if (roots.length === 0) return null;

  return (
    <nav
      className={cn(
        'sc-menu',
        orientation === 'horizontal' ? 'sc-menu-horizontal' : 'sc-menu-vertical',
        className
      )}
    >
      <ul
        className={cn(
          'flex',
          orientation === 'horizontal'
            ? 'flex-row flex-wrap items-center gap-4'
            : 'flex-col gap-2'
        )}
      >
        {roots.map((item) => (
          <MenuItem key={item.id} item={item} allItems={items} depth={0} />
        ))}
      </ul>
    </nav>
  );
}
