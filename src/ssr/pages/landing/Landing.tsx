import type { LandingConfig as LegacyLandingConfig } from '../Landing';
import {
  Nav as LegacyNav,
  Pricing as LegacyPricing,
  Testimonials as LegacyTestimonials,
  CTABand as LegacyCTABand,
  LandingFooter as LegacyLandingFooter,
} from '../Landing';
import { Hero } from './sections/Hero';
import { MigrationStrip } from './sections/MigrationStrip';
import { Features } from './sections/Features';

export type {
  LandingConfig,
  LandingMigrationStep,
  LandingCostRow,
  LandingMultisiteSite,
  LandingFaqItem,
} from '../Landing';

export interface LandingProps {
  config: LegacyLandingConfig;
}

/**
 * Compose-only entry. The legacy `Landing` component is no longer used
 * as a black box — instead we import its individual section components
 * by name and rebuild the page composition explicitly with the new
 * Hero substituted at the top of `<main>`.
 *
 * As subsequent tasks land (5: Migration strip, 6: Features,
 * 7: CostCompare, 8: MultiSite, 9: Pricing+Testimonials+FinalCta,
 * 10: Nav, 11: FAQ), each `Legacy*` import is replaced one at a time.
 */
export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'WorkerCms';
  const hero = config.hero ?? {};
  const pricing = config.pricing ?? {};
  const testimonials = config.testimonials ?? {};
  const cta = config.cta ?? {};
  const footer = config.footer ?? {};

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased [scroll-behavior:smooth]">
      <LegacyNav brandName={brandName} />
      <main className="flex-1">
        <Hero hero={hero} brandName={brandName} />
        {config.migration ? <MigrationStrip migration={config.migration} /> : null}
        {config.features ? <Features features={config.features} /> : null}
        {/* Sections below come from legacy until each is migrated in tasks 5-11 */}
        <LegacyPricing pricing={pricing} />
        <LegacyTestimonials testimonials={testimonials} />
        <LegacyCTABand cta={cta} />
      </main>
      <LegacyLandingFooter footer={footer} />
    </div>
  );
}
