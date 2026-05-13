import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface TestimonialsProps {
  testimonials: NonNullable<LandingConfig['testimonials']>;
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const items = testimonials.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border/40 bg-muted/30 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {testimonials.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {testimonials.title}
            </h2>
          ) : null}
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => {
            const initial = (t.author || 'A').charAt(0).toUpperCase();
            return (
              <Card
                key={i}
                data-reveal=""
                className="border-border/60"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <CardContent className="flex flex-col gap-5 p-8">
                  <Icon name="quote" className="size-7 text-primary/50" />
                  <blockquote className="text-sm italic leading-relaxed text-foreground/80">
                    {t.text}
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-sm font-semibold text-primary-foreground">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.author}</div>
                      {t.role ? (
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
