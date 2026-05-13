import { Container } from '@ui/container';
import type { LandingConfig } from '../Landing';

interface FaqProps {
  faq: NonNullable<LandingConfig['faq']>;
}

export function Faq({ faq }: FaqProps) {
  const items = faq.items ?? [];
  if (items.length === 0) return null;

  return (
    <section id="faq" className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {faq.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {faq.title}
            </h2>
          ) : null}
          {faq.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {faq.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-border/60">
          {items.map((item, i) => (
            <details
              key={i}
              className="faq-item group py-5"
              open={i === 0 ? true : undefined}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span
                  className="faq-marker mt-1 inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="faq-body">
                <div>
                  <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
