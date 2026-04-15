import { Hono } from 'hono';
import { createElement } from 'react';
import type { Bindings, Variables } from '../../types';
import { renderPage } from '../../lib/ssr';
import { Shell } from '../../ssr/shell';
import { SsrTest } from '../../ssr/pages/SsrTest';

/**
 * Faz 0 smoke test route.
 *
 * GET /ssr-test → renders a React 19 page via react-dom/server.edge.
 * Used to prove the full SSR + Tailwind + shadcn tokens pipeline works
 * before we start porting real routes (Faz 2+).
 *
 * This route is written as a plain .ts file (no JSX) so we don't have
 * to pick between hono/jsx and react JSX pragmas at the file level —
 * createElement keeps the handler runtime-agnostic.
 *
 * Deleted in Faz 8 along with the rest of the migration scaffolding.
 */
const ssrTest = new Hono<{ Bindings: Bindings; Variables: Variables }>();

ssrTest.get('/ssr-test', () =>
  renderPage(
    createElement(
      Shell,
      {
        lang: 'tr',
        title: 'SSR Test — wp-cms-v2',
        description: 'Faz 0 React SSR smoke test',
        themeClass: 'dark',
      },
      createElement(SsrTest)
    )
  )
);

export default ssrTest;
