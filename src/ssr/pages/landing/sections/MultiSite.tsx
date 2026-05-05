import { Container } from '@ui/container';
import type { LandingConfig } from '../Landing';
import { DashboardMock } from '../components/DashboardMock';
import { Icon } from '../components/Icon';

interface MultiSiteProps {
  multisite: NonNullable<LandingConfig['multisite']>;
}

export function MultiSite({ multisite }: MultiSiteProps) {
  const sites = multisite.dashboard?.sites ?? [];
  const bullets = multisite.bullets ?? [];

  return (
    <section className="border-t border-border/40 bg-muted/30 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div data-reveal="">
            {multisite.title ? (
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {multisite.title}
              </h2>
            ) : null}
            {multisite.subtitle ? (
              <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
                {multisite.subtitle}
              </p>
            ) : null}
            {bullets.length > 0 ? (
              <ul className="mt-8 flex flex-col gap-3">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {sites.length > 0 ? (
            <div
              data-reveal=""
              style={{ transitionDelay: '160ms' }}
            >
              <DashboardMock sites={sites} />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
