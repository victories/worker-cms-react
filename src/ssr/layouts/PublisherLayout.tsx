import type { ReactNode } from 'react';
import { Container } from '@ui/container';
import { cn } from '@ui/lib/utils';
import type { NavMenuItem } from '@ui/nav-menu';
import type { SidebarData } from '../../lib/public-db';
import type { ActiveDesign } from '../../lib/themes/types';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Sidebar } from '../components/Sidebar';
import { RegionRenderer } from '../components/RegionRenderer';
import type { SlotContext } from '../slots';

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
  /**
   * Resolved Theme Studio design — when supplied (and `isDefault` is
   * false), the renderer walks `design.layoutConfig.{header,body,footer}`
   * via `<RegionRenderer>` instead of using the legacy Header/Sidebar
   * /Footer trio. Falls back to the legacy layout when omitted or when
   * the design row is still synthesised defaults.
   */
  design?: ActiveDesign | null;
  /** Pre-rendered shortcode HTML keyed by raw shortcode string —
   *  threaded straight into SlotContext.shortcodeOutputs so the
   *  `widget:shortcode` slot can emit HTML synchronously. */
  shortcodeOutputs?: Record<string, string>;
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
  design,
  shortcodeOutputs,
  children,
  className,
}: PublisherLayoutProps) {
  const homeHref = lp === '' ? '/' : lp;
  const searchAction = `${lp}/search`;
  const searchPlaceholder = lang === 'tr' ? 'Ara…' : 'Search…';
  const hasSidebarWidgets = (sidebarData.widgets?.length ?? 0) > 0;
  const hasSidebarSlotContent = sidebarTop != null || sidebarBottom != null;
  const renderSidebar = showSidebar && (hasSidebarWidgets || hasSidebarSlotContent);

  // Theme Studio design path — render header/body/footer via region tree
  // when the site has saved a design row (i.e. not synthesised defaults).
  if (design && design.layoutConfig && !design.isDefault) {
    const ctx: SlotContext = {
      siteName,
      siteLogo,
      lang,
      lp,
      navItems,
      activePath,
      sidebarData,
      homeHref,
      searchAction,
      searchPlaceholder,
      supportsDarkMode,
      children,
      headerRight,
      sidebarTop,
      sidebarBottom,
      shortcodeOutputs,
    };
    const year = new Date().getFullYear();
    return (
      <div
        className={cn(
          'flex min-h-screen flex-col bg-background text-foreground',
          className
        )}
      >
        <RegionRenderer as="header" config={design.layoutConfig.header} ctx={ctx} />
        <RegionRenderer as="div" config={design.layoutConfig.body} ctx={ctx} className="flex-1" />
        <RegionRenderer as="footer" config={design.layoutConfig.footer} ctx={ctx} />
        <div className="border-t border-border bg-muted/30">
          <Container size="xl" className="py-4">
            <div className="flex flex-col items-start justify-between gap-2 text-sm text-muted-foreground md:flex-row md:items-center">
              <div className="flex flex-col gap-1">
                <p>
                  © {year} {siteName}.{' '}
                  {lang === 'tr' ? 'Tüm hakları saklıdır.' : 'All rights reserved.'}
                  {hidePoweredBy ? null : (
                    <>
                      {' · '}
                      <span>Powered by WP-Worker</span>
                    </>
                  )}
                </p>
                {footerText ? (
                  <p className="text-xs text-muted-foreground/80">{footerText}</p>
                ) : null}
              </div>
              {footerEnd}
            </div>
          </Container>
        </div>
      </div>
    );
  }

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
