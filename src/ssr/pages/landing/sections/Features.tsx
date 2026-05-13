import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface FeaturesProps {
  features: NonNullable<LandingConfig['features']>;
}

export function Features({ features }: FeaturesProps) {
  const items = features.items ?? [];
  if (items.length === 0) return null;

  // Middle card index — for 6 items, index 2 is the third card (visual
  // centre on a 3-column desktop grid). Highlight as anchor feature.
  const accentIndex = Math.floor((items.length - 1) / 2);

  return (
    <section
      id="features"
      className="border-t border-border/40 bg-muted/30 py-24 sm:py-28"
    >
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {features.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {features.title}
            </h2>
          ) : null}
          {features.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {features.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((f, i) => (
            <Card
              key={i}
              data-reveal=""
              className={cn(
                'group relative overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
                i === accentIndex && 'border-primary/40 bg-primary/5'
              )}
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <CardContent className="flex h-full flex-col gap-4 p-8">
                <div
                  className={cn(
                    'inline-flex size-12 items-center justify-center rounded-xl',
                    i === accentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon name={f.icon ?? 'zap'} className="size-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold leading-tight">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
