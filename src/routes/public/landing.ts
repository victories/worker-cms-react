import { Hono } from 'hono';
import { createElement, Fragment } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { Landing, type LandingConfig } from '../../ssr/pages/landing/Landing';
import { LANDING_CLIENT_JS } from '../../ssr/__generated__/landing-client';

/**
 * Public landing route.
 *
 * Reads the `landing_config` JSON from `global_settings`, merges in
 * active `packages` rows for pricing, then renders the React SSR
 * Landing tree inside `<Shell>`. The old handler (landing.tsx,
 * 401 lines) produced the whole HTML document by hand — we just
 * replace the render layer; DB reads and package merging are
 * unchanged.
 *
 * Exported `serveLanding` is also imported from `src/index.ts` to
 * serve the landing at `/` when the request host matches the admin
 * domain. That entry point keeps working after this rewrite because
 * the function signature is the same: `(c) => Response | null`.
 *
 * File extension is `.ts` (not `.tsx`) because the handler uses
 * `createElement` rather than JSX — this sidesteps the per-file JSX
 * pragma dance that would otherwise be needed in a mixed Hono/React
 * codebase (see CLAUDE.md §2.6).
 */

const landingRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Merge active packages into the pricing section of the landing
 * config. Matches the behaviour of the Hono JSX version verbatim so
 * existing admin data renders identically.
 */
async function mergePackagesIntoPricing(
  c: { env: Bindings },
  config: LandingConfig
): Promise<void> {
  try {
    const pkgResult = await c.env.DB.prepare(
      'SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC, price_monthly ASC'
    ).all();
    const rows = pkgResult.results as Array<{
      name: string;
      description: string | null;
      price_monthly: number | string;
      features: string | null;
    }>;
    if (!rows || rows.length === 0) return;

    const adminDomain = (c.env.ADMIN_DOMAIN || '').replace(/:\d+$/, '');
    const registerUrl = adminDomain
      ? `https://${adminDomain}/admin/register`
      : '/admin/register';

    config.pricing = config.pricing || {};
    config.pricing.title = config.pricing.title || 'Fiyatlandırma';
    config.pricing.subtitle =
      config.pricing.subtitle || 'İhtiyacınıza uygun planı seçin';

    config.pricing.plans = rows.map((pkg) => {
      let features: string[] = [];
      try {
        features = pkg.features ? (JSON.parse(pkg.features) as string[]) : [];
      } catch {
        features = [];
      }
      return {
        name: pkg.name,
        desc: pkg.description || '',
        currency: '$',
        price: pkg.price_monthly,
        period: '/ay',
        features,
        cta_text: 'Başla',
        cta_url: registerUrl,
        highlighted: false,
      };
    });

    // Highlight the middle plan (3+) or the second plan (exactly 2)
    if (config.pricing.plans.length >= 3) {
      config.pricing.plans[Math.floor(config.pricing.plans.length / 2)].highlighted =
        true;
    } else if (config.pricing.plans.length === 2) {
      config.pricing.plans[1].highlighted = true;
    }

    // Append the always-on enterprise/contact card
    config.pricing.plans.push({
      name: 'Kurumsal',
      desc: 'Daha fazlasına mı ihtiyacınız var? Size özel çözüm sunalım.',
      currency: '',
      price: '',
      period: '',
      features: [
        'Özel altyapı',
        'Öncelikli destek',
        'SLA garantisi',
        'Özel entegrasyonlar',
      ],
      cta_text: 'Bizimle İletişime Geçin',
      cta_url: '/iletisim',
      highlighted: false,
      isEnterprise: true,
    });
  } catch (err) {
    console.error('[landing] failed to merge packages:', err);
  }
}

/**
 * Resolve landing config. Returns `null` when the feature is disabled
 * (no row, invalid JSON, or `enabled: false`) so callers can fall
 * through to the next route.
 */
async function loadLandingConfig(c: {
  env: Bindings;
}): Promise<LandingConfig | null> {
  const result = await c.env.DB.prepare(
    "SELECT value FROM global_settings WHERE key = 'landing_config'"
  ).first<{ value: string }>();

  let config: LandingConfig | null = null;
  try {
    config = result?.value ? (JSON.parse(result.value) as LandingConfig) : null;
  } catch {
    config = null;
  }
  if (!config || !config.enabled) return null;

  await mergePackagesIntoPricing(c, config);
  return config;
}

// Shared render helper — used by both the /landing route here and by
// the admin-domain `/` handler in src/index.ts.
//
// Accepts either a Hono context (so we can read `cspNonce` via
// `c.get('cspNonce')`) or a plain `{ env }` object for callers that
// don't have a full request context yet. The latter falls back to
// `undefined` for the nonce — the rendered inline script then ships
// without a nonce attribute and is implicitly allowed by the CSP
// middleware's bail-out path when no nonce was generated.
export async function serveLanding(c: {
  env: Bindings;
  get?: (key: 'cspNonce') => string | undefined;
}): Promise<Response | null> {
  const config = await loadLandingConfig(c);
  if (!config) return null;

  const cspNonce = c.get?.('cspNonce');

  const brand = config.brand ?? {};
  const title = `${brand.name || 'WorkerCms'}${brand.tagline ? ' — ' + brand.tagline : ''}`;
  const description = config.hero?.subtitle;

  const head = createElement(
    Fragment,
    null,
    createElement('link', {
      key: 1,
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    }),
    createElement('link', {
      key: 2,
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossOrigin: 'anonymous',
    })
  );

  // Inline the pre-bundled landing hydration script via bodyEnd.
  const clientScript = createElement('script', {
    nonce: cspNonce,
    dangerouslySetInnerHTML: { __html: LANDING_CLIENT_JS },
  });

  return renderPage(
    createElement(Shell, {
      lang: 'tr',
      title,
      description,
      // Start in dark mode by default (legacy behaviour of the hand-
      // rolled landing). The boot script still honours user preference
      // in localStorage, so a returning visitor keeps their choice.
      themeClass: 'dark',
      themeBootScript: DEFAULT_THEME_BOOT,
      cspNonce,
      head,
      bodyEnd: clientScript,
      children: createElement(Landing, { config }),
    })
  );
}

landingRoute.get('/landing', async (c) => {
  const res = await serveLanding(c);
  return res || c.notFound();
});

export default landingRoute;
