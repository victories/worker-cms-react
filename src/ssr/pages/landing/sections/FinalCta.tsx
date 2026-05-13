import { Container } from '@ui/container';
import { Button } from '@ui/button';
import type { LandingConfig } from '../Landing';
import { SectionTheme } from '../components/SectionTheme';
import { Icon } from '../components/Icon';

interface FinalCtaProps {
  cta: NonNullable<LandingConfig['cta']>;
  footer: NonNullable<LandingConfig['footer']>;
}

export function FinalCta({ cta, footer }: FinalCtaProps) {
  return (
    <>
      {cta.title || cta.button_text ? (
        <SectionTheme theme="dark" className="overflow-hidden py-24 sm:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <Container size="xl" className="relative text-center">
            {cta.title ? (
              <h2 className="font-heading mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                {cta.title}
              </h2>
            ) : null}
            {cta.subtitle ? (
              <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
                {cta.subtitle}
              </p>
            ) : null}
            {cta.button_text ? (
              <div className="mt-10">
                <Button asChild size="lg" className="group">
                  <a href={cta.button_url || '#'}>
                    {cta.button_text}
                    <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Button>
              </div>
            ) : null}
          </Container>
        </SectionTheme>
      ) : null}

      <footer className="border-t border-border/40 py-8">
        <Container size="xl">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
            {footer.text ? <div>{footer.text}</div> : <div />}
            {footer.links && footer.links.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {footer.links.map((l, i) => (
                  <a key={i} href={l.url} className="transition-colors hover:text-foreground">
                    {l.text}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </Container>
      </footer>
    </>
  );
}
