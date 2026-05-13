import { Hono } from 'hono';
import { createElement } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell, DEFAULT_THEME_BOOT } from '../../ssr/shell';
import { Legal } from '../../ssr/pages/Legal';
import { LEGAL_PAGES, findLegalPage, renderLegalContent } from '../../lib/legal-pages';

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
 * slug without conflict.
 */

const legalRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

  const contentHtml = renderLegalContent(rawContent, brand);
  const resolvedDescription = renderLegalContent(description, brand);
  const cspNonce = c.get('cspNonce');

  return renderPage(
    createElement(Shell, {
      lang,
      title: `${title} — ${brand}`,
      description: resolvedDescription,
      themeBootScript: DEFAULT_THEME_BOOT,
      cspNonce,
      children: createElement(Legal, {
        title,
        description: resolvedDescription,
        contentHtml,
        brandName: brand,
      }),
    })
  );
});

// Optional index page listing all legal pages — handy for site admins
// who want to link to `/legal/` from a footer "Legal" group.
legalRoute.get('/', async (c) => {
  const lang = (c.get('lang') as string) === 'en' ? 'en' : 'tr';
  const site = c.get('site') as { name?: string } | null;
  const brand = (site?.name && site.name.trim()) || 'WorkerCMS';
  const cspNonce = c.get('cspNonce');

  const heading = lang === 'en' ? 'Legal' : 'Yasal Sayfalar';
  const intro = lang === 'en' ? 'Platform legal pages.' : 'Platforma ait yasal sayfalar.';
  const items = LEGAL_PAGES.map((p) => {
    const label = lang === 'en' ? p.footer_label_en : p.footer_label_tr;
    return `<li><a href="/legal/${p.slug}">${label}</a></li>`;
  }).join('');

  const contentHtml = `<p>${intro}</p><ul>${items}</ul>`;

  return renderPage(
    createElement(Shell, {
      lang,
      title: `${heading} — ${brand}`,
      description: heading,
      themeBootScript: DEFAULT_THEME_BOOT,
      cspNonce,
      children: createElement(Legal, {
        title: heading,
        description: heading,
        contentHtml,
        brandName: brand,
      }),
    })
  );
});

export default legalRoute;
