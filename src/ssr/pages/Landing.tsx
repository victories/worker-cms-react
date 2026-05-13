import type { ReactNode } from 'react';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Badge } from '@ui/badge';
import { Container } from '@ui/container';
import { cn } from '@ui/lib/utils';
import { legalFooterLinks } from '../../lib/legal-pages';

/**
 * Landing — React SSR port of the marketing page served at `/landing`.
 *
 * The old handler (`src/routes/public/landing.tsx`) produced a huge
 * hand-rolled HTML string with inline CSS. This component rebuilds the
 * same visual with shadcn primitives + Tailwind utility classes so the
 * design stays consistent with the rest of the publisher site and so
 * dark/light mode flows through the shared `.dark` class on `<html>`.
 *
 * The `config` prop matches the existing `landing_config` JSON schema
 * stored in `global_settings.value`. The route handler keeps the same
 * DB loading + package merge logic — we just swap the render layer.
 *
 * ## Hydration contract
 * The only interactive element is a ThemeToggle in the nav. The rest
 * is 100% SSR'd static markup (anchors scroll-smooth via CSS, cards are
 * static, form-less CTAs are plain links). That means the landing
 * client bundle only needs to hydrate the theme toggle — see
 * `src/client/landing-entry.tsx`.
 *
 * ## Type safety
 * We keep the config type intentionally permissive (`LandingConfig`)
 * because users can save any shape via the admin JSON editor. Each
 * section guards its inputs so a missing field degrades gracefully
 * (empty stats grid, no pricing, no testimonials) instead of throwing.
 */

// ── Config shape ─────────────────────────────────────────────────────

export interface LandingStats {
  value: string;
  label: string;
}

export interface LandingFeatureItem {
  icon?: string;
  title: string;
  desc: string;
}

export interface LandingPricingPlan {
  name: string;
  desc?: string;
  currency?: string;
  price?: string | number;
  period?: string;
  features?: string[];
  cta_text?: string;
  cta_url?: string;
  highlighted?: boolean;
  isEnterprise?: boolean;
}

export interface LandingTestimonial {
  text: string;
  author?: string;
  role?: string;
}

export interface LandingFooterLink {
  text: string;
  url: string;
}

export interface LandingConfig {
  enabled?: boolean;
  brand?: { name?: string; tagline?: string };
  hero?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    cta_text?: string;
    cta_url?: string;
    secondary_cta_text?: string;
    secondary_cta_url?: string;
    stats?: LandingStats[];
  };
  features?: {
    title?: string;
    subtitle?: string;
    items?: LandingFeatureItem[];
  };
  pricing?: {
    title?: string;
    subtitle?: string;
    plans?: LandingPricingPlan[];
  };
  testimonials?: {
    title?: string;
    items?: LandingTestimonial[];
  };
  cta?: {
    title?: string;
    subtitle?: string;
    button_text?: string;
    button_url?: string;
  };
  footer?: {
    text?: string;
    links?: LandingFooterLink[];
  };
}

// ── Icon set ─────────────────────────────────────────────────────────

/**
 * Inline icon map — keeps the landing bundle free of a runtime icon
 * library. The old landing.tsx used the same named set; these are the
 * same SVG paths ported to JSX.
 */
