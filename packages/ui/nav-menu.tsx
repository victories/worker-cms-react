import * as React from 'react';
import { cn } from './lib/utils';

/**
 * NavMenu — primitive for the publisher site header navigation.
 *
 * Takes a flat or nested list of menu items (matching the existing
 * `menu_items` DB schema: id, parent_id, title, url, target, css_class)
 * and renders them as a horizontal menu with one level of dropdowns.
 *
 * This is intentionally minimal — no mega-menu, no animations beyond
 * Tailwind hover/focus transitions. Mobile drawer is a separate
 * interactive island (`src/ssr/islands/MobileDrawer.tsx`) that takes
 * the same item list and renders it as a vertical stack.
 *
 * Styling:
 * - Top-level items: `text-foreground/80 hover:text-foreground`
 * - Active item: `text-foreground` (controlled by caller via `activePath`)
 * - Dropdown trigger: adds a chevron
 * - Dropdown panel: `bg-popover text-popover-foreground border-border`
 *
 * Dropdowns use CSS-only hover (`.group:hover > .dropdown { display:block }`)
 * so they work in pure SSR without hydration. Good enough for a public
 * site nav where keyboard users can Tab through the entire flat list.
 * If we later need a Radix-powered accessible menu, swap to
 * @radix-ui/react-navigation-menu — interface is compatible.
 */

export interface NavMenuItem {
  id: number;
  parent_id: number | null;
  title: string;
  url: string;
  target?: string | null;
  css_class?: string | null;
}

export interface NavMenuProps {
  items: NavMenuItem[];
  /** Current path to highlight the active item. */
  activePath?: string;
  className?: string;
}

export function NavMenu({ items, activePath, className }: NavMenuProps) {
  const topLevel = items.filter((i) => i.parent_id === null);
  const getChildren = (parentId: number) =>
    items.filter((i) => i.parent_id === parentId);

  return (
    <nav className={cn('hidden md:block', className)}>
      <ul className="flex items-center gap-1">
        {topLevel.map((item) => {
          const children = getChildren(item.id);
          const hasChildren = children.length > 0;
          const isActive = activePath === item.url;

          return (
            <li
              key={item.id}
              className={cn('group relative', item.css_class ?? '')}
            >
              <a
                href={item.url || '#'}
                target={item.target ?? undefined}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-foreground/70 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                {item.title}
                {hasChildren ? (
                  <svg
                    className="size-3 opacity-60 transition-transform group-hover:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                ) : null}
              </a>

              {hasChildren ? (
                <div className="invisible absolute left-0 top-full pt-1 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  <ul className="min-w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
                    {children.map((child) => (
                      <li key={child.id}>
                        <a
                          href={child.url || '#'}
                          target={child.target ?? undefined}
                          className="block rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {child.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
