/** @jsxImportSource react */

/**
 * Landing page hydration entry.
 *
 * The `/landing` page is 100 % static SSR except for a single island:
 * the ThemeToggle button in the nav. Everything else (hero, features,
 * pricing, testimonials, CTA, footer) is plain HTML + CSS and needs no
 * JavaScript at all.
 *
 * So this entry point is deliberately tiny — it finds the placeholder
 * `<span data-island="theme-toggle">` emitted by the SSR Nav and
 * hydrates it with the same `<ThemeToggle>` component the publisher
 * uses. The payload is bundled by `scripts/build-client.mjs` into
 * `src/ssr/__generated__/landing-client.ts` as a TS string constant
 * that the route handler inlines via `<script>` in `<Shell bodyEnd>`.
 *
 * Keeping it this small means the bundle stays a few KB gzipped and
 * there is no reason to split or defer it.
 */

import { createElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { ThemeToggle } from '../ssr/islands/ThemeToggle';

function hydrateLandingIslands() {
  const targets = document.querySelectorAll<HTMLElement>(
    '[data-island="theme-toggle"]'
  );
  for (const el of targets) {
    try {
      hydrateRoot(el, createElement(ThemeToggle));
    } catch (err) {
      console.error('[landing-entry] theme-toggle hydration failed:', err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateLandingIslands, {
    once: true,
  });
} else {
  hydrateLandingIslands();
}
