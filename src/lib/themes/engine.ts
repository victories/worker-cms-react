// Theme system v2 — engine
//
// Loads the active theme for a site from `themes` + `site_themes`,
// merges palette overrides and any per-site custom CSS overrides,
// and produces an `ActiveTheme` ready to hand to `<ThemeStyles>` in
// the SSR shell.
//
// No React imports here — this file runs in data-fetching code paths.
// The theme-to-component mapping (`THEME_REGISTRY`) is a separate
// concern handled in `src/ssr/layouts/PublisherLayout.tsx`; for the
// MVP there is only one entry (`publisher` → `PublisherLayout`), so
// we don't even need a registry yet.

import type {
  ActiveTheme,
  CssVars,
  Palette,
  SiteThemeOverrides,
  ThemeManifest,
  ThemeRow,
} from './types';
import { DEFAULT_PALETTE_SLUG, PALETTES, getPalette } from './palettes';

/** Hard fallback manifest used when a theme has a malformed layout_config. */
const FALLBACK_MANIFEST: ThemeManifest = {
  manifest_version: 2,
  entry: 'publisher',
  palette_variants: Object.keys(PALETTES),
  features: { darkMode: true, search: true, adSlots: { top: true, mid: true } },
};

/**
 * Built-in fallback theme, used when a site has no active theme row
 * in `site_themes`. Mirrors the `default-publisher` seed so the public
 * site never renders un-themed.
 */
const FALLBACK_ACTIVE: ActiveTheme = {
  themeSlug: 'default-publisher',
  themeName: 'Default Publisher',
  manifest: FALLBACK_MANIFEST,
  paletteSlug: DEFAULT_PALETTE_SLUG,
  paletteName: PALETTES[DEFAULT_PALETTE_SLUG]!.name,
  colorMode: 'light',
  supportsDarkMode: true,
  cssLight: PALETTES[DEFAULT_PALETTE_SLUG]!.light,
  cssDark: PALETTES[DEFAULT_PALETTE_SLUG]!.dark,
};

function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Merge a CSS-var map on top of a base map. Only non-empty string
 * values in `overrides` are applied — so an override block with an
 * empty string for `--primary` is ignored rather than clearing the
 * base value.
 */
export function applyCssOverrides(base: CssVars, overrides: CssVars): CssVars {
  const merged: CssVars = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'string' && value.length > 0) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Merge a palette's light/dark overrides on top of a theme's base
 * `css_variables` block. The base is expected to already be in shadcn
 * HSL form (bare `H S% L%` values keyed with leading `--`).
 */
export function applyPaletteOverrides(
  base: CssVars,
  palette: Palette
): { cssLight: CssVars; cssDark: CssVars } {
  return {
    cssLight: applyCssOverrides(base, palette.light),
    // For dark we start from the palette's dark block directly — the
    // base `css_variables` are the light-mode defaults and should not
    // bleed through into `.dark` because dark mode redeclares them.
    cssDark: { ...palette.dark },
  };
}

/**
 * Parse a `ThemeRow` + its parsed overrides into the runtime
 * `ActiveTheme` shape. Exported for unit tests and for the admin
 * API that previews a theme without committing overrides.
 */
export function buildActiveTheme(
  row: ThemeRow,
  overrides: SiteThemeOverrides
): ActiveTheme {
  const baseCss = safeParse<CssVars>(row.css_variables, {});
  const manifest = safeParse<ThemeManifest>(row.layout_config, FALLBACK_MANIFEST);

  // Palette: overrides first, then the first manifest-declared variant,
  // finally fall back to neutral.
  const requestedPalette = overrides.palette || manifest.palette_variants?.[0];
  const palette =
    getPalette(requestedPalette) ??
    getPalette(DEFAULT_PALETTE_SLUG)!;

  const { cssLight, cssDark } = applyPaletteOverrides(baseCss, palette);

  // Per-site custom CSS overrides (fine-grained tweaks from admin).
  const userCss = overrides.css ?? {};
  const finalLight = applyCssOverrides(cssLight, userCss);
  const finalDark = applyCssOverrides(cssDark, userCss);

  const supportsDarkMode = manifest.features?.darkMode === true;
  const colorMode: 'light' | 'dark' =
    supportsDarkMode && overrides.mode === 'dark' ? 'dark' : 'light';

  return {
    themeSlug: row.slug,
    themeName: row.name,
    manifest,
    paletteSlug: palette.slug,
    paletteName: palette.name,
    colorMode,
    supportsDarkMode,
    cssLight: finalLight,
    cssDark: finalDark,
  };
}

/**
 * Load the active theme for a site from D1. Returns the built-in
 * fallback if the site has no `site_themes` row or the join fails.
 * This is what public routes call during request handling.
 */
export async function loadActiveTheme(
  db: D1Database,
  siteId: number
): Promise<ActiveTheme> {
  try {
    const row = await db
      .prepare(
        `SELECT t.*, st.custom_overrides
           FROM site_themes st
           JOIN themes t ON t.id = st.theme_id
          WHERE st.site_id = ? AND st.is_active = 1
          LIMIT 1`
      )
      .bind(siteId)
      .first<ThemeRow>();

    if (!row) return FALLBACK_ACTIVE;

    const overrides = safeParse<SiteThemeOverrides>(row.custom_overrides, {});
    return buildActiveTheme(row, overrides);
  } catch {
    return FALLBACK_ACTIVE;
  }
}

/** Re-exported for admin/public consumers that want the raw registry. */
export { PALETTES, DEFAULT_PALETTE_SLUG };
