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

// ── Theme Studio (v3) ────────────────────────────────────────────────
//
// The Theme Studio replaces the old "pick a theme + palette" flow with
// a single per-site `site_design` row that the user edits directly.
// Two orthogonal concerns:
//
//   1. **Style** — color/typography tokens (`StyleTokens`)
//   2. **Layout** — region tree of slots (`LayoutConfig`)
//
// Both ship in the `site_design` table as JSON columns. The legacy
// `themes` + `site_themes` tables stay until Faz 6 cutover.

/**
 * Style tokens for a site. Mirrors the on-disk shape stored in
 * `site_design.style_tokens`. Light + dark are full shadcn HSL maps;
 * `fonts` carries family names, with `google_fonts` listing the
 * specifier strings (`"Inter:400,500,600,700"`) the SSR shell preloads.
 */
export interface StyleTokens {
  light: CssVars;
  dark: CssVars;
  fonts: {
    sans: string;
    heading: string;
    mono: string;
  };
  google_fonts: string[];
}

/**
 * Style preset shown in the admin "Stil" picker. Pairs a palette with
 * the type tokens (font choice + radius) that complete a one-click look.
 */
export interface StylePreset {
  slug: string;
  name: string;
  description: string;
  paletteSlug: string;
  /** CSS `--radius` value, with unit (e.g. '0.5rem'). */
  radius: string;
  fonts: {
    sans: string;
    heading: string;
    mono: string;
  };
}

/**
 * One renderable item inside a layout column. `id` is a registry key
 * (`'logo'`, `'menu'`, `'widget:recent-posts'`, ...); `props` is an
 * opaque per-slot config bag forwarded to the slot component at SSR.
 */
export interface SlotInstance {
  id: string;
  props?: Record<string, unknown>;
}

/**
 * One column inside a region. `width` is a percentage of the
 * container (1–100); columns in the same region must sum to 100, but
 * the SSR layer is forgiving — flex-shrink fixes minor drift.
 */
export interface LayoutColumn {
  width: number;
  slots: SlotInstance[];
  /** Stick this column to the viewport so long sibling columns (e.g. a
   *  6000px article body next to a 400px sidebar) don't leave this one
   *  stranded with empty whitespace below it. Uses `position:sticky`
   *  with a top offset that clears the sticky header. */
  sticky?: boolean;
}

/**
 * One region (header / body / footer / etc.). The Layout Builder
 * edits these as a flat tree keyed by region name.
 */
export interface RegionConfig {
  type: 'row';
  /** Vertical padding scale token, e.g. 'sm' | 'md' | 'lg'. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Stick the region to the viewport top. Header-only typically. */
  sticky?: boolean;
  columns: LayoutColumn[];
}

/**
 * Full layout tree for a site. Header / body / footer are the only
 * required regions in v1; further keys (e.g. 'topbar', 'preFooter')
 * may appear once the builder grows.
 */
export interface LayoutConfig {
  header: RegionConfig;
  body: RegionConfig;
  footer: RegionConfig;
  [region: string]: RegionConfig;
}

/**
 * Raw DB row from `site_design`. Strings are still un-parsed JSON.
 */
export interface SiteDesignRow {
  site_id: number;
  style_tokens: string;
  layout_config: string;
  custom_css: string;
  google_fonts: string;
  preset_slug: string | null;
  updated_at: string;
}

/**
 * Resolved per-site design ready for SSR. Produced by
 * `loadActiveDesign` in `design.ts`. The Theme Studio (Faz 3+) reads
 * this; the SSR refactor (Faz 5) renders from it.
 */
export interface ActiveDesign {
  styleTokens: StyleTokens;
  layoutConfig: LayoutConfig;
  customCss: string;
  presetSlug: string | null;
  updatedAt: string;
  /** True when the row was synthesised from defaults (no DB row yet). */
  isDefault: boolean;
}
