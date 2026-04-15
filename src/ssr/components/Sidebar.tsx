/** @jsxImportSource react */
import { cn } from '@ui/lib/utils';
import type { SidebarData, SidebarWidget } from '../../lib/public-db';
import { WidgetRenderer } from './WidgetRenderer';

/**
 * Sidebar — right column on post/archive/home pages. Renders sidebar
 * widgets as a sticky vertical stack.
 *
 * Returns `null` when the site has no sidebar widgets configured, so
 * PublisherLayout can simply drop the column and the main area
 * stretches the full width. No empty 340px gap.
 */

export interface SidebarProps {
  widgets: SidebarWidget[];
  sidebarData: SidebarData;
  lang: string;
  lp: string;
  className?: string;
}

export function Sidebar({
  widgets,
  sidebarData,
  lang,
  lp,
  className,
}: SidebarProps) {
  if (!widgets || widgets.length === 0) return null;

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        'flex w-full flex-col gap-6 lg:sticky lg:top-24 lg:w-[320px] lg:shrink-0',
        className
      )}
    >
      {widgets.map((widget) => (
        <WidgetRenderer
          key={widget.id}
          widget={widget}
          sidebarData={sidebarData}
          lang={lang}
          lp={lp}
          variant="card"
        />
      ))}
    </aside>
  );
}
