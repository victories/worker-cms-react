/**
 * Maps theme slugs to layout template names.
 * New themes map to the closest existing layout.
 *
 * The 3 original layouts (starter, modern, velvet) each have 2000+ lines
 * of complex CSS and markup. Rather than creating a unified layout,
 * we map each theme to the best-fitting existing layout and let
 * CSS variables handle the visual differences.
 *
 * The 'publisher' template is a newer editorial layout with an ad slot
 * above the header, a dashboard sidebar, a mid-content ad slot, a 4-column
 * footer, and built-in dark mode support via palette_variants.
 */
export type LayoutTemplate = 'starter' | 'modern' | 'velvet' | 'publisher';

export function getLayoutTemplate(themeSlug: string): LayoutTemplate {
  switch (themeSlug) {
    case 'starter':
    case 'corporate':
    case 'minimal':
      return 'starter';

    case 'modern':
    case 'magazine':
    case 'creative':
      return 'modern';

    case 'velvet':
    case 'developer':
      return 'velvet';

    case 'publisher':
      return 'publisher';

    default:
      return 'starter';
  }
}
