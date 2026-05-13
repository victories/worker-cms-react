// Theme Studio v3 — design loader/saver.
//
// Reads and writes the per-site `site_design` row that the new Theme
// Studio admin UI edits. There is no fallback "fetch from themes table
// if missing" path — sites without a row see synthesised defaults
// (`buildDefaultDesign`) until the user saves once. The legacy theme
// loader (`loadActiveTheme` in engine.ts) keeps running in parallel
// through Faz 5; the SSR refactor in Faz 5 will switch the public
// renderer over to `ActiveDesign`.

import type {
  ActiveDesign,
  CssVars,
  LayoutConfig,
  SiteDesignRow,
  StyleTokens,
} from './types';
import { DEFAULT_PALETTE_SLUG, PALETTES } from './palettes';

const DEFAULT_FONTS: StyleTokens['fonts'] = {
  sans: 'Inter',
  heading: 'Inter',
  mono: 'JetBrains Mono',
};

const DEFAULT_GOOGLE_FONTS: string[] = [
  'Inter:400,500,600,700',
  'JetBrains Mono:400',
];

/**
 * Snapshot of the current PublisherLayout shape as a layout tree.
 * Faz 5 swaps the layout to render this JSON; until then it just
 * gets stored in `site_design.layout_config` and editable in the UI.
 */
