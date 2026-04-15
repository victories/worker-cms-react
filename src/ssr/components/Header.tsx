/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { Container } from '@ui/container';
import { NavMenu, type NavMenuItem } from '@ui/nav-menu';
import { cn } from '@ui/lib/utils';
import { ThemeToggle } from '../islands/ThemeToggle';
import { SearchOverlay } from '../islands/SearchOverlay';
import { MobileDrawer } from '../islands/MobileDrawer';

/**
 * Header — publisher site top bar.
 *
 * Composition:
 *   [Container]
 *     ├── Brand (logo/initial + site name)
 *     ├── NavMenu (desktop — hidden on mobile)
 *     └── Tools
 *           ├── SearchOverlay island
 *           ├── headerRight plugin slot (placeholder, Faz 7)
 *           ├── ThemeToggle island (if dark mode supported)
 *           └── MobileDrawer island
 *
 * ## Island hydration pattern
 *
 * Each interactive island is both:
 *   - server-rendered (into a wrapper `<span data-island="name">`), and
 *   - hydrated on the client by `src/client/publisher-entry.tsx`.
 *
 * `publisher-entry.tsx` walks `[data-island]` elements and calls
 * `hydrateRoot(el, <Island .../>)` with the same component we rendered
 * on the server. Because the initial SSR markup inside the wrapper
 * matches the client render tree, React hydrates cleanly with no
 * markup-diff warning. The `data-island-data` JSON pipes serialised
 * props (nav items, search action URL) from server to client without
 * needing a per-page window global.
 *
 * Note: islands that depend on `useEffect` (ThemeToggle, etc.) render
 * their initial state on the server — useEffect is a no-op until
 * hydration. That's why ThemeToggle's useState initialiser guards on
 * `typeof document !== 'undefined'`.
 */

export interface HeaderProps {
  siteName: string;
  siteLogo?: string;
  /** Root path for the current locale — use in brand link */
  homeHref: string;
  /** Action URL for the search form (locale-prefixed) */
  searchAction: string;
  navItems: NavMenuItem[];
  activePath?: string;
  /** Whether this theme opts into a light/dark toggle */
  supportsDarkMode?: boolean;
  /** Server-rendered placeholder for the headerRight plugin slot (Faz 7) */
  headerRight?: ReactNode;
  /** Localised placeholder for the search input */
  searchPlaceholder?: string;
  className?: string;
}

export function Header({
  siteName,
  siteLogo,
  homeHref,
  searchAction,
  navItems,
  activePath,
  supportsDarkMode = false,
  headerRight,
  searchPlaceholder,
  className,
}: HeaderProps) {
  const initial = siteName.charAt(0).toUpperCase();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <Container
        as="div"
        size="xl"
        className="flex h-16 items-center justify-between gap-6"
      >
        {/* Brand */}
        <a
          href={homeHref}
          className="flex items-center gap-3 text-foreground transition-colors hover:text-primary"
        >
          {siteLogo ? (
            <img
              src={siteLogo}
              alt={siteName}
              className="h-8 w-auto"
              loading="eager"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
              {initial}
            </span>
          )}
          <span className="font-semibold tracking-tight">{siteName}</span>
        </a>

        {/* Desktop nav */}
        <NavMenu items={navItems} activePath={activePath} className="flex-1" />

        {/* Tools */}
        <div className="flex items-center gap-2">
          <span data-island="search-overlay" className="contents">
            <SearchOverlay action={searchAction} placeholder={searchPlaceholder} />
          </span>
          <script
            type="application/json"
            data-island-data="search-overlay"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                action: searchAction,
                placeholder: searchPlaceholder,
              }),
            }}
          />

          {headerRight}

          {supportsDarkMode ? (
            <span data-island="theme-toggle" className="contents">
              <ThemeToggle />
            </span>
          ) : null}

          <span data-island="mobile-drawer" className="contents md:hidden">
            <MobileDrawer items={navItems} />
          </span>
          <script
            type="application/json"
            data-island-data="mobile-drawer"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(navItems),
            }}
          />
        </div>
      </Container>
    </header>
  );
}
