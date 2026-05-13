import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import { Badge } from '@ui/badge';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';

interface CostCompareProps {
  costCompare: NonNullable<LandingConfig['costCompare']>;
}

export function CostCompare({ costCompare }: CostCompareProps) {
  const rows = costCompare.rows ?? [];
  if (rows.length === 0) return null;
  const total = rows.find(r => r.saving) ?? rows[rows.length - 1];

  return (
    <section className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {costCompare.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {costCompare.title}
            </h2>
          ) : null}
          {costCompare.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {costCompare.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* BEFORE */}
          <Card data-reveal="" className="border-destructive/30">
            <CardContent className="p-7">
              <div className="mb-5 text-xs font-mono uppercase tracking-[0.12em] text-destructive">
                {costCompare.before_label || 'Before'}
              </div>
              <ul className="flex flex-col divide-y divide-border/60">
                {rows.map((r, i) => (
                  <li key={i} className={cn(
                    'flex items-baseline justify-between py-3',
                    r === total && 'pt-5 mt-2 border-t-2 border-destructive/40 font-semibold'
                  )}>
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="font-mono tabular-nums text-foreground">{r.before}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* AFTER */}
          <Card
            data-reveal=""
            className="border-emerald-500/30 bg-emerald-500/[0.03]"
            style={{ transitionDelay: '120ms' }}
          >
            <CardContent className="p-7">
              <div className="mb-5 flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                  {costCompare.after_label || 'After'}
                </div>
                {total.saving ? (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                    {total.saving}
                  </Badge>
                ) : null}
              </div>
              <ul className="flex flex-col divide-y divide-border/60">
                {rows.map((r, i) => (
                  <li key={i} className={cn(
                    'flex items-baseline justify-between py-3',
                    r === total && 'pt-5 mt-2 border-t-2 border-emerald-500/40 font-semibold'
                  )}>
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="font-mono tabular-nums text-foreground">{r.after}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {costCompare.footnote ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
            {costCompare.footnote}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
