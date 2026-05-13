import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface PricingProps {
  pricing: NonNullable<LandingConfig['pricing']>;
  labels?: LandingConfig['labels'];
}

export function Pricing({ pricing, labels }: PricingProps) {
  const plans = pricing.plans ?? [];
  if (plans.length === 0) return null;
  const popularLabel = labels?.pricing?.popular_badge ?? 'Popüler';

  return (
    <section id="pricing" className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {pricing.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {pricing.title}
            </h2>
          ) : null}
          {pricing.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {pricing.subtitle}
            </p>
          ) : null}
        </div>

        <div className={cn(
          'mx-auto grid gap-6',
          plans.length === 1 && 'max-w-md grid-cols-1',
          plans.length === 2 && 'max-w-3xl grid-cols-1 md:grid-cols-2',
          plans.length === 3 && 'max-w-5xl grid-cols-1 md:grid-cols-3',
          plans.length >= 4 && 'max-w-6xl grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}>
          {plans.map((plan, i) => (
            <Card
              key={i}
              data-reveal=""
              className={cn(
                'flex flex-col',
                plan.isEnterprise && 'border-2 border-dashed border-border/60 bg-transparent',
                plan.highlighted && !plan.isEnterprise && 'border-2 border-primary bg-primary/5 shadow-lg lg:scale-[1.03]',
                !plan.highlighted && !plan.isEnterprise && 'border-border/60'
              )}
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <CardContent className="flex flex-1 flex-col gap-4 p-8">
                {plan.isEnterprise ? (
                  <div className="inline-flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="building" className="size-7" />
                  </div>
                ) : plan.highlighted ? (
                  <Badge className="w-fit text-[10px] uppercase tracking-wider">
                    {popularLabel}
                  </Badge>
                ) : null}

                <div>
                  <h3 className="font-heading text-xl font-semibold">{plan.name}</h3>
                  {plan.desc ? (
                    <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  ) : null}
                </div>

                {!plan.isEnterprise ? (
                  <div className="flex items-baseline gap-1">
                    {plan.currency ? (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {plan.currency}
                      </span>
                    ) : null}
                    <span className="font-heading font-mono text-5xl font-bold tracking-tight tabular-nums">
                      {plan.price ?? ''}
                    </span>
                    {plan.period ? (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    ) : null}
                  </div>
                ) : null}

                {plan.features && plan.features.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-3">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto pt-4">
                  <Button
                    asChild
                    variant={plan.isEnterprise ? 'outline' : plan.highlighted ? 'default' : 'outline'}
                    className="w-full"
                  >
                    <a href={plan.cta_url || '#'}>{plan.cta_text || (plan.isEnterprise ? 'İletişim' : 'Seç')}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
