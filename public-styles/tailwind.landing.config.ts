/**
 * Landing-only Tailwind config. The mainline config (tailwind.config.ts)
 * scans every publisher component, so it pulls in `<Prose>` and the
 * full @tailwindcss/typography output (~34 KB of `.prose` rules) into
 * the shared bundle. Landing v2 doesn't use any of that, so we build
 * a second, slimmer bundle here whose content scan only sees the
 * landing page itself.
 *
 * Output goes to `src/ssr/__generated__/tailwind-landing.ts` and is
 * passed to `<Shell tailwindCss={...}>` by the landing-chrome routes
 * (`landing.ts`, `legal.ts`, post.ts's management-site branch).
 *
 * Everything else (palette tokens, ink/amber ramps, font families,
 * .landing-v2 custom CSS in input.css) is inherited from the main
 * config so the two stay visually identical.
 */
import base from './tailwind.config';
import type { Config } from 'tailwindcss';

export default {
  ...base,
  content: [
    // Only the landing surface — keeps the .prose typography plugin
    // out of this bundle since nothing here imports <Prose>.
    './src/ssr/pages/Landing.tsx',
    './src/client/landing-entry.tsx',
  ],
  // No typography plugin — landing has its own scoped .landing-v2
  // prose-ish styles in public-styles/input.css.
  plugins: [],
} satisfies Config;
