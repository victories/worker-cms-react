// Theme system v2 — types
//
// The new theme engine is built around shadcn/ui HSL tokens. A "theme"
// is a DB row in `themes` whose `css_variables` JSON holds the default
// `--background`/`--primary`/... HSL triples and whose `layout_config`
// JSON holds a v2 manifest (entry point, supported palettes, feature
// flags). Per-site overrides live in `site_themes.custom_overrides`
// and pick which palette + color mode to apply.
//
// This replaces the hex-color `SiteTheme` and ThemePreset shapes used
// by the old Hono JSX layouts. The only runtime consumer is the
// PublisherLayout React component; a future 3rd-party theme loader
// would register additional entries in the theme registry (Faz 8+).

/**
 * A plain record of CSS custom properties, keyed with the leading `--`.
 * Values are bare `H S% L%` triples (no `hsl()` wrapper) so the same
 * variables are usable both with `hsl(var(--primary))` in Tailwind
 * config and as direct fallback values.
 */
export type CssVars = Record<string, string>;

/**
 * A named palette variant. Declares light + dark overrides on top of
 * a theme's base css_variables. Callers merge these with
 * `applyPaletteOverrides` before handing the result to `<ThemeStyles>`.
 */
export interface Palette {
  slug: string;
  name: string;
  description?: string;
  light: CssVars;
  dark: CssVars;
}

/**
 * v2 theme manifest. Stored as JSON in `themes.layout_config` so we
 * don't need a schema migration.
 */
export interface ThemeManifest {
  manifest_version: 2;
  /** Component entry name, used by the theme registry to pick which
   *  React layout to render. Currently only 'publisher' exists. */
  entry: 'publisher';
  /** Allow-list of palette slugs this theme supports. Admins can swap
   *  between these without editing CSS variables. */
  palette_variants: string[];
  /** Optional feature flags — the admin UI uses these to hide/show
   *  config toggles. None are load-bearing at the rendering layer yet. */
  features?: {
    darkMode?: boolean;
    search?: boolean;
    adSlots?: { top?: boolean; mid?: boolean };
  };
}

/**
 * Raw DB row from `themes` joined with `site_themes` for the active
 * theme of a given site. Mirrors what D1 returns verbatim — strings
 * are still un-parsed JSON.
 */
export interface ThemeRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  author: string;
  /** JSON string → CssVars */
  css_variables: string;
  /** JSON string → ThemeManifest */
  layout_config: string;
  google_fonts: string;
  custom_css: string;
  custom_head_html: string;
  thumbnail_r2_key: string | null;
  is_system: number;
  /** From site_themes join — JSON string with `{ palette, mode, css? }` */
  custom_overrides?: string;
}

/**
 * Parsed per-site overrides. Stored as JSON in
 * `site_themes.custom_overrides`. The admin UI writes these when a
 * user picks a palette or toggles dark mode.
 */
export interface SiteThemeOverrides {
  /** Slug of the selected palette; falls back to the theme's first
   *  palette_variants entry if absent. */
  palette?: string;
  /** Active display mode. `undefined` means "respect OS preference". */
  mode?: 'light' | 'dark';
  /** Optional per-site CSS variable overrides. Merged on top of the
   *  palette layer so users can fine-tune individual tokens from the
   *  admin without editing palette files. Keys use leading `--`. */
  css?: CssVars;
}

/**
 * Resolved, merged theme ready for rendering. Produced by
 * `loadActiveTheme` in `engine.ts`. This is what SSR routes hand
 * to `<ThemeStyles>` and PublisherLayout.
 */
export interface ActiveTheme {
  /** DB slug, e.g. 'default-publisher' */
  themeSlug: string;
  /** Pretty name, e.g. 'Default Publisher' */
  themeName: string;
  manifest: ThemeManifest;
  /** Resolved palette — palette lookup already applied. */
  paletteSlug: string;
  paletteName: string;
  /** Active color mode. 'light' is the default. */
  colorMode: 'light' | 'dark';
  /** Whether the theme supports dark mode at all (manifest feature flag). */
  supportsDarkMode: boolean;
  /** CSS vars to apply on `:root`. */
  cssLight: CssVars;
  /** CSS vars to apply on `.dark`. */
  cssDark: CssVars;
}