const DEFAULT_LAYOUT: LayoutConfig = {
  header: {
    type: 'row',
    padding: 'md',
    sticky: true,
    columns: [
      { width: 25, slots: [{ id: 'logo' }] },
      { width: 50, slots: [{ id: 'menu' }] },
      { width: 25, slots: [{ id: 'search' }, { id: 'user-actions' }] },
    ],
  },
  body: {
    type: 'row',
    padding: 'lg',
    columns: [
      { width: 70, slots: [{ id: 'main-content' }] },
      {
        width: 30,
        slots: [
          { id: 'widget:recent-posts', props: { count: 5 } },
          { id: 'widget:categories' },
        ],
      },
    ],
  },
  footer: {
    type: 'row',
    padding: 'md',
    columns: [
      { width: 25, slots: [{ id: 'widget:about' }] },
      { width: 25, slots: [{ id: 'widget:categories' }] },
      { width: 25, slots: [{ id: 'widget:recent-posts', props: { count: 5 } }] },
      { width: 25, slots: [{ id: 'widget:newsletter' }] },
    ],
  },
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
 * Build the synthesised default design used when a site has no
 * `site_design` row yet. Tokens come from the canonical first palette;
 * layout mirrors the existing PublisherLayout structure.
 */
export function buildDefaultDesign(): ActiveDesign {
  const palette = PALETTES[DEFAULT_PALETTE_SLUG]!;
  const styleTokens: StyleTokens = {
    light: { ...palette.light },
    dark: { ...palette.dark },
    fonts: { ...DEFAULT_FONTS },
    google_fonts: [...DEFAULT_GOOGLE_FONTS],
  };
  return {
    styleTokens,
    layoutConfig: DEFAULT_LAYOUT,
    customCss: '',
    presetSlug: DEFAULT_PALETTE_SLUG,
    updatedAt: new Date().toISOString(),
    isDefault: true,
    colorMode: 'light',
  };
}

/**
 * Apply a known palette slug as the style token base. Returns a new
 * `StyleTokens` block — fonts/google_fonts are kept untouched. Useful
 * for the admin "Reset to preset" action.
 */
export function styleTokensFromPreset(
  presetSlug: string,
  fonts: StyleTokens['fonts'] = DEFAULT_FONTS,
  googleFonts: string[] = DEFAULT_GOOGLE_FONTS
): StyleTokens {
  const palette = PALETTES[presetSlug] ?? PALETTES[DEFAULT_PALETTE_SLUG]!;
  return {
    light: { ...palette.light },
    dark: { ...palette.dark },
    fonts: { ...fonts },
    google_fonts: [...googleFonts],
  };
}

function ensureLayout(parsed: Partial<LayoutConfig>): LayoutConfig {
  return {
    header: parsed.header ?? DEFAULT_LAYOUT.header,
    body: parsed.body ?? DEFAULT_LAYOUT.body,
    footer: parsed.footer ?? DEFAULT_LAYOUT.footer,
    ...parsed,
  };
}

function ensureStyle(parsed: Partial<StyleTokens>): StyleTokens {
  const palette = PALETTES[DEFAULT_PALETTE_SLUG]!;
  return {
    light: (parsed.light as CssVars) ?? { ...palette.light },
    dark: (parsed.dark as CssVars) ?? { ...palette.dark },
    fonts: { ...DEFAULT_FONTS, ...(parsed.fonts ?? {}) },
    google_fonts: parsed.google_fonts ?? [...DEFAULT_GOOGLE_FONTS],
  };
}

/**
 * Load the active design for a site. Returns `buildDefaultDesign()` if
 * no row exists or the lookup throws (D1 connection issues, malformed
 * JSON, …). The `isDefault` flag tells callers whether what they got
 * came from DB or was synthesised.
 */
export async function loadActiveDesign(
  db: D1Database,
  siteId: number
): Promise<ActiveDesign> {
  try {
    const row = await db
      .prepare('SELECT * FROM site_design WHERE site_id = ? LIMIT 1')
      .bind(siteId)
      .first<SiteDesignRow>();

    if (!row) return buildDefaultDesign();

    const mode = (row as any).default_color_mode;
    const colorMode: 'light' | 'dark' | 'auto' =
      mode === 'dark' || mode === 'auto' ? mode : 'light';
    return {
      styleTokens: ensureStyle(safeParse<Partial<StyleTokens>>(row.style_tokens, {})),
      layoutConfig: ensureLayout(safeParse<Partial<LayoutConfig>>(row.layout_config, {})),
      customCss: row.custom_css ?? '',
      presetSlug: row.preset_slug,
      updatedAt: row.updated_at,
      isDefault: false,
      colorMode,
    };
  } catch {
    return buildDefaultDesign();
  }
}

export interface SaveDesignPayload {
  styleTokens?: StyleTokens;
  layoutConfig?: LayoutConfig;
  customCss?: string;
  presetSlug?: string | null;
}

/**
 * Persist a design payload for a site. Performs an UPSERT so admins
 * can call this on a site that has never been edited before. Missing
 * fields preserve the previous row's values when updating.
 */
export async function saveActiveDesign(
  db: D1Database,
  siteId: number,
  payload: SaveDesignPayload
): Promise<ActiveDesign> {
  const current = await loadActiveDesign(db, siteId);

  const next: ActiveDesign = {
    styleTokens: payload.styleTokens ?? current.styleTokens,
    layoutConfig: payload.layoutConfig ?? current.layoutConfig,
    customCss: payload.customCss ?? current.customCss,
    presetSlug: payload.presetSlug !== undefined ? payload.presetSlug : current.presetSlug,
    updatedAt: new Date().toISOString(),
    isDefault: false,
    colorMode: current.colorMode,
  };

  await db
    .prepare(
      `INSERT INTO site_design
         (site_id, style_tokens, layout_config, custom_css, google_fonts, preset_slug, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(site_id) DO UPDATE SET
         style_tokens = excluded.style_tokens,
         layout_config = excluded.layout_config,
         custom_css = excluded.custom_css,
         google_fonts = excluded.google_fonts,
         preset_slug = excluded.preset_slug,
         updated_at = excluded.updated_at`
    )
    .bind(
      siteId,
      JSON.stringify(next.styleTokens),
      JSON.stringify(next.layoutConfig),
      next.customCss,
      JSON.stringify(next.styleTokens.google_fonts),
      next.presetSlug,
      next.updatedAt
    )
    .run();

  return next;
}

/**
 * Reset a site's design to the built-in defaults (or a specific
 * preset slug). Writes a new row using `saveActiveDesign` so the
 * single UPSERT path stays the only writer.
 */
export async function resetActiveDesign(
  db: D1Database,
  siteId: number,
  presetSlug?: string
): Promise<ActiveDesign> {
  const slug = presetSlug ?? DEFAULT_PALETTE_SLUG;
  const styleTokens = styleTokensFromPreset(slug);
  return saveActiveDesign(db, siteId, {
    styleTokens,
    layoutConfig: DEFAULT_LAYOUT,
    customCss: '',
    presetSlug: slug,
  });
}
