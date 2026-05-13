import { Hono } from 'hono';
import { createElement, Fragment } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { LandingPage } from '../../ssr/pages/Landing';
import { LEGAL_PAGES, findLegalPage, renderLegalContent } from '../../lib/legal-pages';
import { loadLandingConfig } from './landing';
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

async function renderLegal(
  c: any,
  title: string,
  description: string,
  contentHtml: string,
  brand: string,
  lang: 'tr' | 'en'
) {
  const cspNonce = c.get('cspNonce');
  // Reuse the landing config so the nav/footer match the marketing
  // site. When landing is disabled or absent we still render — the
  // LandingPage component degrades gracefully with empty config bits.
  const cfg = (await loadLandingConfig(c)) ?? {
    enabled: true,
    brand: { name: brand },
  };

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
      children: createElement(LandingPage, {
        title,
        contentHtml,
        excerpt: description,
        config: cfg,
      }),
    })
  );
}

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
