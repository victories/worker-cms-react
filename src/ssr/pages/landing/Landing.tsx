import type { LandingConfig as LegacyLandingConfig } from '../Landing';
import { Nav as LegacyNav } from '../Landing';
import { Hero } from './sections/Hero';
import { MigrationStrip } from './sections/MigrationStrip';
import { Features } from './sections/Features';
import { CostCompare } from './sections/CostCompare';
import { MultiSite } from './sections/MultiSite';
import { Pricing } from './sections/Pricing';
import { Testimonials } from './sections/Testimonials';
import { FinalCta } from './sections/FinalCta';

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
 * As subsequent tasks land (10: Nav, 11: FAQ, 13: Footer), each
 * `Legacy*` import is replaced one at a time. After Task 9 only
 * `LegacyNav` remains.
 */
export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'WorkerCms';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased [scroll-behavior:smooth]">
      <LegacyNav brandName={brandName} />
      <main className="flex-1">
        <Hero hero={config.hero ?? {}} brandName={brandName} />
        {config.migration ? <MigrationStrip migration={config.migration} /> : null}
        {config.features ? <Features features={config.features} /> : null}
        {config.costCompare ? <CostCompare costCompare={config.costCompare} /> : null}
        {config.multisite ? <MultiSite multisite={config.multisite} /> : null}
        {config.pricing ? <Pricing pricing={config.pricing} labels={config.labels} /> : null}
        {config.testimonials ? <Testimonials testimonials={config.testimonials} /> : null}
        {/* FAQ added in task 11 */}
        <FinalCta cta={config.cta ?? {}} footer={config.footer ?? {}} />
      </main>
    </div>
  );
}
