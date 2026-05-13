/**
 * Landing page hydration entry.
 *
 * The `/landing` page is mostly static SSR. We hydrate two tiny bits:
 *
 *  1. **Theme toggle island** — the `<span data-island="theme-toggle">`
 *     placeholder emitted by the SSR Nav, swapped for the React
 *     `<ThemeToggle>` component the publisher also uses.
 *  2. **Scroll-reveal animations** — every `.reveal` element gets
 *     observed by `IntersectionObserver`; when it scrolls into view we
 *     add `.in`, which the CSS rule in `public-styles/input.css` uses
 *     to fade + slide it into place. This mirrors the inline script at
 *     the bottom of the v2.html mock so the visual feels identical.
 *
 * Keeping this entry point small means the bundle stays a few KB
 * gzipped after esbuild's minifier, so there is no reason to split or
 * defer it. The payload is bundled by `scripts/build-client.mjs` into
 * `src/ssr/__generated__/landing-client.ts` and the route handler
 * inlines that string via `<script>` in `<Shell bodyEnd>`.
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

/**
 * Mount the IntersectionObserver-driven fade-up animation. We use a
 * `threshold` of 0.08 and a negative bottom rootMargin so elements only
 * "reveal" once a meaningful slice is visible — matches the v2 mock.
 * After firing once each element is unobserved so the animation never
 * plays in reverse on a scroll-up.
 *
 * Falls back to making everything visible immediately when the browser
 * lacks IntersectionObserver (very old, but covers us cheaply) or when
 * the user has `prefers-reduced-motion: reduce` set.
 */
function mountScrollReveal() {
  const items = document.querySelectorAll<HTMLElement>('.reveal');
  if (items.length === 0) return;

  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    items.forEach((el) => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => io.observe(el));
}

function boot() {
  hydrateLandingIslands();
  mountScrollReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