const ICONS: Record<string, ReactNode> = {
  zap: <path d="M13 2 3 14h9l-1 10 10-12h-9l1-10z" />,
  layers: (
    <>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  bot: (
    <>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  quote: (
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </>
  ),
  arrow: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </>
  ),
};

interface IconProps {
  name: string;
  className?: string;
}

function Icon({ name, className }: IconProps) {
  const body = ICONS[name] ?? ICONS.zap;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-5', className)}
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

// ── Sub-sections ─────────────────────────────────────────────────────

interface NavProps {
  brandName: string;
}

function Nav({ brandName }: NavProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="xl" className="flex h-16 items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {brandName.charAt(0).toUpperCase() || 'W'}
          </span>
          <span className="font-heading text-lg">{brandName}</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href="#features"
            className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Özellikler
          </a>
          <a
            href="#pricing"
            className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Fiyatlar
          </a>
          <a
            href="/admin/login"
            className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Giriş Yap
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <span data-island="theme-toggle" className="contents">
            {/* SSR placeholder — hydrated by landing-entry.tsx.
                We render the SAME button the island renders so hydrate
                matches markup and there is no layout flash. */}
            <button
              type="button"
              aria-label="Toggle theme"
              className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 dark:hidden"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="hidden size-4 dark:inline"
                aria-hidden="true"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
          </span>
          <Button asChild size="sm">
            <a href="/admin/register">Ücretsiz Başla</a>
          </Button>
        </div>
      </Container>
    </header>
  );
}

interface HeroProps {
  hero: NonNullable<LandingConfig['hero']>;
}

function Hero({ hero }: HeroProps) {
  const title = hero.title ?? '';
  // Preserve authored line breaks — split on \n and render <br/>
  const titleLines = title.split('\n');

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-40 size-[600px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-20 size-[500px] rounded-full bg-destructive/10 blur-3xl"
      />
      {/* Decorative grid */}
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
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            {hero.badge}
          </Badge>
        ) : null}

        <h1 className="font-heading text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {titleLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>

        {hero.subtitle ? (
          <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            {hero.subtitle}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {hero.cta_text ? (
            <Button asChild size="lg">
              <a href={hero.cta_url || '#'}>
                {hero.cta_text}
                <Icon name="arrow" className="size-4" />
              </a>
            </Button>
          ) : null}
          {hero.secondary_cta_text ? (
            <Button asChild size="lg" variant="outline">
              <a href={hero.secondary_cta_url || '#'}>{hero.secondary_cta_text}</a>
            </Button>
          ) : null}
        </div>

        {hero.stats && hero.stats.length > 0 ? (
          <div className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
            {hero.stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  );
}

interface SectionHeaderProps {
  title?: string;
  subtitle?: string;
  inverted?: boolean;
}

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  if (!title && !subtitle) return null;
  return (
    <div className="mx-auto mb-16 max-w-2xl text-center">
      {title ? (
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="mt-4 text-balance text-muted-foreground sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}

interface FeaturesProps {
  features: NonNullable<LandingConfig['features']>;
}

function Features({ features }: FeaturesProps) {
  const items = features.items ?? [];
  if (items.length === 0) return null;
  return (
    <section id="features" className="border-t border-border/40 bg-muted/30 py-24 sm:py-28">
      <Container size="xl">
        <SectionHeader title={features.title} subtitle={features.subtitle} />
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((f, i) => (
            <Card
              key={i}
              className="group relative overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <CardContent className="flex flex-col gap-4 p-8">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

interface PricingProps {
  pricing: NonNullable<LandingConfig['pricing']>;
}

function Pricing({ pricing }: PricingProps) {
  const plans = pricing.plans ?? [];
  if (plans.length === 0) return null;
  return (
    <section id="pricing" className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <SectionHeader title={pricing.title} subtitle={pricing.subtitle} />
        <div
          className={cn(
            'mx-auto grid gap-6',
            plans.length === 1 && 'max-w-md grid-cols-1',
            plans.length === 2 && 'max-w-3xl grid-cols-1 md:grid-cols-2',
            plans.length === 3 && 'max-w-5xl grid-cols-1 md:grid-cols-3',
            plans.length >= 4 &&
              'max-w-6xl grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          )}
        >
          {plans.map((plan, i) =>
            plan.isEnterprise ? (
              <Card
                key={i}
                className="flex flex-col border-2 border-dashed border-border/60 bg-transparent"
              >
                <CardContent className="flex flex-1 flex-col gap-4 p-8">
                  <div className="inline-flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="building" className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-semibold">
                      {plan.name}
                    </h3>
                    {plan.desc ? (
                      <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                    ) : null}
                  </div>
                  {plan.features && plan.features.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-3">
                      {plan.features.map((f, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Icon
                            name="check"
                            className="mt-0.5 size-4 shrink-0 text-primary"
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-auto pt-4">
                    <Button asChild variant="outline" className="w-full">
                      <a href={plan.cta_url || '#'}>{plan.cta_text || 'İletişim'}</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card
                key={i}
                className={cn(
                  'flex flex-col',
                  plan.highlighted
                    ? 'border-2 border-primary bg-primary/5 shadow-lg lg:scale-[1.03]'
                    : 'border-border/60'
                )}
              >
                <CardContent className="flex flex-1 flex-col gap-4 p-8">
                  {plan.highlighted ? (
                    <Badge className="w-fit text-[10px] uppercase tracking-wider">
                      Popüler
                    </Badge>
                  ) : null}
                  <div>
                    <h3 className="font-heading text-xl font-semibold">{plan.name}</h3>
                    {plan.desc ? (
                      <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                    ) : null}
                  </div>
                  <div className="flex items-baseline gap-1">
                    {plan.currency ? (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {plan.currency}
                      </span>
                    ) : null}
                    <span className="font-heading text-5xl font-extrabold tracking-tight">
                      {plan.price ?? ''}
                    </span>
                    {plan.period ? (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    ) : null}
                  </div>
                  {plan.features && plan.features.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-3">
                      {plan.features.map((f, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Icon
                            name="check"
                            className="mt-0.5 size-4 shrink-0 text-primary"
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-auto pt-4">
                    <Button
                      asChild
                      variant={plan.highlighted ? 'default' : 'outline'}
                      className="w-full"
                    >
                      <a href={plan.cta_url || '#'}>{plan.cta_text || 'Seç'}</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </Container>
    </section>
  );
}

interface TestimonialsProps {
  testimonials: NonNullable<LandingConfig['testimonials']>;
}

function Testimonials({ testimonials }: TestimonialsProps) {
  const items = testimonials.items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="border-t border-border/40 bg-muted/30 py-24 sm:py-28">
      <Container size="xl">
        <SectionHeader title={testimonials.title} />
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => {
            const initial = (t.author || 'A').charAt(0).toUpperCase();
            return (
              <Card key={i} className="border-border/60">
                <CardContent className="flex flex-col gap-5 p-8">
                  <Icon name="quote" className="size-7 text-primary/50" />
                  <blockquote className="text-sm italic leading-relaxed text-foreground/80">
                    {t.text}
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-destructive text-sm font-semibold text-primary-foreground">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {t.author}
                      </div>
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

interface CTAProps {
  cta: NonNullable<LandingConfig['cta']>;
}

function CTABand({ cta }: CTAProps) {
  if (!cta.title && !cta.button_text) return null;
  return (
    <section className="relative overflow-hidden border-t border-border/40 py-24 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <Container size="xl" className="relative text-center">
        {cta.title ? (
          <h2 className="font-heading mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
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
            <Button asChild size="lg" variant="destructive">
              <a href={cta.button_url || '#'}>
                {cta.button_text}
                <Icon name="arrow" className="size-4" />
              </a>
            </Button>
          </div>
        ) : null}
      </Container>
    </section>
  );
}

interface LandingFooterProps {
  footer: NonNullable<LandingConfig['footer']>;
  brandName: string;
}

function LandingFooter({ footer, brandName }: LandingFooterProps) {
  // Fall back to the platform-default legal links when the admin hasn't
  // configured any. The eight default pages cover privacy, terms, KVKK,
  // distance sales, refunds, cookies, status, and contact — the minimum
  // a credit-card-accepting site needs under Turkish consumer law.
  const links = footer.links && footer.links.length > 0
    ? footer.links
    : legalFooterLinks('tr');
  const text = footer.text || `© ${new Date().getFullYear()} ${brandName}. Tüm hakları saklıdır.`;
  return (
    <footer className="border-t border-border/40 py-8">
      <Container size="xl">
        <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <div>{text}</div>
          <div className="flex flex-wrap gap-6">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                className="transition-colors hover:text-foreground"
              >
                {l.text}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}

// ── Page root ────────────────────────────────────────────────────────

export interface LandingProps {
  config: LandingConfig;
}

export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'WorkerCms';
  const hero = config.hero ?? {};
  const features = config.features ?? {};
  const pricing = config.pricing ?? {};
  const testimonials = config.testimonials ?? {};
  const cta = config.cta ?? {};
  const footer = config.footer ?? {};

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased [scroll-behavior:smooth]">
      <Nav brandName={brandName} />
      <main className="flex-1">
        <Hero hero={hero} />
        <Features features={features} />
        <Pricing pricing={pricing} />
        <Testimonials testimonials={testimonials} />
        <CTABand cta={cta} />
      </main>
      <LandingFooter footer={footer} brandName={brandName} />
    </div>
  );
}
