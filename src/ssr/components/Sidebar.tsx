import type { ReactNode } from 'react';
import { cn } from '@ui/lib/utils';
import type { SidebarData, SidebarWidget } from '../../lib/public-db';
import { WidgetRenderer } from './WidgetRenderer';

/**
 * Sidebar — right column on post/archive/home pages. Renders sidebar
 * widgets as a sticky vertical stack, with optional plugin slot content
 * above and below the widget list.
 *
 * Returns `null` only when there are no widgets *and* no plugin slot
 * content to render — PublisherLayout can then drop the column and the
 * main area stretches the full width.
 */

export interface SidebarProps {
  widgets: SidebarWidget[];
  sidebarData: SidebarData;
  lang: string;
  lp: string;
  /** Plugin `ui.slot.sidebarTop` output, pre-fetched by the route handler */
  sidebarTop?: ReactNode;
  /** Plugin `ui.slot.sidebarBottom` output, pre-fetched by the route handler */
  sidebarBottom?: ReactNode;
  className?: string;
}

export function Sidebar({
  widgets,
  sidebarData,
  lang,
  lp,
  sidebarTop,
  sidebarBottom,
  className,
}: SidebarProps) {
  const hasWidgets = widgets && widgets.length > 0;
  const hasTop = sidebarTop != null;
  const hasBottom = sidebarBottom != null;
  if (!hasWidgets && !hasTop && !hasBottom) return null;

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'flex w-full flex-col gap-6 lg:sticky lg:top-24 lg:w-[320px] lg:shrink-0',
        className
      )}
    >
      {hasTop ? sidebarTop : null}
      {hasWidgets
        ? widgets.map((widget) => (
            <WidgetRenderer
              key={widget.id}
              widget={widget}
              sidebarData={sidebarData}
              lang={lang}
              lp={lp}
              variant="card"
            />
          ))
        : null}
      {hasBottom ? sidebarBottom : null}
    </aside>
  );
}
