import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@ui/lib/utils';

export interface TokenSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Collapsible accordion section used to group related tokens (colors,
 * typography, radius, …) inside the Style Editor. Plain
 * `useState`-based; we intentionally don't pull in @radix-ui/accordion
 * to keep the admin bundle small for this surface.
 */
export function TokenSection({ title, description, defaultOpen = false, children }: TokenSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          {description ? (
            <div className="text-[11px] text-muted-foreground">{description}</div>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open ? 'rotate-180' : ''
          )}
        />
      </button>
      {open ? <div className="border-t border-border p-3 space-y-3">{children}</div> : null}
    </div>
  );
}
