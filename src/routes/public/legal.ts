import { Hono } from 'hono';
import { createElement, Fragment } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { LandingPage, StatusPageView } from '../../ssr/pages/Landing';
import { LEGAL_PAGES, findLegalPage, renderLegalContent } from '../../lib/legal-pages';
import { loadLandingConfig } from './landing';
import { LANDING_EN } from '../../ssr/pages/landing-en';
import {
  getStatusSnapshot,
  refreshStatusSnapshot,
  defaultSnapshot,
  isStale,
} from '../../lib/status';
import { LANDING_CLIENT_JS } from '../../ssr/__generated__/landing-client';
import { TAILWIND_LANDING_CSS } from '../../ssr/__generated__/tailwind-landing';

/**
 * Default legal page route — `/legal/:slug`.
 *
 * Renders the platform-default content for privacy / terms / KVKK /
 * distance sales / refund / cookies / contact (shipped in
 * `src/lib/legal-pages.ts`). These pages exist on every site so a
 * credit-card-accepting platform satisfies Turkish consumer-law
 * disclosure requirements out of the box.
 *
 * Mounted at `/legal` so it never collides with the CMS `/:slug`
 * page route — a site can ship its own custom copy under a different
 * slug without conflict. On the management site (workercms.com)
 * the response is rendered with the landing v2 chrome (same Nav +
 * footer as /landing); other tenant sites get a stripped-down Shell
 * that still uses the LandingPage component for visual consistency.
 */

const legalRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Resolve the landing config used for the nav/footer chrome. English
// pages use the static English config; Turkish pages use the DB config
// (falling back to a minimal brand-only config when absent).
async function resolveChromeConfig(c: any, brand: string, lang: 'tr' | 'en') {
  return lang === 'en'
    ? LANDING_EN
    : (await loadLandingConfig(c)) ?? { enabled: true, brand: { name: brand } };
}

// Build the shared landing-chrome Shell (fonts + landing CSS + reveal
// script) around an arbitrary page body.
function renderChrome(
  c: any,
  title: string,
  description: string,
  brand: string,
  lang: 'tr' | 'en',
  children: any
) {
  const cspNonce = c.get('cspNonce');
  return renderPage(
    createElement(Shell, {
      lang,
      title: `${title} — ${brand}`,
      description,
      themeClass: 'dark',
      // themeBootScript intentionally omitted — landing v2 is dark-only, no client toggle to avoid React #418 hydration mismatch
      cspNonce,
      tailwindCss: TAILWIND_LANDING_CSS,
      head: createElement(
        Fragment,
        null,
        createElement('link', {
          key: 'gf-1',
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        }),
        createElement('link', {
          key: 'gf-2',
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossOrigin: 'anonymous',
        }),
        createElement('link', {
          key: 'gf-3',
          rel: 'stylesheet',
          href:
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700' +
            '&family=Instrument+Serif' +
            '&family=JetBrains+Mono:wght@400&display=swap',
        })
      ),
      bodyEnd: createElement('script', {
        nonce: cspNonce,
        dangerouslySetInnerHTML: { __html: LANDING_CLIENT_JS },
      }),
      children,
    })
  );
}

async function renderLegal(
  c: any,
  title: string,
  description: string,
  contentHtml: string,
  brand: string,
  lang: 'tr' | 'en'
) {
  const cfg = await resolveChromeConfig(c, brand, lang);
  return renderChrome(
    c,
    title,
    description,
    brand,
    lang,
    createElement(LandingPage, {
      title,
      contentHtml,
      excerpt: description,
      config: cfg,
      lang,
      path: c.req.path,
    })
  );
}

// System status page — pulls component health from Cloudflare's status
// feed (cached in D1) and renders the polished StatusPageView. Registered
// before `/:slug` so it wins over the generic legal handler.
legalRoute.get('/durum', async (c) => {
  const lang = (c.get('lang') as string) === 'en' ? 'en' : 'tr';
  const site = c.get('site') as { name?: string } | null;
  const brand = (site?.name && site.name.trim()) || 'WorkerCMS';
  const page = findLegalPage('durum')!;
  const title = lang === 'en' ? page.title_en : page.title_tr;
  const description = renderLegalContent(
    lang === 'en' ? page.description_en : page.description_tr,
    brand
  );

  // Refresh in the background when the stored snapshot is missing or
  // stale, so the page itself stays fast. Render whatever we have now
  // (a fresh self-reported default on the very first visit).
  const stored = await getStatusSnapshot(c.env);
  if (!stored || isStale(stored)) {
    c.executionCtx?.waitUntil?.(refreshStatusSnapshot(c.env));
  }
  const snapshot = stored ?? defaultSnapshot(new Date().toISOString());

  const cfg = await resolveChromeConfig(c, brand, lang);
  return renderChrome(
    c,
    title,
    description,
    brand,
    lang,
    createElement(StatusPageView, {
      title,
      snapshot,
      config: cfg,
      lang,
      path: c.req.path,
      nowMs: Date.now(),
    })
  );
});

legalRoute.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const page = findLegalPage(slug);
  if (!page) return c.notFound();

  const lang = (c.get('lang') as string) === 'en' ? 'en' : 'tr';
  const site = c.get('site') as { name?: string } | null;
  const brand = (site?.name && site.name.trim()) || 'WorkerCMS';

  const title = lang === 'en' ? page.title_en : page.title_tr;
  const description = lang === 'en' ? page.description_en : page.description_tr;
  const rawContent = lang === 'en' ? page.content_en : page.content_tr;

  return renderLegal(
    c,
    title,
    renderLegalContent(description, brand),
    renderLegalContent(rawContent, brand),
    brand,
    lang
  );
});

legalRoute.get('/', async (c) => {
  const lang = (c.get('lang') as string) === 'en' ? 'en' : 'tr';
  const site = c.get('site') as { name?: string } | null;
  const brand = (site?.name && site.name.trim()) || 'WorkerCMS';
  const heading = lang === 'en' ? 'Legal' : 'Yasal Sayfalar';
  const intro = lang === 'en' ? 'Platform legal pages.' : 'Platforma ait yasal sayfalar.';
  const items = LEGAL_PAGES.map((p) => {
    const label = lang === 'en' ? p.footer_label_en : p.footer_label_tr;
    return `<li><a href="/legal/${p.slug}">${label}</a></li>`;
  }).join('');
  const contentHtml = `<p>${intro}</p><ul>${items}</ul>`;

  return renderLegal(c, heading, heading, contentHtml, brand, lang);
});

export default legalRoute;
