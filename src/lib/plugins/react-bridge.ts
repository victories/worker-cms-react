/**
 * React bridge for plugin hook output.
 *
 * The plugin engine's `page.head`, `page.bodyStart`, and `page.bodyEnd`
 * filters were designed for the old Hono JSX pipeline where handlers
 * concatenated raw HTML strings into the document. The new React SSR
 * pipeline uses `<Shell head={...} bodyStart={...} bodyEnd={...}>`
 * which expects `ReactNode`s.
 *
 * Rather than rewrite every existing plugin to return React elements
 * (a breaking API change that Faz 7 will tackle properly), we keep
 * the string-based hook contract and wrap each output in a shim that
 * React can render without parsing the HTML in the worker.
 *
 * ## `<body>` slots
 *
 * Easy case: React allows `<div dangerouslySetInnerHTML>` anywhere in
 * the body subtree, so we wrap each slot's HTML in a `<div>` and hand
 * it to `<Shell bodyStart={...} bodyEnd={...}>`. Analytics scripts,
 * widget markup, toast containers — all work transparently.
 *
 * ## `<head>` slot
 *
 * Hard case: React's `<head>` does not accept arbitrary wrapper
 * elements with `dangerouslySetInnerHTML`, and plugin HTML may
 * contain multiple top-level `<meta>` / `<script>` / `<link>`
 * children. We emit:
 *
 *   1. `<script type="text/x-plugin-head">` whose textContent carries
 *      the raw HTML verbatim. Non-JS MIME type = the browser parses
 *      it as a script element but never executes it.
 *   2. A companion `<script>` with a tiny boot snippet that walks
 *      every marker, parses its textContent through a `<template>`,
 *      and moves each resulting child into `<head>` *before* first
 *      paint (we emit it high in head so it runs during parse).
 *
 * Net result: plugin authors keep their string-based hook contract
 * and the HTML still ends up as real `<head>` children. Crawlers that
 * execute JS (Googlebot does) pick up the injected tags. Crawlers
 * that don't… wouldn't have handled the old pipeline any better:
 * in both cases our React-rendered `<SEOHead>` already emits the
 * indexable `<title>` / `<meta description>` / OG tags directly.
 *
 * ## Extending to ReactNode plugin output
 *
 * Faz 7 will add a `PluginReactNode` branded type that plugins can
 * return to skip the shim entirely. Not wired here because no plugin
 * in the repo uses it yet.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { pluginEngine } from './engine';
import type { Site } from '../../types';

/**
 * Rehome boot — inserted once alongside the head marker. Walks every
 * `<script type="text/x-plugin-head">` at parse time and relocates
 * its inner HTML into real `<head>` children. Runs synchronously so
 * analytics and meta tags land before first paint.
 *
 * Kept minimal (~220 bytes) so inlining it on every page is cheap.
 */
const PLUGIN_HEAD_REHOME_BOOT =
  '(function(){try{var s=document.querySelectorAll(\'script[type="text/x-plugin-head"]\');' +
  'for(var i=0;i<s.length;i++){var t=document.createElement("template");' +
  't.innerHTML=s[i].textContent||"";var f=t.content;' +
  'while(f.firstChild)document.head.appendChild(f.firstChild);' +
  's[i].parentNode.removeChild(s[i]);}}catch(e){}})();';

/**
 * Collect `page.head`, `page.bodyStart`, `page.bodyEnd` plugin output
 * for the current request. Returns ReactNode slots the route handler
 * can drop into `<Shell>` props:
 *
 *   const slots = await collectPluginSlots(site);
 *   return renderPage(
 *     createElement(Shell, {
 *       head: createElement(Fragment, null, seoHead, slots.head),
 *       bodyStart: slots.bodyStart,
 *       bodyEnd: slots.bodyEnd,
 *       children: ...,
 *     })
 *   );
 */
export async function collectPluginSlots(site: Site): Promise<{
  head: ReactNode;
  bodyStart: ReactNode;
  bodyEnd: ReactNode;
}> {
  const [headHtml, bodyStartHtml, bodyEndHtml] = await Promise.all([
    pluginEngine.executeFilter('page.head', '', site),
    pluginEngine.executeFilter('page.bodyStart', '', site),
    pluginEngine.executeFilter('page.bodyEnd', '', site),
  ]);

  const headMarker = renderPluginHeadSlot(headHtml);
  const head = headMarker
    ? createElement(Fragment, null, headMarker, pluginHeadRehomeScript())
    : null;

  return {
    head,
    bodyStart: renderPluginBodySlot(bodyStartHtml, 'plugin-body-start'),
    bodyEnd: renderPluginBodySlot(bodyEndHtml, 'plugin-body-end'),
  };
}

/**
 * Build the `<head>`-safe node for a plugin HTML string.
 * Emits a non-executing marker script carrying the raw HTML plus
 * the rehome boot. Returns `null` when the hook produced nothing so
 * we don't pay for the boot script on empty pages.
 *
 * Exported so ad-hoc callers (e.g. the post page's hide-reading-time
 * CSS override) can merge their own HTML string with the rest.
 */
export function renderPluginHeadSlot(html: string): ReactNode {
  if (!html || !html.trim()) return null;
  return createElement(
    'script',
    {
      type: 'text/x-plugin-head',
      dangerouslySetInnerHTML: { __html: html },
    },
  );
}

/**
 * Returns the rehome boot `<script>` that goes with any
 * `renderPluginHeadSlot(...)` output. Callers that assemble the
 * `<head>` node themselves should append this once — the
 * `collectPluginSlots` helper does it automatically via the Fragment
 * below.
 */
export function pluginHeadRehomeScript(): ReactNode {
  return createElement('script', {
    dangerouslySetInnerHTML: { __html: PLUGIN_HEAD_REHOME_BOOT },
  });
}

function renderPluginBodySlot(html: string, key: string): ReactNode {
  if (!html || !html.trim()) return null;
  return createElement('div', {
    key,
    className: key,
    dangerouslySetInnerHTML: { __html: html },
  });
}

/**
 * Run the `post.beforeRender` filter chain on the given HTML. The
 * returned string is expected to be passed into `<PostContent>`
 * which renders it via `<Prose><div dangerouslySetInnerHTML/></Prose>`.
 *
 * Plugin errors are swallowed inside `pluginEngine.executeFilter`, so
 * this helper never throws — it returns the last-good string.
 */
export async function wrapPostContent(
  html: string,
  post: unknown
): Promise<string> {
  return pluginEngine.executeFilter('post.beforeRender', html || '', post);
}
