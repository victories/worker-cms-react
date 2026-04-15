import type { ReactNode } from 'react';
import { Container } from '@ui/container';
import { Separator } from '@ui/separator';
import { cn } from '@ui/lib/utils';
import type { SidebarData, SidebarWidget } from '../../lib/public-db';
import { WidgetRenderer } from './WidgetRenderer';

/**
 * Footer — publisher site bottom region.
 *
 * Layout (bottom-up):
 *   1. Footer widget grid (footer-1, footer-2, footer-3 — footer-4 has
 *      schema but no admin UI; admin only surfaces three columns).
 *   2. Separator
 *   3. Bottom bar: copyright + "Powered by WP-Worker" (unless the site
 *      disables it via the white-label toggle).
 *
 * Widget columns use the `bare` variant of `<WidgetRenderer>` — i.e.
 * widgets in the footer don't get their own Card chrome; the whole
 * footer already sits on a muted background.
 */

export interface FooterProps {
  siteName: string;
  sidebarData: SidebarData;
  lang: string;
  lp: string;
  /** Hide the "Powered by WP-Worker" line when the site is white-labelled */
  hidePoweredBy?: boolean;
  /** Optional body text under the copyright line (set in theme settings) */
  footerText?: string;
  /** Plugin `ui.slot.footerStart` output, rendered above the widget grid */
  footerStart?: ReactNode;
  /** Plugin `ui.slot.footerEnd` output, rendered below the copyright line */
  footerEnd?: ReactNode;
  className?: string;
}

const FOOTER_AREAS = ['footer-1', 'footer-2', 'footer-3'] as const;
type FooterArea = (typeof FOOTER_AREAS)[number];

export function Footer({
  siteName,
  sidebarData,
  lang,
  lp,
  hidePoweredBy,
  footerText,
  footerStart,
  footerEnd,
  className,
}: FooterProps) {
  const columns: Record<FooterArea, SidebarWidget[]> = {
    'footer-1': sidebarData.footerWidgets['footer-1'] ?? [],
    'footer-2': sidebarData.footerWidgets['footer-2'] ?? [],
    'footer-3': sidebarData.footerWidgets['footer-3'] ?? [],
  };
  const populated = FOOTER_AREAS.filter((a) => columns[a].length > 0);
  const hasWidgets = populated.length > 0;
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'mt-20 border-t border-border bg-muted/30 text-foreground',
        className
      )}
    >
      <Container size="xl" className="py-12">
        {footerStart != null ? <div className="mb-8">{footerStart}</div> : null}
        {hasWidgets ? (
          <>
            <div
              className={cn(
                'grid gap-10',
                populated.length === 1 && 'grid-cols-1',
                populated.length === 2 && 'grid-cols-1 md:grid-cols-2',
                populated.length === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              )}
            >
              {populated.map((area) => (
                <div key={area} className="flex flex-col gap-4">
                  {columns[area].map((widget) => (
                    <WidgetRenderer
                      key={widget.id}
                      widget={widget}
                      sidebarData={sidebarData}
                      lang={lang}
                      lp={lp}
                      variant="bare"
                    />
                  ))}
                </div>
              ))}
            </div>
            <Separator className="my-8" />
          </>
        ) : null}

        <div className="flex flex-col items-start justify-between gap-4 text-sm text-muted-foreground md:flex-row md:items-center">
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
        </div>

        {footerEnd != null ? <div className="mt-8">{footerEnd}</div> : null}
      </Container>
    </footer>
  );
}
