import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface MigrationStripProps {
  migration: NonNullable<LandingConfig['migration']>;
}

export function MigrationStrip({ migration }: MigrationStripProps) {
  const steps = migration.steps ?? [];
  if (steps.length === 0) return null;

  return (
    <section className="border-t border-border/40 py-20 sm:py-24">
      <Container size="xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          {migration.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {migration.title}
            </h2>
          ) : null}
          {migration.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {migration.subtitle}
            </p>
          ) : null}
        </div>

        <ol className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={i}
              data-reveal=""
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <Card className="h-full border-border/60 transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-4 p-7">
                  <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name={step.icon ?? 'arrow'} className="size-6" />
                  </div>
                  <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {step.label}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
