/**
 * Plugin slot collectors — v2.
 *
 * Thin helpers around `pluginEngine.executeFilter(...)` so route handlers
 * can pre-fetch every render slot in parallel and drop the result into
 * `<Shell>` / `<PublisherLayout>` props without repeating boilerplate.
 *
 * Each collector starts with an empty `ReactNode[]` and lets every
 * registered handler push onto the accumulator. Handlers that don't
 * care just return the array unchanged.
 *
 * Contact the route handlers — this module has zero side effects.
 */

import type { ReactNode } from 'react';
import { pluginEngine } from './engine';
import type { HookName, PluginPostContext } from './types';
import type { Site } from '../../types';

const EMPTY: ReactNode[] = [];

/** Run `ui.head` and return the accumulated ReactNode[]. */
export function collectHeadNodes(site: Site): Promise<ReactNode[]> {
  return pluginEngine.executeFilter('ui.head', EMPTY.slice() as ReactNode[], site);
}

/** Run `ui.bodyStart` and return the accumulated ReactNode[]. */
export function collectBodyStartNodes(site: Site): Promise<ReactNode[]> {
  return pluginEngine.executeFilter('ui.bodyStart', EMPTY.slice() as ReactNode[], site);
}

/** Run `ui.bodyEnd` and return the accumulated ReactNode[]. */
export function collectBodyEndNodes(site: Site): Promise<ReactNode[]> {
  return pluginEngine.executeFilter('ui.bodyEnd', EMPTY.slice() as ReactNode[], site);
}

/** Run a site-scoped layout slot hook (headerRight, sidebarTop, sidebarBottom, footerStart, footerEnd). */
export function collectSiteSlot(
  hook: Extract<HookName, `ui.slot.${'headerRight' | 'sidebarTop' | 'sidebarBottom' | 'footerStart' | 'footerEnd'}`>,
  site: Site
): Promise<ReactNode[]> {
  return pluginEngine.executeFilter(hook, EMPTY.slice() as ReactNode[], site);
}

/** Run a post-scoped layout slot hook (postHeader / postFooter). */
export function collectPostSlot(
  hook: Extract<HookName, `ui.slot.${'postHeader' | 'postFooter'}`>,
  post: PluginPostContext
): Promise<ReactNode[]> {
  return pluginEngine.executeFilter(hook, EMPTY.slice() as ReactNode[], post);
}

/**
 * Bundle result for site-level slots that the PublisherLayout consumes.
 * Route handlers call `collectSiteLayoutSlots()` once and spread the
 * result into the layout props.
 */
export interface SiteLayoutSlots {
  headerRight: ReactNode[];
  sidebarTop: ReactNode[];
  sidebarBottom: ReactNode[];
  footerStart: ReactNode[];
  footerEnd: ReactNode[];
}

export async function collectSiteLayoutSlots(site: Site): Promise<SiteLayoutSlots> {
  const [headerRight, sidebarTop, sidebarBottom, footerStart, footerEnd] =
    await Promise.all([
      collectSiteSlot('ui.slot.headerRight', site),
      collectSiteSlot('ui.slot.sidebarTop', site),
      collectSiteSlot('ui.slot.sidebarBottom', site),
      collectSiteSlot('ui.slot.footerStart', site),
      collectSiteSlot('ui.slot.footerEnd', site),
    ]);
  return { headerRight, sidebarTop, sidebarBottom, footerStart, footerEnd };
}

/**
 * Bundle result for per-post slots. `/:slug` handler calls this in
 * addition to `collectSiteLayoutSlots()`.
 */
export interface PostLayoutSlots {
  postHeader: ReactNode[];
  postFooter: ReactNode[];
}

export async function collectPostLayoutSlots(post: PluginPostContext): Promise<PostLayoutSlots> {
  const [postHeader, postFooter] = await Promise.all([
    collectPostSlot('ui.slot.postHeader', post),
    collectPostSlot('ui.slot.postFooter', post),
  ]);
  return { postHeader, postFooter };
}

/**
 * Bundle result for the three document-level hooks. The keys line up
 * with the matching `<Shell>` props so callers can spread directly.
 */
export interface DocumentSlots {
  head: ReactNode[];
  bodyStart: ReactNode[];
  bodyEnd: ReactNode[];
}

export async function collectDocumentSlots(site: Site): Promise<DocumentSlots> {
  const [head, bodyStart, bodyEnd] = await Promise.all([
    collectHeadNodes(site),
    collectBodyStartNodes(site),
    collectBodyEndNodes(site),
  ]);
  return { head, bodyStart, bodyEnd };
}
