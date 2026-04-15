import type { ReactNode } from 'react';
import { Container } from '@ui/container';
import { cn } from '@ui/lib/utils';
import type { NavMenuItem } from '@ui/nav-menu';
import type { SidebarData } from '../../lib/public-db';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Sidebar } from '../components/Sidebar';

/**
 * PublisherLayout — the one React layout for all publisher pages (home,
 * post, page, archive, search). Every route renders its page body
 * inside `<PublisherLayout>` which in turn drops into `<Shell>`:
 *
 *   <Shell head={<SEOHead .../>} bodyEnd={<PublisherClient/>}>
 *     <PublisherLayout
 *       siteName={...}
 *       navItems={...}
 *       sidebarData={...}
 *       lang={lang}
 *       lp={lp}
 *     >
 *       <Home posts={...} />
 *     </PublisherLayout>
 *   </Shell>
 *
 * Layout shape (top to bottom):
 *   - `<Header>` (sticky)
 *   - `<main>` with optional sidebar column
 *       · content slot (children)
 *       · `<Sidebar>` (null when no widgets configured)
 *   - `<Footer>`
 *
 * `showSidebar` lets individual pages opt out of the sidebar column
 * even when the site has widgets configured. Post detail pages and
 * landing pages want full-width main; archive/home pages want the
 * sidebar on the right. The default is `true` so callers have to
 * actively disable it.
 */

export interface PublisherLayoutProps {
  siteName: string;
  siteLogo?: string;
  /** Language code, e.g. 'tr' */
  lang: string;
  /** Language prefix for links ('' or '/en') */
  lp: string;
  /** NavMenu items — already shaped for `@ui/nav-menu` */
  navItems: NavMenuItem[];
  /** Path of the active request, used to highlight the current nav item */
  activePath?: string;
  sidebarData: SidebarData;
  /** Toggle whether this page renders the right sidebar column */
  showSidebar?: boolean;
  supportsDarkMode?: boolean;
  hidePoweredBy?: boolean;
  footerText?: string;
  /** Plugin `ui.slot.headerRight` output, pre-fetched by the route handler */
  headerRight?: ReactNode;
  /** Plugin `ui.slot.sidebarTop` output, pre-fetched by the route handler */
  sidebarTop?: ReactNode;
  /** Plugin `ui.slot.sidebarBottom` output, pre-fetched by the route handler */
  sidebarBottom?: ReactNode;
  /** Plugin `ui.slot.footerStart` output, pre-fetched by the route handler */
  footerStart?: ReactNode;
  /** Plugin `ui.slot.footerEnd` output, pre-fetched by the route handler */
  footerEnd?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PublisherLayout({
  siteName,
  siteLogo,
  lang,
  lp,
  navItems,
  activePath,
  sidebarData,
  showSidebar = true,
  supportsDarkMode = false,
  hidePoweredBy,
  footerText,
  headerRight,
  sidebarTop,
  sidebarBottom,
  footerStart,
  footerEnd,
  children,
  className,
}: PublisherLayoutProps) {
  const homeHref = lp === '' ? '/' : lp;
  const searchAction = `${lp}/search`;
  const searchPlaceholder = lang === 'tr' ? 'Ara…' : 'Search…';
  const hasSidebarWidgets = (sidebarData.widgets?.length ?? 0) > 0;
  const hasSidebarSlotContent = sidebarTop != null || sidebarBottom != null;
  const renderSidebar = showSidebar && (hasSidebarWidgets || hasSidebarSlotContent);

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-background text-foreground',
        className
      )}
    >
      <Header
        siteName={siteName}
        siteLogo={siteLogo}
        homeHref={homeHref}
        searchAction={searchAction}
        searchPlaceholder={searchPlaceholder}
        navItems={navItems}
        activePath={activePath}
        supportsDarkMode={supportsDarkMode}
        headerRight={headerRight}
      />

      <main className="flex-1 py-10 md:py-14">
        <Container size="xl">
          <div
            className={cn(
              'grid items-start gap-10',
              renderSidebar
                ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]'
                : 'grid-cols-1'
            )}
          >
            <div className="min-w-0">{children}</div>
            {renderSidebar ? (
              <Sidebar
                widgets={sidebarData.widgets}
                sidebarData={sidebarData}
                lang={lang}
                lp={lp}
                sidebarTop={sidebarTop}
                sidebarBottom={sidebarBottom}
              />
            ) : null}
          </div>
        </Container>
      </main>

      <Footer
        siteName={siteName}
        sidebarData={sidebarData}
        lang={lang}
        lp={lp}
        hidePoweredBy={hidePoweredBy}
        footerText={footerText}
        footerStart={footerStart}
        footerEnd={footerEnd}
      />
    </div>
  );
}
