/**
 * Scroll reveal observer. Walks every [data-reveal] element on the
 * page. For elements already in the viewport at boot, do nothing —
 * they stay visible without animation (also avoids a one-frame flash
 * of opacity:0 between class application and IO callback). For
 * elements below the fold, applies .reveal class (CSS hides it via
 * opacity:0) and observes via IntersectionObserver to add .is-visible
 * when the element enters the viewport.
 *
 * Reduced-motion users: skipped entirely. CSS already short-circuits
 * .reveal to opacity:1 + transform:none, so adding .reveal would be a
 * no-op anyway. We avoid the observer cost.
 */
export function attachScrollReveal(): () => void {
  if (typeof window === 'undefined') return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]')
  );
  if (targets.length === 0) return () => {};

  if (reduced) {
    return () => {};
  }

  const viewportHeight = window.innerHeight;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -15% 0px', threshold: 0 }
  );

  for (const el of targets) {
    const rect = el.getBoundingClientRect();
    // Already in viewport (or above) — leave visible, don't animate.
    // The 15% bottom margin matches the IO rootMargin so the threshold
    // for "in view" is consistent.
    if (rect.top < viewportHeight * 0.85) {
      continue;
    }
    el.classList.add('reveal');
    observer.observe(el);
  }

  return () => observer.disconnect();
}
