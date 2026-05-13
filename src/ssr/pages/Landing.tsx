import type { ReactNode } from 'react';
import { cn } from '@ui/lib/utils';

/**
 * Landing — React SSR port of the "Worker CMS Landing v2" marketing
 * page served at `/landing`.
 *
 * This file is the React port of the hand-rolled mock at
 * `Worker CMS Landing v2.html` (repo root). The visual language is
 * deliberately separate from the publisher / admin shadcn theme —
 * landing runs in a self-contained dark "ink" + amber accent palette
 * with Inter / Instrument Serif / JetBrains Mono fonts. To keep those
 * styles from leaking into the publisher build the entire tree renders
 * inside a `.landing-v2` wrapper; CSS in `public-styles/input.css`
 * scopes every custom selector to that class.
 *
 * The page is still SSR-only. Two tiny client islands live in
 * `src/client/landing-entry.tsx`: the nav theme toggle (preserved from
 * the previous version) and an IntersectionObserver that adds `.in`
 * to every `.reveal` element when it scrolls into view.
 *
 * ## Section map (vs. Worker CMS Landing v2.html)
 *
 *  Nav            → header at lines 103-129
 *  Hero           → lines 131-181 (glow + grid-dots + stats grid)
 *  Marquee        → lines 183-212 (value-prop strip)
 *  Architecture   → lines 214-325 (split with SVG diagram)
 *  Features       → lines 327-470 (6 cards + 4 mini-features)
 *  Mcp            → lines 472-554 (AI integration chat demo)
 *  Plugins        → lines 556-672 (built-ins + shortcodes)
 *  Pricing        → lines 674-748 (Starter / Pro / Enterprise, dynamic
 *                                  from `packages` DB table)
 *  Final CTA      → lines 750-758 (sits inside the pricing section in
 *                                  v2.html so we keep the same layout)
 *  Footer         → lines 762-817 (logo + 3 link columns + bottom bar)
 *
 * ## Config compatibility
 *
 * The `LandingConfig` interface preserves every field the legacy admin
 * form (`admin/src/pages/settings/LandingSettings.tsx`) writes — even
 * fields the v2 design no longer uses (testimonials, secondary CTA
 * URL, ...). They are read leniently and ignored. Pricing is still
 * driven by the active `packages` table and merged in by the route
 * handler before this component runs.
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

export interface LandingArchitectureBullet {
  text: string;
}

export interface LandingMcpStat {
  value: string;
  text: string;
}

export interface LandingPluginItem {
  title: string;
  desc: string;
  status?: 'aktif' | 'opsiyonel' | string;
  icon?: string;
}

export interface LandingShortcode {
  code: string;
  desc: string;
}

export interface LandingNavItem {
  label: string;
  url: string;
}

export interface LandingConfig {
  enabled?: boolean;
  brand?: { name?: string; tagline?: string };
  /** Top nav — admin-editable from /admin/settings/landing → Üst Menü. */
  nav?: {
    items?: LandingNavItem[];
    login_text?: string;
    login_url?: string;
    cta_text?: string;
    cta_url?: string;
  };
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
  /** Looping value-prop strip rendered between Hero and Architecture. */
  marquee?: {
    items?: string[];
  };
  /** Architecture / performance pitch — the split-with-diagram section. */
  architecture?: {
    eyebrow?: string;
    title?: string;
    highlight?: string;
    intro?: string;
    bullets?: LandingArchitectureBullet[];
  };
  features?: {
    eyebrow?: string;
    title?: string;
    highlight?: string;
    subtitle?: string;
    items?: LandingFeatureItem[];
  };
  /** MCP / AI integration showcase with chat-style demo. */
  mcp?: {
    eyebrow?: string;
    title?: string;
    highlight?: string;
    intro?: string;
    stats?: LandingMcpStat[];
  };
  /** Built-in plugins + shortcode list. */
  plugins?: {
    eyebrow?: string;
    title?: string;
    highlight?: string;
    intro?: string;
    items?: LandingPluginItem[];
    shortcodes?: LandingShortcode[];
  };
  pricing?: {
    eyebrow?: string;
    title?: string;
    highlight?: string;
    subtitle?: string;
    plans?: LandingPricingPlan[];
  };
  /**
   * Legacy fields preserved for backwards-compat with the admin form —
   * the v2 design ignores these. Removing them would crash the admin
   * settings page reads.
   */
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
    description?: string;
    columns?: Array<{ title: string; links: LandingFooterLink[] }>;
    /** Legacy single-row links from the old design. Used as a fallback
     *  when no `columns` are provided. */
    links?: LandingFooterLink[];
  };
}

// ── Wordmark + brand SVG ─────────────────────────────────────────────

/**
 * Worker CMS hex-prism mark. Identical to the SVG used in the nav and
 * footer of the v2.html mock. Renders inline so we ship zero img
 * requests for the brand badge.
 */
function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#0F0F11" stroke="#26262C" />
      <path
        d="M8 11 L16 7 L24 11 L24 21 L16 25 L8 21 Z"
        stroke="#F5A524"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 11 L16 15 L24 11 M16 15 L16 25"
        stroke="#F5A524"
        strokeWidth="1.25"
        strokeLinejoin="round"
        opacity=".6"
      />
      <circle cx="16" cy="15" r="1.6" fill="#F5A524" />
    </svg>
  );
}

