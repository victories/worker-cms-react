/**
 * Style presets — shadcn/create-style "Style" bundles.
 *
 * Each preset is a one-click swap for:
 *   - a palette (referenced by slug from the server's palette list)
 *   - a radius value
 *   - a font family triple (sans / heading / mono)
 *
 * The sidebar's "Stil" row surfaces these; picking one fires off
 * palette-apply + font-set + radius-set in the StyleEditor. Users who
 * want finer control can still tweak individual rows below.
 */

export interface StylePreset {
  slug: string;
  /** Display name shown under "Stil". */
  name: string;
  /** One-line description for tooltip / popover subtitle. */
  description: string;
  /** Palette slug from the server's preset list (e.g. "neutral", "rose"). */
  paletteSlug: string;
  /** --radius value (with unit). */
  radius: string;
  fonts: {
    sans: string;
    heading: string;
    mono: string;
  };
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    slug: 'nova',
    name: 'Nova',
    description: 'Modern neutral — Inter everywhere, rounded 0.5rem.',
    paletteSlug: 'neutral',
    radius: '0.5rem',
    fonts: { sans: 'Inter', heading: 'Inter', mono: 'JetBrains Mono' },
  },
  {
    slug: 'mono',
    name: 'Mono',
    description: 'Slate + monospace headings — geeky editorial feel.',
    paletteSlug: 'slate',
    radius: '0.25rem',
    fonts: { sans: 'Inter', heading: 'JetBrains Mono', mono: 'JetBrains Mono' },
  },
  {
    slug: 'editorial',
    name: 'Editorial',
    description: 'Lora serif for headings, Roboto body — classic magazine.',
    paletteSlug: 'stone',
    radius: '0.375rem',
    fonts: { sans: 'Roboto', heading: 'Lora', mono: 'Fira Code' },
  },
  {
    slug: 'vivid',
    name: 'Vivid',
    description: 'Rose accent + Poppins — high-contrast lifestyle vibe.',
    paletteSlug: 'rose',
    radius: '0.75rem',
    fonts: { sans: 'Poppins', heading: 'Poppins', mono: 'JetBrains Mono' },
  },
  {
    slug: 'ocean',
    name: 'Ocean',
    description: 'Blue accent + Manrope — crisp SaaS look.',
    paletteSlug: 'blue',
    radius: '0.5rem',
    fonts: { sans: 'Manrope', heading: 'Manrope', mono: 'Fira Code' },
  },
  {
    slug: 'growth',
    name: 'Growth',
    description: 'Emerald + DM Sans — energetic, fintech-ish.',
    paletteSlug: 'emerald',
    radius: '0.625rem',
    fonts: { sans: 'DM Sans', heading: 'DM Sans', mono: 'JetBrains Mono' },
  },
  {
    slug: 'noir',
    name: 'Noir',
    description: 'Zinc + Playfair — dark editorial with display headings.',
    paletteSlug: 'zinc',
    radius: '0.375rem',
    fonts: { sans: 'Inter', heading: 'Playfair Display', mono: 'JetBrains Mono' },
  },
];
