/**
 * Landing page hydration entry.
 *
 * The `/landing` page is mostly static SSR. Only one tiny client side
 * effect runs: an IntersectionObserver that adds `.in` to every
 * `.reveal` element when it scrolls into view, matching the inline
 * script at the bottom of the v2.html mock.
 *
 * Previously this entry also imported `react-dom/client` to hydrate a
 * theme-toggle island; the v2 design is dark-only so that island was
 * removed, which lets the entry ship a tiny ~3 KB IntersectionObserver
 * bundle instead of pulling in 40+ KB of React DOM hydration runtime.
 *
 * The payload is bundled by `scripts/build-client.mjs` into
 * `src/ssr/__generated__/landing-client.ts` and the route handler
 * inlines that string via `<script>` in `<Shell bodyEnd>`.
 */

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountScrollReveal, { once: true });
} else {
  mountScrollReveal();
}
