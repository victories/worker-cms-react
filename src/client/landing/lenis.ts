import Lenis from 'lenis';

/**
 * Lenis smooth scroll. Disabled when the user prefers reduced motion.
 * Native CSS scroll-behavior: smooth still handles anchor jumps for
 * those users via the [scroll-behavior:smooth] class on the landing
 * root.
 */
export function initLenis(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const lenis = new Lenis({
    duration: 1.0,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
  });

  let frame = 0;
  const tick = (time: number) => {
    lenis.raf(time);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    lenis.destroy();
  };
}
