/**
 * Landing page hydration entry.
 *
 * Boot sequence:
 *   1. hydrate the ThemeToggle island in the nav (existing)
 *   2. mount the framer-motion Wordmark via createRoot (NOT
 *      hydrateRoot — the per-character markup differs between SSR
 *      <span data-letter=...> children and the client m.span tree, so
 *      hydration would log a children-mismatch warning. createRoot
 *      replaces children in one render; SSR markup stays visible
 *      until this script runs so there is no flicker.)
 *   3. attach the scroll-reveal IntersectionObserver — adds .reveal
 *      then observes; above-the-fold elements receive .is-visible on
 *      the same frame, so no flash.
 *   4. init Lenis smooth scroll, reduced-motion-guarded.
 *
 * The bundle is produced by `scripts/build-client.mjs` into
 * `src/ssr/__generated__/landing-client.ts` as a TS string constant
 * that the route handler inlines via `<script>` in `<Shell bodyEnd>`.
 */

import { createElement, StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { ThemeToggle } from '../ssr/islands/ThemeToggle';
import { MotionRoot } from './landing/motion';
import { Wordmark } from './landing/Wordmark';
import { attachScrollReveal } from './landing/ScrollReveal';
import { initLenis } from './landing/lenis';

function hydrateThemeToggle() {
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-island="theme-toggle"]'
  )) {
    try {
      hydrateRoot(el, createElement(ThemeToggle));
    } catch (err) {
      console.error('[landing] theme-toggle hydration failed', err);
    }
  }
}

function mountWordmark() {
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-island="wordmark"]'
  )) {
    const text = el.getAttribute('aria-label') ?? '';
    if (!text) continue;
    // Use createRoot (full render, replaces children) instead of
    // hydrateRoot — the SSR markup uses <span data-letter=...> and
    // the client uses framer m.span; hydrateRoot would log a
    // children-mismatch warning.
    const className = Array.from(el.classList).join(' ');
    try {
      createRoot(el).render(
        createElement(
          StrictMode,
          null,
          createElement(
            MotionRoot,
            null,
            createElement(Wordmark, { text, className })
          )
        )
      );
    } catch (err) {
      console.error('[landing] wordmark mount failed', err);
    }
  }
}

function boot() {
  hydrateThemeToggle();
  mountWordmark();
  attachScrollReveal();
  initLenis();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
