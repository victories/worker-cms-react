import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

/**
 * Tailwind config for the public-facing (publisher + landing) side of
 * Worker CMS. Admin has its own config under admin/tailwind.config.ts.
 *
 * content globs scan every file that can reference utility classes:
 * - src/ssr/**        — React SSR pages, layouts, components, islands
 * - packages/ui/**    — shared shadcn primitives (admin + public use)
 * - src/plugins/**    — bundled plugins (contact-form, social-share, ...)
 *                       may export React components with utility classes
 */
export default {
  darkMode: 'class',
  // Paths resolved relative to the CWD of the Tailwind CLI invocation,
  // which is the repo root (see scripts/build-public-css.mjs cwd: ROOT).
  content: [
    './src/ssr/**/*.{ts,tsx}',
    './packages/ui/**/*.{ts,tsx}',
    './src/plugins/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // var() first so theme styles can override; design-system font as
        // first hard-coded fallback for pages that don't set --font-*.
        heading: ['var(--font-heading, "Space Grotesk")', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-sans, "DM Sans")',          '"DM Sans"',       'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono, ui-monospace)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
