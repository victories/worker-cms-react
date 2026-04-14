// Theme Engine — loads themes from the new themes + site_themes tables
// and converts them to the existing SiteTheme interface for backward compat.

import type { SiteTheme } from './public-db';
import { getLayoutTemplate } from './layoutResolver';
import { SYSTEM_THEMES, type PaletteVariant } from './themePresets';

export type ColorMode = 'light' | 'dark';

// Raw DB row from themes + site_themes join
export interface ThemeData {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  css_variables: string; // JSON string
  layout_config: string; // JSON string
  google_fonts: string;  // JSON string
  custom_css: string;
  custom_head_html: string;
  thumbnail_r2_key: string | null;
  is_system: number;
  // From site_themes join:
  custom_overrides?: string; // JSON string
}

/**
 * Load the active theme for a site from themes + site_themes tables.
 * Returns null if no active theme found (fallback to settings-based approach).
 */
export async function loadActiveTheme(db: D1Database, siteId: number): Promise<ThemeData | null> {
  const row = await db.prepare(`
    SELECT t.*, st.custom_overrides
    FROM site_themes st
    JOIN themes t ON t.id = st.theme_id
    WHERE st.site_id = ? AND st.is_active = 1
    LIMIT 1
  `).bind(siteId).first();

  return row as ThemeData | null;
}

/**
 * Merge base CSS variables with per-site overrides.
 * Overrides only replace keys that are explicitly set.
 */
export function mergeCssVariables(
  base: Record<string, string>,
  overrides: Record<string, string>
): Record<string, string> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== null && value !== '') {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Merge base layout config with per-site overrides.
 */
export function mergeLayoutConfig(
  base: Record<string, any>,
  overrides: Record<string, any>
): Record<string, any> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Generate a Google Fonts link URL from an array of font specs.
 * Input: ["Inter:400,500,600,700", "Playfair Display:400,700"]
 * Output: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;700&display=swap"
 */
export function getGoogleFontsUrl(fonts: string[]): string {
  if (!fonts || fonts.length === 0) return '';
  const families = fonts.map(f => {
    const [name, weights] = f.split(':');
    const encodedName = name.replace(/ /g, '+');
    if (weights) {
      const wgts = weights.split(',').join(';');
      return `family=${encodedName}:wght@${wgts}`;
    }
    return `family=${encodedName}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

/**
 * Look up a palette variant for a theme slug. Used when resolving
 * palette_slug/color_mode overrides stored in site_themes.custom_overrides.
 * Returns null if the theme has no palette variants or the requested slug
 * does not exist.
 */
export function findPaletteVariant(
  themeSlug: string,
  paletteSlug: string | undefined
): PaletteVariant | null {
  if (!paletteSlug) return null;
  const preset = SYSTEM_THEMES.find(t => t.slug === themeSlug);
  if (!preset || !preset.palette_variants) return null;
  return preset.palette_variants.find(p => p.slug === paletteSlug) || null;
}

/**
 * Merge CSS variables with palette variant overrides applied BEFORE per-site
 * customisations. Priority (lowest → highest):
 *   1. theme base css_variables
 *   2. palette_variants[paletteSlug][colorMode]
 *   3. user's custom_overrides.css_variables
 */
export function resolveThemeCssVariables(
  themeSlug: string,
  baseCssVars: Record<string, string>,
  paletteSlug: string | undefined,
  colorMode: ColorMode | undefined,
  userOverrides: Record<string, string> | undefined
): Record<string, string> {
  let merged = { ...baseCssVars };

  const variant = findPaletteVariant(themeSlug, paletteSlug);
  if (variant) {
    const mode: ColorMode = colorMode === 'dark' ? 'dark' : 'light';
    merged = mergeCssVariables(merged, variant[mode] as Record<string, string>);
  }

  if (userOverrides) {
    merged = mergeCssVariables(merged, userOverrides);
  }

  return merged;
}

/**
 * Convert ThemeData (from DB) to the existing SiteTheme interface for backward compatibility.
 * This allows the existing Layout components to work without changes.
 *
 * If the theme defines palette_variants and the site's custom_overrides includes
 * palette_slug/color_mode, the matching variant is merged on top of the base
 * CSS variables before user-level overrides are applied.
 */
export function themeToSiteTheme(theme: ThemeData): SiteTheme {
  let cssVars: Record<string, string> = {};
  let layoutConfig: Record<string, any> = {};
  let overrides: Record<string, any> = {};

  try { cssVars = JSON.parse(theme.css_variables || '{}'); } catch {}
  try { layoutConfig = JSON.parse(theme.layout_config || '{}'); } catch {}
  try { overrides = JSON.parse(theme.custom_overrides || '{}'); } catch {}

  // Apply palette variant (if any) on top of base, then user overrides
  const mergedCss = resolveThemeCssVariables(
    theme.slug,
    cssVars,
    overrides.palette_slug,
    overrides.color_mode,
    overrides.css_variables
  );
  const mergedLayout = mergeLayoutConfig(layoutConfig, overrides.layout_config || {});

  return {
    template: getLayoutTemplate(theme.slug),
    primary_color: mergedCss.primary_color || '#2563eb',
    secondary_color: mergedCss.secondary_color || '#10b981',
    bg_color: mergedCss.bg_color || '#f8fafc',
    surface_color: mergedCss.surface_color || '#ffffff',
    text_color: mergedCss.text_color || '#1e293b',
    text_secondary_color: mergedCss.text_secondary_color || '#64748b',
    border_color: mergedCss.border_color || '#e2e8f0',
    header_bg_color: mergedCss.header_bg_color || '#ffffff',
    header_text_color: mergedCss.header_text_color || '#0f172a',
    footer_bg_color: mergedCss.footer_bg_color || '#0f172a',
    footer_text_color: mergedCss.footer_text_color || '#94a3b8',
    link_color: mergedCss.link_color || '#2563eb',
    link_hover_color: mergedCss.link_hover_color || '#1d4ed8',
    font_family: mergedCss.font_family || 'Inter',
    heading_font_family: mergedCss.heading_font_family || 'Inter',
    site_logo: '',
    site_tagline: '',
    footer_text: '',
    posts_per_page: mergedLayout.posts_per_page || 10,
    nav_style: mergedLayout.nav_style || 'default',
    nav_particle_count: mergedLayout.nav_particle_count || 15,
    nav_animation_time: mergedLayout.nav_animation_time || 600,
    header_ad_code: '',
    header_ad_domain: '',
    header_ad_desktop: true,
    header_ad_embed_html: '',
    header_ad_amp_css: '',
    header_ad_amp_body: '',
    slider_enabled: false,
    gallery_section_code: '',
    // Publisher / palette metadata — only set when overrides provide it
    palette_slug: typeof overrides.palette_slug === 'string' ? overrides.palette_slug : undefined,
    color_mode: overrides.color_mode === 'dark' ? 'dark' : (overrides.color_mode === 'light' ? 'light' : undefined),
    supports_dark_mode: (SYSTEM_THEMES.find(t => t.slug === theme.slug)?.supports_dark_mode) === true,
    // Publisher ad slot codes (layout_config driven; may be empty string)
    ad_top_code: typeof mergedLayout.ad_top_code === 'string' ? mergedLayout.ad_top_code : undefined,
    ad_mid_code: typeof mergedLayout.ad_mid_code === 'string' ? mergedLayout.ad_mid_code : undefined,
  };
}
