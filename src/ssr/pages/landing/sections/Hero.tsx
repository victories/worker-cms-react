import { Container } from '@ui/container';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import type { LandingConfig } from '../Landing';
import { SectionTheme } from '../components/SectionTheme';
import { AnimatedWordmark } from '../components/AnimatedWordmark';
import { Icon } from '../components/Icon';

interface HeroProps {
  hero: NonNullable<LandingConfig['hero']>;
  brandName: string;
}

export function Hero({ hero, brandName }: HeroProps) {
  const titleLines = (hero.title ?? '').split('\n');
  const stats = hero.stats ?? [];

  return (
    <SectionTheme theme="dark" className="overflow-hidden py-24 sm:py-32">
      {/* Ambient blobs — static, hero-only motion budget reserved for wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 size-[640px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-[-12rem] size-[520px] rounded-full bg-emerald-500/10 blur-3xl"
      />
      {/* Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] bg-[linear-gradient(to_right,theme(colors.border/0.4)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.4)_1px,transparent_1px)] bg-[size:64px_64px]"
      />

      <Container size="xl" className="relative flex flex-col items-center text-center">
        {hero.badge ? (
          <Badge
            variant="secondary"
            className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium"
          >
            <span className="size-2 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
            {hero.badge}
          </Badge>
        ) : null}

        {/* Animated wordmark — replaces brandName in hero only */}
        <div className="mb-6 sm:mb-8">
          <AnimatedWordmark
            text={brandName}
            className="text-5xl sm:text-7xl lg:text-[7rem] leading-none font-bold"
          />
        </div>

        <h1 className="font-heading max-w-3xl text-balance text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {titleLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>

        {hero.subtitle ? (
          <p
            data-reveal=""
            className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ transitionDelay: '180ms' }}
          >
            {hero.subtitle}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {hero.cta_text ? (
            <Button asChild size="lg" className="group">
              <a href={hero.cta_url || '#'}>
                {hero.cta_text}
                <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
          ) : null}
          {hero.secondary_cta_text ? (
            <Button asChild size="lg" variant="outline">
              <a href={hero.secondary_cta_url || '#'}>{hero.secondary_cta_text}</a>
            </Button>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={i}
                data-reveal=""
                className="flex flex-col items-center"
                style={{ transitionDelay: `${280 + i * 60}ms` }}
              >
                <div className="font-heading font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Container>
    </SectionTheme>
  );
}
