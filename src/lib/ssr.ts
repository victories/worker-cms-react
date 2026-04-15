/**
 * React SSR helper for Hono route handlers on Cloudflare Workers.
 *
 * Usage from a handler:
 *
 *   import { renderPage } from '../../lib/ssr';
 *   import { createElement } from 'react';
 *   import { Shell } from '../../ssr/shell';
 *   import { SsrTest } from '../../ssr/pages/SsrTest';
 *
 *   app.get('/ssr-test', () =>
 *     renderPage(createElement(Shell, { title: 'Hello' },
 *       createElement(SsrTest)
 *     ))
 *   );
 *
 * The wrapper uses `react-dom/server.edge` which is the Workers-compatible
 * build of ReactDOMServer. It exposes `renderToReadableStream` so the
 * response can stream bytes as the tree renders, minimising TTFB.
 *
 * Why `renderToReadableStream` instead of `renderToString`?
 * - Streaming: start sending bytes before the whole tree is done.
 * - Suspense support: if a component throws a promise we can show
 *   fallbacks and resume when it resolves.
 * - Smaller memory footprint on hot paths.
 *
 * React 19's renderToReadableStream emits `<!DOCTYPE html>` by itself when
 * the root element is `<html>`, so we do NOT prepend one manually.
 */

// @ts-ignore — types for the `edge` export aren't exposed in all @types/react-dom versions.
import { renderToReadableStream } from 'react-dom/server.edge';
import type { ReactElement } from 'react';

export interface RenderPageOptions {
  /** HTTP status, defaults to 200 */
  status?: number;
  /** Extra response headers to merge with the content-type default */
  headers?: HeadersInit;
  /**
   * Called if the React tree throws during rendering.
   * If it also throws, a minimal error page is returned.
   */
  onError?: (error: unknown) => void;
}

export async function renderPage(
  element: ReactElement,
  options: RenderPageOptions = {}
): Promise<Response> {
  try {
    const reactStream = await renderToReadableStream(element, {
      onError(err: unknown) {
        // Surface SSR errors in the worker log so Cloudflare tails can see them.
        console.error('[ssr] renderToReadableStream error:', err);
        options.onError?.(err);
      },
    });

    const headers = new Headers(options.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'text/html; charset=utf-8');
    }

    return new Response(reactStream, {
      status: options.status ?? 200,
      headers,
    });
  } catch (err) {
    console.error('[ssr] fatal render error:', err);
    return new Response(
      '<!doctype html><meta charset=utf-8><title>Render error</title><h1>500 — Render failed</h1>',
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }
}
