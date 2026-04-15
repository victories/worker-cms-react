import { useCallback, useEffect, useState } from 'react';
import type { NavMenuItem } from '@ui/nav-menu';

/**
 * MobileDrawer — client island that opens a full-screen nav overlay
 * on small screens. The SSR header renders a `<button data-island=
 * "mobile-drawer">` placeholder; on hydrate we replace it with this
 * component, which pulls the nav tree out of a JSON `<script>` tag
 * emitted alongside the button.
 *
 * We don't try to reuse radix-dialog here — the drawer is simple
 * enough that a hand-rolled overlay keeps the bundle small, and we
 * avoid hydration gymnastics caused by radix's portal.
 *
 * Nav data transport: the header emits an adjacent
 * `<script type="application/json" data-island-data="mobile-drawer">`
 * with the serialised items. The island reads it on mount.
 */

function childrenOf(items: NavMenuItem[], parentId: number | null) {
  return items.filter((i) => (i.parent_id ?? null) === parentId);
}

function NavList({
  items,
  parentId,
  depth,
}: {
  items: NavMenuItem[];
  parentId: number | null;
  depth: number;
}) {
  const list = childrenOf(items, parentId);
  if (list.length === 0) return null;
  return (
    <ul className={depth === 0 ? 'flex flex-col gap-1' : 'ml-4 mt-1 flex flex-col gap-1'}>
      {list.map((item) => (
        <li key={item.id}>
          <a
            href={item.url || '#'}
            target={item.target ?? undefined}
            className="block rounded-md px-4 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {item.title}
          </a>
          <NavList items={items} parentId={item.id} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export interface MobileDrawerProps {
  items: NavMenuItem[];
}

export function MobileDrawer({ items }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Lock scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4">
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Menu
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <nav className="mt-2 flex-1 overflow-y-auto">
              <NavList items={items} parentId={null} depth={0} />
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
