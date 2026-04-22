import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@ui/lib/utils';

export interface SidebarRowProps {
  label: string;
  /** Current selection summary — large text under the label. */
  value: string;
  /** Small indicator on the right (color dot, Aa, number, etc.). */
  indicator?: ReactNode;
  active?: boolean;
  onClick(): void;
}

/**
 * Compact sidebar row mimicking shadcn/ui's Create page layout:
 * small label on top, current value prominent below, and a tiny
 * indicator on the right. Clicking toggles an adjacent edit panel
 * rendered by the parent — this component is purely the trigger.
 */
export function SidebarRow({ label, value, indicator, active, onClick }: SidebarRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-primary/60 bg-primary/5'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
      {indicator ? (
        <div className="flex items-center gap-2 shrink-0">{indicator}</div>
      ) : null}
      <ChevronRight
        className={cn(
          'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
          active && 'rotate-90 text-primary',
        )}
      />
    </button>
  );
}