// ── Icon set ─────────────────────────────────────────────────────────

/**
 * Feature-card icon set. Each entry is the inner stroked path geometry
 * for a 24×24 viewBox; the wrapper `<Icon>` below adds the SVG chrome.
 * Keys mirror the `icon` strings the admin form writes (see
 * admin/src/pages/settings/LandingSettings.tsx) — when a field stores
 * an unknown name we fall back to `zap` so the layout stays intact.
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
      <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10Z" />
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
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  code: (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  arrow: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  // v2 design feature icons — geometry copied straight from v2.html.
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  package: (
    <>
      <path d="M9 2v6" />
      <path d="M15 2v6" />
      <path d="M3 8h18l-1 12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M9 14h6" />
    </>
  ),
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  // MCP & plugin glyphs.
  msg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  compass: (
    <>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </>
  ),
  mail: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  video: (
    <>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </>
  ),
  // Sub-features below the main grid.
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  play: <polygon points="5 3 19 12 5 21 5 3" />,
};

function Icon({
  name,
  size = 18,
  className,
  stroke = '#F5A524',
  strokeWidth = 1.5,
}: {
  name: string;
  size?: number;
  className?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const body = ICONS[name] ?? ICONS.zap;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Render a string that may contain a single `{accent}` token by wrapping
 * the contents in an amber italic span. Used to apply the v2 design's
 * highlight treatment (e.g. "en yakın noktadan" inside the larger H2)
 * without baking the markup into the SQL seed. When the string has no
 * token we return it verbatim.
 *
 * Example:
 *   "Kullanıcınıza {en yakın noktadan} servis."
 *   → <>Kullanıcınıza <em>en yakın noktadan</em> servis.</>
 */
function withAccent(text: string | undefined): ReactNode {
  if (!text) return null;
  const m = text.match(/^([\s\S]*?)\{([\s\S]+?)\}([\s\S]*)$/);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <em className="text-amber-400 not-italic">{m[2]}</em>
      {m[3]}
    </>
  );
}

/** Container used by every section — matches v2's `max-w-[1280px]`. */
function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-[1280px] mx-auto px-6 lg:px-12', className)}>
      {children}
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────────────

interface NavProps {
  brandName: string;
  nav?: LandingConfig['nav'];
}

// Fallback used when no `nav` block has been set in landing_config
// — mirrors the original hand-coded markup so the SSR shell matches
// the v2.html mock byte-for-byte.
const DEFAULT_NAV_ITEMS: { label: string; url: string }[] = [
  { label: 'Özellikler', url: '#features' },
  { label: 'Performans', url: '#architecture' },
  { label: 'AI Entegrasyonu', url: '#mcp' },
  { label: 'Eklentiler', url: '#plugins' },
  { label: 'Fiyatlandırma', url: '#pricing' },
];

