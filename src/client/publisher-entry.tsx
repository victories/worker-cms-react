/**
 * Publisher hydration entry — bootstraps every interactive island on
 * the publisher site (Home, Post, Page, Archive, Search).
 *
 * Pattern:
 * - SSR renders each island as a placeholder element carrying
 *   `data-island="<name>"`.
 * - This script finds all such elements and calls `hydrateRoot()` with
 *   the matching React component.
 * - Each island is hydrated independently, so one failing island
 *   never takes down the others. Errors are swallowed with a console
 *   warning so a malformed plugin widget can't break the whole page.
 *
 * Bundled for production by a dedicated esbuild pass (added in
 * `scripts/build-client.mjs` at Faz 3 — not wired yet at Faz 2).
 * During Faz 2 this file is only imported by `src/ssr/__generated__`
 * type-checking, so TypeScript sees it without runtime execution.
 *
 * Adding a new island: export it from `src/ssr/islands/<Name>.tsx`,
 * register a new entry in `ISLANDS` below keyed by its `data-island`
 * value. The entry is a factory — it receives the placeholder element
 * so it can read adjacent `<script type="application/json"
 * data-island-data="<name>">` blobs for prop transport.
 */

import { createElement, type ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { ThemeToggle } from '../ssr/islands/ThemeToggle';
import { MobileDrawer } from '../ssr/islands/MobileDrawer';
import { SearchOverlay } from '../ssr/islands/SearchOverlay';
import type { NavMenuItem } from '@ui/nav-menu';

type IslandFactory = (el: Element) => ReactElement | null;

/**
 * Read a sibling `<script type="application/json" data-island-data="name">`
 * payload — used by islands that need serialized props from the server.
 */
function readIslandData<T>(name: string): T | null {
  const script = document.querySelector<HTMLScriptElement>(
    `script[data-island-data="${name}"]`
  );
  if (!script?.textContent) return null;
  try {
    return JSON.parse(script.textContent) as T;
  } catch (err) {
    console.warn(`[publisher-entry] failed to parse island-data for ${name}:`, err);
    return null;
  }
}

const ISLANDS: Record<string, IslandFactory> = {
  'theme-toggle': () => createElement(ThemeToggle),

  'mobile-drawer': () => {
    const items = readIslandData<NavMenuItem[]>('mobile-drawer') ?? [];
    return createElement(MobileDrawer, { items });
  },

  'search-overlay': () => {
    const data = readIslandData<{ action: string; placeholder?: string }>(
      'search-overlay'
    );
    return createElement(SearchOverlay, {
      action: data?.action ?? '/search',
      placeholder: data?.placeholder,
    });
  },
};

function hydrateIslands() {
  const targets = document.querySelectorAll<HTMLElement>('[data-island]');
  for (const el of targets) {
    const name = el.dataset.island;
    if (!name) continue;
    const factory = ISLANDS[name];
    if (!factory) {
      console.warn(`[publisher-entry] no island registered for "${name}"`);
      continue;
    }
    try {
      const element = factory(el);
      if (element) hydrateRoot(el, element);
    } catch (err) {
      console.error(`[publisher-entry] island "${name}" failed to hydrate:`, err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateIslands, { once: true });
} else {
  hydrateIslands();
}
