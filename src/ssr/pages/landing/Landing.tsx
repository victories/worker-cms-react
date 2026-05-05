import { Nav } from './sections/Nav';
import { Hero } from './sections/Hero';
import { MigrationStrip } from './sections/MigrationStrip';
import { Features } from './sections/Features';
import { CostCompare } from './sections/CostCompare';
import { MultiSite } from './sections/MultiSite';
import { Pricing } from './sections/Pricing';
import { Testimonials } from './sections/Testimonials';
import { Faq } from './sections/Faq';
import { FinalCta } from './sections/FinalCta';

// ── Config types ─────────────────────────────────────────────────────

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

export interface LandingMigrationStep {
  label: string;
  desc: string;
  icon?: string;
}

export interface LandingCostRow {
  label: string;
  before: string;
  after: string;
  saving?: string;
}

export interface LandingMultisiteSite {
  name: string;
  visits?: string;
  status?: 'live' | 'draft' | 'error';
}

export interface LandingFaqItem {
  q: string;
  a: string;
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
  labels?: {
    nav?: { features?: string; pricing?: string; faq?: string;
            login?: string; cta?: string };
    pricing?: { popular_badge?: string; per_month_suffix?: string };
    common?: { learn_more?: string; get_started?: string };
  };
  migration?: {
    title?: string;
    subtitle?: string;
    steps?: LandingMigrationStep[];
  };
  costCompare?: {
    title?: string;
    subtitle?: string;
    before_label?: string;
    after_label?: string;
    rows?: LandingCostRow[];
    footnote?: string;
  };
  multisite?: {
    title?: string;
    subtitle?: string;
    bullets?: string[];
    dashboard?: { sites?: LandingMultisiteSite[] };
  };
  faq?: {
    title?: string;
    subtitle?: string;
    items?: LandingFaqItem[];
  };
}

// ── Page root ────────────────────────────────────────────────────────

export interface LandingProps {
  config: LandingConfig;
}

export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'WorkerCms';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased [scroll-behavior:smooth]">
      <Nav brandName={brandName} labels={config.labels} />
      <main className="flex-1">
        <Hero hero={config.hero ?? {}} brandName={brandName} />
        {config.migration ? <MigrationStrip migration={config.migration} /> : null}
        {config.features ? <Features features={config.features} /> : null}
        {config.costCompare ? <CostCompare costCompare={config.costCompare} /> : null}
        {config.multisite ? <MultiSite multisite={config.multisite} /> : null}
        {config.pricing ? <Pricing pricing={config.pricing} labels={config.labels} /> : null}
        {config.testimonials ? <Testimonials testimonials={config.testimonials} /> : null}
        {config.faq ? <Faq faq={config.faq} /> : null}
        <FinalCta cta={config.cta ?? {}} footer={config.footer ?? {}} />
      </main>
    </div>
  );
}