function Nav({ brandName, nav }: NavProps) {
  const items = nav?.items && nav.items.length > 0 ? nav.items : DEFAULT_NAV_ITEMS;
  const loginText = nav?.login_text || 'Giriş yap';
  const loginUrl = nav?.login_url || '/admin/login';
  const ctaText = nav?.cta_text;
  const ctaUrl = nav?.cta_url;
  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/60 backdrop-blur-xl bg-ink-0/72">
      <PageContainer className="h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <Wordmark />
          <span className="font-semibold tracking-tight text-ink-900">
            {brandName}
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-700">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.url || '#'}
              className="hover:text-ink-900 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={loginUrl}
            className="hidden sm:inline-flex items-center text-sm text-ink-700 hover:text-ink-900 px-3 py-1.5 transition-colors"
          >
            {loginText}
          </a>
          {/* Theme toggle island — hydrated by landing-entry.tsx. The
              SSR markup matches what the island will render so there
              is no layout flash. Lives between the login link and the
              CTA, same slot as in the v2 mock. */}
          <span data-island="theme-toggle" className="contents">
            <button
              type="button"
              aria-label="Toggle theme"
              className="inline-flex size-9 items-center justify-center rounded-md border border-ink-300 bg-ink-50 text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
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

          <a
            href={ctaUrl || '#pricing'}
            className="text-sm font-semibold bg-amber-400 text-ink-0 px-4 py-1.5 rounded-md hover:bg-amber-500 transition-colors"
          >
            {ctaText || 'Ücretsiz başla'}
          </a>
        </div>
      </PageContainer>
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────

interface HeroProps {
  hero: NonNullable<LandingConfig['hero']>;
}

function Hero({ hero }: HeroProps) {
  return (
    <section className="relative overflow-hidden hero-glow grain">
      <div className="absolute inset-0 grid-dots opacity-50 pointer-events-none" />

      <PageContainer className="relative pt-24 pb-28 lg:pt-32 lg:pb-36">
        {hero.badge ? (
          <div className="reveal flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-8">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 pulse-ring" />
            <span>{hero.badge}</span>
          </div>
        ) : null}

        {hero.title ? (
          <h1 className="reveal font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] leading-[0.98] text-ink-900 max-w-5xl">
            {withAccent(hero.title)}
          </h1>
        ) : null}

        {hero.subtitle ? (
          <p className="reveal mt-8 text-lg lg:text-xl text-ink-700 max-w-2xl leading-relaxed">
            {withAccent(hero.subtitle)}
          </p>
        ) : null}

        <div className="reveal mt-10 flex flex-wrap items-center gap-3">
          {hero.cta_text ? (
            <a
              href={hero.cta_url || '#pricing'}
              className="group inline-flex items-center gap-2 bg-amber-400 text-ink-0 px-6 py-3 rounded-md text-sm font-bold hover:bg-amber-500 transition-colors"
            >
              {hero.cta_text}
              <span className="ml-1 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </a>
          ) : null}
          {hero.secondary_cta_text ? (
            <a
              href={hero.secondary_cta_url || '#features'}
              className="inline-flex items-center gap-2 border border-ink-300 hover:border-ink-400 text-ink-800 px-6 py-3 rounded-md text-sm font-medium transition-colors"
            >
              <Icon
                name="play"
                size={14}
                stroke="currentColor"
                strokeWidth={2}
              />
              {hero.secondary_cta_text}
            </a>
          ) : null}
          <span className="text-xs text-ink-600 font-mono ml-2 hidden sm:inline">
            Kredi kartı gerekmez
          </span>
        </div>

        {hero.stats && hero.stats.length > 0 ? (
          <div className="reveal mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px bg-ink-300 border border-ink-300 rounded-xl overflow-hidden max-w-4xl">
            {hero.stats.map((s, i) => (
              <div key={i} className="bg-ink-50 p-6">
                <div className="font-display text-4xl text-ink-900">
                  {withAccent(s.value)}
                </div>
                <div className="text-xs text-ink-600 mt-1 uppercase tracking-wider">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </PageContainer>
    </section>
  );
}

// ── Marquee ──────────────────────────────────────────────────────────

interface MarqueeProps {
  items: string[];
}

function Marquee({ items }: MarqueeProps) {
  if (items.length === 0) return null;
  // Render the list twice so the -50% translate animation wraps
  // seamlessly without a visible "snap" at the loop boundary.
  const doubled = [...items, ...items];
  return (
    <section className="border-y border-ink-200 bg-ink-50 py-6 overflow-hidden">
      <div className="flex items-center gap-12 marquee-track whitespace-nowrap text-ink-600">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-12 flex-shrink-0">
            <span className="font-mono text-sm">{item}</span>
            <span className="text-ink-400">●</span>
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Architecture (Performance) ───────────────────────────────────────

interface ArchitectureProps {
  arch: NonNullable<LandingConfig['architecture']>;
}

function Architecture({ arch }: ArchitectureProps) {
  const bullets = arch.bullets ?? [];
  return (
    <section id="architecture" className="relative py-28 lg:py-36">
      <PageContainer>
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Copy column */}
          <div className="lg:col-span-5 reveal">
            {arch.eyebrow ? (
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-5">
                {arch.eyebrow}
              </div>
            ) : null}
            {arch.title ? (
              <h2 className="font-display text-4xl lg:text-5xl text-ink-900 leading-[1.05]">
                {withAccent(arch.title)}
              </h2>
            ) : null}
            {arch.intro ? (
              <p className="mt-6 text-ink-700 leading-relaxed">
                {withAccent(arch.intro)}
              </p>
            ) : null}
            {bullets.length > 0 ? (
              <ul className="mt-8 space-y-3 text-sm text-ink-700">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-amber-400 font-mono">→</span>
                    <span>{b.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Diagram column — animated SVG of the edge request flow. The
              geometry mirrors v2.html lines 236-315 verbatim because the
              diagram is the section's hero asset, not data-driven. */}
          <div className="lg:col-span-7 reveal">
            <div className="relative bg-ink-50 border border-ink-200 rounded-2xl p-8 lg:p-10 overflow-hidden">
              <div className="absolute inset-0 grid-dots opacity-40 pointer-events-none" />

              <svg
                viewBox="0 0 560 420"
                className="relative w-full h-auto"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Visitor */}
                <g>
                  <rect
                    x="20"
                    y="20"
                    width="120"
                    height="48"
                    rx="8"
                    fill="#141418"
                    stroke="#3A3A42"
                  />
                  <text
                    x="80"
                    y="42"
                    textAnchor="middle"
                    fill="#E2E2E5"
                    fontFamily="Inter"
                    fontSize="11"
                    fontWeight="600"
                  >
                    Ziyaretçi
                  </text>
                  <text
                    x="80"
                    y="56"
                    textAnchor="middle"
                    fill="#8A8A93"
                    fontFamily="JetBrains Mono"
                    fontSize="9"
                  >
                    istanbul
                  </text>
                </g>

                <path
                  d="M140 44 L210 44"
                  stroke="#F5A524"
                  strokeWidth="1.5"
                  className="flow"
                />
                <polygon points="210,44 204,40 204,48" fill="#F5A524" />

                {/* Nearest edge */}
                <g>
                  <rect
                    x="210"
                    y="20"
                    width="180"
                    height="48"
                    rx="8"
                    fill="#1B1B20"
                    stroke="#F5A524"
                    strokeOpacity=".5"
                  />
                  <circle cx="228" cy="44" r="4" fill="#F5A524" />
                  <text
                    x="246"
                    y="42"
                    fill="#FAFAF7"
                    fontFamily="Inter"
                    fontSize="11"
                    fontWeight="600"
                  >
                    En Yakın Edge
                  </text>
                  <text
                    x="246"
                    y="56"
                    fill="#8A8A93"
                    fontFamily="JetBrains Mono"
                    fontSize="9"
                  >
                    ~12ms RTT
                  </text>
                </g>

                <path
                  d="M390 44 L460 44 L460 100"
                  stroke="#3A3A42"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />

                {/* Worker runtime container */}
                <g>
                  <rect
                    x="60"
                    y="100"
                    width="440"
                    height="220"
                    rx="12"
                    fill="#0F0F11"
                    stroke="#26262C"
                  />
                  <text
                    x="80"
                    y="124"
                    fill="#FAFAF7"
                    fontFamily="Inter"
                    fontSize="12"
                    fontWeight="600"
                  >
                    Worker CMS Runtime
                  </text>
                  <text
                    x="80"
                    y="138"
                    fill="#5C5C66"
                    fontFamily="JetBrains Mono"
                    fontSize="9"
                  >
                    tüm istekler edge&apos;de işlenir · origin yok
                  </text>

                  {/* Middleware pipeline */}
                  <g transform="translate(80, 158)">
                    <rect
                      width="400"
                      height="32"
                      rx="6"
                      fill="#141418"
                      stroke="#26262C"
                    />
                    <text
                      x="12"
                      y="20"
                      fill="#B5B5BC"
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                    >
                      Güvenlik
                    </text>
                    <text x="78" y="20" fill="#5C5C66">→</text>
                    <text
                      x="94"
                      y="20"
                      fill="#B5B5BC"
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                    >
                      Hız Limiti
                    </text>
                    <text x="166" y="20" fill="#5C5C66">→</text>
                    <text
                      x="182"
                      y="20"
                      fill="#F5A524"
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                      fontWeight="600"
                    >
                      Site Çözümleme
                    </text>
                    <text x="288" y="20" fill="#5C5C66">→</text>
                    <text
                      x="304"
                      y="20"
                      fill="#B5B5BC"
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                    >
                      Dil
                    </text>
                    <text x="328" y="20" fill="#5C5C66">→</text>
                    <text
                      x="344"
                      y="20"
                      fill="#F5A524"
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                      fontWeight="600"
                    >
                      Eklentiler
                    </text>
                  </g>

                  {/* Three runtime sub-cards: API, Renderer, Admin */}
                  <g transform="translate(80, 210)">
                    <rect width="120" height="90" rx="8" fill="#141418" stroke="#26262C" />
                    <text x="60" y="22" textAnchor="middle" fill="#FAFAF7" fontFamily="Inter" fontSize="11" fontWeight="600">REST API</text>
                    <text x="60" y="40" textAnchor="middle" fill="#8A8A93" fontFamily="JetBrains Mono" fontSize="9">JWT + 2FA</text>
                    <text x="60" y="60" textAnchor="middle" fill="#5C5C66" fontFamily="JetBrains Mono" fontSize="9">4 rol RBAC</text>
                    <text x="60" y="76" textAnchor="middle" fill="#5C5C66" fontFamily="JetBrains Mono" fontSize="9">API anahtarları</text>
                  </g>
                  <g transform="translate(220, 210)">
                    <rect
                      width="120"
                      height="90"
                      rx="8"
                      fill="#141418"
                      stroke="#F5A524"
                      strokeOpacity=".4"
                    />
                    <text x="60" y="22" textAnchor="middle" fill="#FAFAF7" fontFamily="Inter" fontSize="11" fontWeight="600">Render Motoru</text>
                    <text x="60" y="40" textAnchor="middle" fill="#8A8A93" fontFamily="JetBrains Mono" fontSize="9">streaming HTML</text>
                    <text x="60" y="60" textAnchor="middle" fill="#5C5C66" fontFamily="JetBrains Mono" fontSize="9">+ AMP</text>
                    <text x="60" y="76" textAnchor="middle" fill="#5C5C66" fontFamily="JetBrains Mono" fontSize="9">+ RSS · Sitemap</text>
                  </g>
                  <g transform="translate(360, 210)">
                    <rect width="120" height="90" rx="8" fill="#141418" stroke="#26262C" />
                    <text x="60" y="22" textAnchor="middle" fill="#FAFAF7" fontFamily="Inter" fontSize="11" fontWeight="600">Yönetim Paneli</text>
                    <text x="60" y="40" textAnchor="middle" fill="#8A8A93" fontFamily="JetBrains Mono" fontSize="9">çift editör</text>
                    <text x="60" y="60" textAnchor="middle" fill="#5C5C66" fontFamily="JetBrains Mono" fontSize="9">SEO · medya</text>
                    <text x="60" y="76" textAnchor="middle" fill="#5C5C66" fontFamily="JetBrains Mono" fontSize="9">analytics</text>
                  </g>
                </g>

                {/* Drop-down arrows to data nodes */}
                <path d="M180 320 L180 360" stroke="#F5A524" strokeWidth="1.5" className="flow" />
                <path d="M280 320 L280 360" stroke="#F5A524" strokeWidth="1.5" className="flow" />
                <path d="M380 320 L380 360" stroke="#F5A524" strokeWidth="1.5" className="flow" />

                {/* Data layer */}
                <g>
                  <rect x="120" y="360" width="120" height="48" rx="8" fill="#141418" stroke="#3A3A42" />
                  <text x="180" y="382" textAnchor="middle" fill="#E2E2E5" fontFamily="Inter" fontSize="11" fontWeight="600">İçerik Veritabanı</text>
                  <text x="180" y="396" textAnchor="middle" fill="#8A8A93" fontFamily="JetBrains Mono" fontSize="9">FTS arama dahili</text>
                </g>
                <g>
                  <rect x="220" y="360" width="120" height="48" rx="8" fill="#141418" stroke="#3A3A42" />
                  <text x="280" y="382" textAnchor="middle" fill="#E2E2E5" fontFamily="Inter" fontSize="11" fontWeight="600">Medya Depolama</text>
                  <text x="280" y="396" textAnchor="middle" fill="#8A8A93" fontFamily="JetBrains Mono" fontSize="9">sınırsız dosya</text>
                </g>
                <g>
                  <rect x="320" y="360" width="120" height="48" rx="8" fill="#141418" stroke="#3A3A42" />
                  <text x="380" y="382" textAnchor="middle" fill="#E2E2E5" fontFamily="Inter" fontSize="11" fontWeight="600">Edge Cache</text>
                  <text x="380" y="396" textAnchor="middle" fill="#8A8A93" fontFamily="JetBrains Mono" fontSize="9">otomatik purge</text>
                </g>
              </svg>

              <div className="mt-6 flex items-center justify-between text-[10px] font-mono text-ink-600 uppercase tracking-wider">
                <span>↳ Origin yok · Tek istek · ~30ms p50</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                  canlı
                </span>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────

interface FeaturesProps {
  features: NonNullable<LandingConfig['features']>;
}

/**
 * Sub-feature mini-grid that sits below the main 6-card grid. Items are
 * hardcoded to match v2.html lines 450-466 because they describe ground-
 * truth platform capabilities (RBAC, server-side analytics, i18n, WP
 * import) that aren't user-tunable from the admin. If we ever need to
 * pull these from config, expose a `features.miniItems` field.
 */
const FEATURE_SUB_ITEMS: Array<{ icon: string; title: string; desc: string }> = [
  { icon: 'shield', title: 'Kurumsal güvenlik', desc: '2FA, RBAC, API anahtarları' },
  { icon: 'eye', title: 'Server-side analytics', desc: 'Bot filtreleme, ülke algılama' },
  { icon: 'globe', title: 'Çoklu dil', desc: 'Çeviri grupları, dil rotaları' },
  { icon: 'download', title: 'WordPress göçü', desc: 'WXR import, tek tıkla aktarım' },
];

function Features({ features }: FeaturesProps) {
  const items = features.items ?? [];
  return (
    <section id="features" className="relative py-24 lg:py-32 border-t border-ink-200">
      <PageContainer>
        <div className="reveal flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            {features.eyebrow ? (
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-5">
                {features.eyebrow}
              </div>
            ) : null}
            {features.title ? (
              <h2 className="font-display text-4xl lg:text-5xl text-ink-900 leading-[1.05]">
                {withAccent(features.title)}
              </h2>
            ) : null}
          </div>
          {features.subtitle ? (
            <p className="text-ink-700 max-w-md text-sm leading-relaxed">
              {features.subtitle}
            </p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-200 border border-ink-200 rounded-2xl overflow-hidden">
            {items.map((f, i) => (
              <div key={i} className="feat-card bg-ink-50 p-8 reveal">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-lg bg-ink-100 border border-ink-300 flex items-center justify-center">
                    <Icon name={f.icon ?? 'zap'} size={18} />
                  </div>
                  <span className="font-mono text-[10px] text-ink-600 uppercase tracking-wider">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display text-2xl text-ink-900 mb-3">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-700 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURE_SUB_ITEMS.map((sub, i) => (
            <div
              key={i}
              className="reveal flex items-start gap-3 p-4 rounded-lg border border-ink-200 hover:border-ink-300 transition-colors"
            >
              <Icon
                name={sub.icon}
                size={18}
                stroke="#8A8A93"
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <div className="text-sm font-medium text-ink-900">{sub.title}</div>
                <div className="text-xs text-ink-600 mt-1">{sub.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

// ── MCP / AI Integration ─────────────────────────────────────────────

interface McpProps {
  mcp: NonNullable<LandingConfig['mcp']>;
}

function Mcp({ mcp }: McpProps) {
  const stats = mcp.stats ?? [];
  return (
    <section
      id="mcp"
      className="relative py-28 lg:py-36 border-t border-ink-200 bg-ink-50"
    >
      <div className="absolute inset-0 grid-dots opacity-30 pointer-events-none" />
      <PageContainer className="relative">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Copy column */}
          <div className="lg:col-span-5 reveal">
            {mcp.eyebrow ? (
              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-5">
                {mcp.eyebrow}
              </div>
            ) : null}
            {mcp.title ? (
              <h2 className="font-display text-4xl lg:text-5xl text-ink-900 leading-[1.05]">
                {withAccent(mcp.title)}
              </h2>
            ) : null}
            {mcp.intro ? (
              <p className="mt-6 text-ink-700 leading-relaxed">
                {withAccent(mcp.intro)}
              </p>
            ) : null}

            {stats.length > 0 ? (
              <ul className="mt-8 space-y-3 text-sm">
                {stats.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 text-ink-700">
                    <span className="font-mono text-amber-400 w-6">{s.value}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8 inline-flex items-center gap-2 text-xs text-ink-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Tüm planlarda dahil
            </div>
          </div>

          {/* Chat-style demo column. The transcript is intentionally
              static — it sells the workflow without claiming a real
              session. Mirrors v2.html lines 497-549. */}
          <div className="lg:col-span-7 reveal space-y-4">
            <div className="rounded-xl border border-ink-200 bg-ink-100 overflow-hidden shadow-2xl shadow-black/40">
              <div className="px-4 py-3 border-b border-ink-200 bg-ink-50 flex items-center gap-2">
                <Icon name="msg" size={14} stroke="#F5A524" strokeWidth={2} />
                <span className="font-mono text-[11px] text-ink-600">
                  AI Asistanı · workercms
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  bağlı
                </span>
              </div>

              <div className="p-5 space-y-4 text-sm">
                <div>
                  <div className="text-[10px] font-mono text-ink-600 uppercase mb-1.5">
                    SİZ
                  </div>
                  <div className="text-ink-800 bg-ink-200/40 border border-ink-300 rounded-lg px-4 py-3">
                    Site 1&apos;de bekleyen yorumları onayla, sonra son 5 yazıyı listele.
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-amber-400 uppercase mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    ASİSTAN
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Bekleyen yorumları al →', '3 sonuç'],
                      ['3 yorumu onayla →', 'başarılı'],
                      ['Son 5 yazıyı getir →', '5 sonuç'],
                    ].map(([label, result], i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs font-mono text-ink-700 bg-ink-200/40 border border-ink-300 rounded px-3 py-1.5"
                      >
                        <Icon
                          name="check"
                          size={12}
                          stroke="currentColor"
                          strokeWidth={2}
                        />
                        {label} <span className="text-emerald-400">{result}</span>
                      </div>
                    ))}
                    <div className="text-ink-800 pt-2 leading-relaxed">
                      3 yorum onaylandı. İşte son 5 yazı:{' '}
                      <span className="text-ink-600">
                        &ldquo;Edge&apos;de yayıncılık&rdquo;, &ldquo;AI ile içerik akışı&rdquo;, ...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-ink-200 bg-ink-100 px-5 py-4 flex items-center justify-between">
              <div className="text-xs text-ink-600 font-mono uppercase tracking-wider">
                Uyumlu
              </div>
              <div className="flex items-center gap-5 text-sm text-ink-800">
                {['Claude', 'Cursor', 'ChatGPT'].map((name) => (
                  <span key={name} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {name}
                  </span>
                ))}
                <span className="flex items-center gap-2 text-ink-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-400" />+ standart
                  protokol
                </span>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

// ── Plugins + Shortcodes ─────────────────────────────────────────────

interface PluginsProps {
  plugins: NonNullable<LandingConfig['plugins']>;
}

function Plugins({ plugins }: PluginsProps) {
  const items = plugins.items ?? [];
  const shortcodes = plugins.shortcodes ?? [];
  return (
    <section id="plugins" className="relative py-28 lg:py-36 border-t border-ink-200">
      <PageContainer>
        <div className="reveal max-w-2xl mb-16">
          {plugins.eyebrow ? (
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-5">
              {plugins.eyebrow}
            </div>
          ) : null}
          {plugins.title ? (
            <h2 className="font-display text-4xl lg:text-5xl text-ink-900 leading-[1.05]">
              {withAccent(plugins.title)}
            </h2>
          ) : null}
          {plugins.intro ? (
            <p className="mt-6 text-ink-700 leading-relaxed">
              {withAccent(plugins.intro)}
            </p>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-12 gap-px bg-ink-200 border border-ink-200 rounded-2xl overflow-hidden">
          {/* Built-in plugins */}
          <div className="lg:col-span-7 bg-ink-50 p-8 lg:p-10 reveal">
            <div className="font-mono text-xs text-ink-600 mb-6">
              Dahili eklentiler
            </div>
            <div className="space-y-4">
              {items.map((p, i) => {
                const isActive = (p.status ?? 'aktif') === 'aktif';
                return (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-lg border border-ink-200 bg-ink-100/40"
                  >
                    <div className="w-10 h-10 rounded-md bg-ink-100 border border-ink-300 flex items-center justify-center flex-shrink-0">
                      <Icon name={p.icon ?? 'package'} size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-ink-900">
                          {p.title}
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded',
                            isActive
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : 'text-ink-600 bg-ink-100'
                          )}
                        >
                          {p.status ?? 'aktif'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-600 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shortcodes list */}
          <div className="lg:col-span-5 bg-ink-50 p-8 lg:p-10 reveal">
            <div className="font-mono text-xs text-ink-600 mb-5">
              {shortcodes.length}+ kısa kod
            </div>
            <div className="space-y-1.5">
              {shortcodes.map((sc, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between py-2',
                    i < shortcodes.length - 1 && 'border-b border-ink-200/60'
                  )}
                >
                  <code className="font-mono text-sm text-amber-400">
                    {sc.code}
                  </code>
                  <span className="text-xs text-ink-600">{sc.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-ink-300/60 text-xs text-ink-600">
              +{' '}
              <span className="text-ink-800 font-medium">
                video, kategori, widget, ayırıcı, boşluk, yazı
              </span>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────

interface PricingProps {
  pricing: NonNullable<LandingConfig['pricing']>;
  cta: NonNullable<LandingConfig['cta']>;
}

/**
 * Format a price value the v2 way. The legacy CMS stores `price` as a
 * raw number (29, 0, ...) but the v2 mock prefers strings like
 * "Ücretsiz" or "$29". We render the dollar sign separately so the
 * font-display weight applies cleanly to the numeric portion.
 */
function PriceDisplay({
  currency,
  price,
  period,
  highlightedColor,
}: {
  currency?: string;
  price?: string | number;
  period?: string;
  highlightedColor?: boolean;
}) {
  const priceStr = typeof price === 'number' ? String(price) : price ?? '';
  const isFree = priceStr === '' || priceStr === '0' || priceStr.toLowerCase().includes('ücret');

  if (isFree && !currency) {
    return (
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className={cn(
            'font-display text-5xl',
            highlightedColor ? 'text-ink-900' : 'text-ink-900'
          )}
        >
          Ücretsiz
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-1.5 mb-1">
      {currency ? (
        <span className="font-display text-5xl text-ink-900">{currency}</span>
      ) : null}
      <span className="font-display text-5xl text-ink-900">{priceStr}</span>
      {period ? <span className="text-sm text-ink-600">{period}</span> : null}
    </div>
  );
}

function Pricing({ pricing, cta }: PricingProps) {
  const plans = pricing.plans ?? [];
  return (
    <section
      id="pricing"
      className="relative py-28 lg:py-36 border-t border-ink-200 overflow-hidden"
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side, rgba(245,165,36,0.25), transparent 70%)',
        }}
      />

      <PageContainer className="relative">
        <div className="reveal text-center max-w-3xl mx-auto mb-16">
          {pricing.eyebrow ? (
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-5">
              {pricing.eyebrow}
            </div>
          ) : null}
          {pricing.title ? (
            <h2 className="font-display text-4xl lg:text-6xl text-ink-900 leading-[1.05]">
              {withAccent(pricing.title)}
            </h2>
          ) : null}
          {pricing.subtitle ? (
            <p className="mt-6 text-ink-700">{pricing.subtitle}</p>
          ) : null}
        </div>

        {plans.length > 0 ? (
          <div
            className={cn(
              'grid gap-6 max-w-5xl mx-auto',
              plans.length === 1 && 'md:grid-cols-1 max-w-md',
              plans.length === 2 && 'md:grid-cols-2 max-w-3xl',
              plans.length >= 3 && 'md:grid-cols-3'
            )}
          >
            {plans.map((plan, i) => {
              const isHighlighted = !!plan.highlighted;
              const isEnterprise = !!plan.isEnterprise;
              const eyebrowColor = isHighlighted
                ? 'text-amber-400'
                : 'text-ink-600';

              return (
                <div
                  key={i}
                  className={cn(
                    'reveal rounded-2xl p-8 flex flex-col relative',
                    isHighlighted
                      ? 'price-pop'
                      : 'border border-ink-200 bg-ink-50'
                  )}
                >
                  {isHighlighted ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-ink-0 text-[10px] font-bold px-3 py-1 rounded-full font-mono uppercase tracking-wider">
                      En popüler
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'text-xs font-mono uppercase tracking-wider mb-2',
                      eyebrowColor
                    )}
                  >
                    {plan.name}
                  </div>

                  {isEnterprise ? (
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-display text-5xl text-ink-900">
                        Özel
                      </span>
                    </div>
                  ) : (
                    <PriceDisplay
                      currency={plan.currency}
                      price={plan.price}
                      period={plan.period}
                      highlightedColor={isHighlighted}
                    />
                  )}

                  <div className="text-xs text-ink-600 mb-7">
                    {plan.desc || ' '}
                  </div>

                  <ul
                    className={cn(
                      'space-y-3 text-sm flex-1',
                      isHighlighted ? 'text-ink-800' : 'text-ink-700'
                    )}
                  >
                    {(plan.features ?? []).map((f, j) => (
                      <li key={j} className="flex gap-2.5">
                        <span className="text-amber-400 mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={plan.cta_url || '#'}
                    className={cn(
                      'mt-8 text-center block px-5 py-3 rounded-md text-sm transition-colors',
                      isHighlighted
                        ? 'bg-amber-400 hover:bg-amber-500 text-ink-0 font-bold'
                        : 'border border-ink-300 hover:border-ink-400 text-ink-800 font-medium'
                    )}
                  >
                    {plan.cta_text || (isEnterprise ? 'Bizimle görüşün' : 'Hemen başla')}
                  </a>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Final CTA — lives inside the pricing section per v2.html. */}
        {cta.title || cta.button_text ? (
          <div className="reveal mt-24 text-center">
            {cta.title ? (
              <h3 className="font-display text-3xl lg:text-4xl text-ink-900">
                {cta.title}
              </h3>
            ) : null}
            {cta.subtitle ? (
              <p className="mt-3 text-ink-700">{cta.subtitle}</p>
            ) : null}
            {cta.button_text ? (
              <a
                href={cta.button_url || '#'}
                className="mt-8 inline-flex items-center gap-2 bg-amber-400 text-ink-0 px-6 py-3 rounded-md text-sm font-bold hover:bg-amber-500 transition-colors"
              >
                {cta.button_text}
                <span>→</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────

interface LandingFooterProps {
  footer: NonNullable<LandingConfig['footer']>;
  brandName: string;
}

/**
 * Build the footer's link columns. v2 expects three columns ("Ürün",
 * "Şirket", "Yasal"). If the config provides `columns` we honour them
 * verbatim; otherwise we fall back to the legacy single `links` array
 * stuffed into a single "Yasal" column so older configs still render.
 */
function resolveFooterColumns(
  footer: NonNullable<LandingConfig['footer']>
): Array<{ title: string; links: LandingFooterLink[] }> {
  if (footer.columns && footer.columns.length > 0) return footer.columns;
  if (footer.links && footer.links.length > 0) {
    return [{ title: 'Bağlantılar', links: footer.links }];
  }
  return [];
}

function LandingFooter({ footer, brandName }: LandingFooterProps) {
  const columns = resolveFooterColumns(footer);
  const tagline =
    footer.description ||
    "Edge'de çalışan, çoklu site destekli modern içerik yönetim platformu. WordPress'in özgürlüğü, modern yazılımın hızıyla.";
  const bottom =
    footer.text || `© ${new Date().getFullYear()} ${brandName}`;
  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <PageContainer className="py-16 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Wordmark />
            <span className="font-semibold tracking-tight text-ink-900">
              {brandName}
            </span>
          </div>
          <p className="text-sm text-ink-700 max-w-sm leading-relaxed">
            {tagline}
          </p>
        </div>

        {columns.length > 0 ? (
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {columns.map((col, i) => (
              <div key={i}>
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-600 mb-3">
                  {col.title}
                </div>
                <ul className="space-y-2 text-sm text-ink-700">
                  {col.links.map((l, j) => (
                    <li key={j}>
                      <a
                        href={l.url}
                        className="hover:text-ink-900 transition-colors"
                      >
                        {l.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </PageContainer>

      <div className="border-t border-ink-200">
        <PageContainer className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-ink-600">
          <div>{bottom}</div>
          <div className="font-mono">Edge-native · Sınırsız ölçek</div>
        </PageContainer>
      </div>
    </footer>
  );
}

// ── Page root ────────────────────────────────────────────────────────

/**
 * Default value for the value-prop marquee. Lives here (not in the SQL
 * seed) because it's editorial copy keyed off the v2 mock — the admin
 * never edits it. If `config.marquee.items` is set, that wins.
 */
const DEFAULT_MARQUEE_ITEMS: string[] = [
  'Sınırsız çoklu site',
  'Yerleşik AI asistanı',
  'AMP otomatik',
  'FTS arama dahili',
  'Eklenti sandbox',
  'Çift editör',
  'SEO analizci',
  'Çoklu dil',
  '2FA + RBAC',
  "WordPress'ten göç",
  'Server-side analytics',
  'Otomatik yedekleme',
];

export interface LandingProps {
  config: LandingConfig;
}

export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'Worker CMS';
  const hero = config.hero ?? {};
  const marquee = config.marquee ?? {};
  const arch = config.architecture ?? {};
  const features = config.features ?? {};
  const mcp = config.mcp ?? {};
  const plugins = config.plugins ?? {};
  const pricing = config.pricing ?? {};
  const cta = config.cta ?? {};
  const footer = config.footer ?? {};
  const marqueeItems =
    marquee.items && marquee.items.length > 0
      ? marquee.items
      : DEFAULT_MARQUEE_ITEMS;

  return (
    <div className="landing-v2 min-h-screen bg-ink-0 text-ink-800 [scroll-behavior:smooth]">
      <Nav brandName={brandName} nav={config.nav} />
      <main>
        <Hero hero={hero} />
        <Marquee items={marqueeItems} />
        <Architecture arch={arch} />
        <Features features={features} />
        <Mcp mcp={mcp} />
        <Plugins plugins={plugins} />
        <Pricing pricing={pricing} cta={cta} />
      </main>
      <LandingFooter footer={footer} brandName={brandName} />
    </div>
  );
}
