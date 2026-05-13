import { cn } from '@ui/lib/utils';
import type { LandingMultisiteSite } from '../Landing';
import { Icon } from './Icon';

interface DashboardMockProps {
  sites: LandingMultisiteSite[];
}

const STATUS_DOT: Record<NonNullable<LandingMultisiteSite['status']>, string> = {
  live: 'bg-emerald-500',
  draft: 'bg-amber-500',
  error: 'bg-destructive',
};

const STATUS_LABEL: Record<NonNullable<LandingMultisiteSite['status']>, string> = {
  live: 'Yayında',
  draft: 'Taslak',
  error: 'Hata',
};

/**
 * Pure CSS+SVG mock of an admin dashboard. No screenshots, no R2
 * dependency. The visual is intentionally simple: a chrome bar, a
 * site list with status dots and visit counts. Designed to look like
 * a screenshot at small size, not pretend to be one at large size.
 */
export function DashboardMock({ sites }: DashboardMockProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/40 px-4 py-2.5">
        <span className="size-3 rounded-full bg-destructive/40" aria-hidden />
        <span className="size-3 rounded-full bg-amber-400/40" aria-hidden />
        <span className="size-3 rounded-full bg-emerald-500/40" aria-hidden />
        <div className="ml-3 flex-1 text-center font-mono text-xs text-muted-foreground">
          admin.workercms.com
        </div>
      </div>

      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <Icon name="layers" className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold">Tüm siteler</span>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
          {sites.length} site
        </span>
      </div>

      {/* Site rows */}
      <ul className="divide-y divide-border/40">
        {sites.map((s, i) => {
          const status = s.status ?? 'live';
          return (
            <li
              key={i}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className={cn('size-2 rounded-full', STATUS_DOT[status])} aria-hidden />
                <span className="font-mono text-sm text-foreground">{s.name}</span>
              </div>
              <div className="flex items-center gap-4">
                {s.visits ? (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {s.visits} ziyaret
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
