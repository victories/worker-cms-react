/**
 * Sector themes — bulk-imported palettes + style presets, organised
 * by industry vertical (e-commerce, restaurant, health, ...).
 *
 * The data lives in the JSON sibling so non-developers can edit
 * variants in a plain text editor (and so the AI generator prompt at
 * `docs/prompts/sector-theme-generator.md` writes a drop-in file).
 *
 * Two outputs:
 *   - SECTOR_PALETTES — merged into the global PALETTES Record so
 *     the engine's manifest auto-includes them.
 *   - SECTOR_STYLE_PRESETS — appended to the admin "Stil" picker so
 *     users can apply a sector preset in one click.
 *
 * The third output, SECTOR_GROUPS, drives the admin UI's "by sector"
 * group headers; if you don't want grouping, just iterate the flat
 * SECTOR_STYLE_PRESETS list.
 */

import type { CssVars, Palette, StylePreset } from './types';
import sectorData from './sector-themes.json';

// ── JSON shape (mirrors docs/prompts/sector-theme-generator.md) ─────

interface JsonPreset {
  slug: string;
  name: string;
  description: string;
  paletteSlug: string;
  radius: string;
  fonts: { sans: string; heading: string; mono: string };
}
interface JsonPalette {
  slug: string;
  name: string;
  description?: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}
interface JsonVariation {
  preset: JsonPreset;
  palette: JsonPalette;
  rationale?: string;
  google_fonts?: string[];
}
interface JsonSector {
  sector: string;
  sector_label: string;
  variations: JsonVariation[];
}
interface JsonRoot {
  meta?: Record<string, unknown>;
  sectors: JsonSector[];
}

const data = sectorData as JsonRoot;

// ── Outputs ─────────────────────────────────────────────────────────

const palettes: Record<string, Palette> = {};
const presets: StylePreset[] = [];
const presetSector: Record<string, string> = {};
const presetGoogleFonts: Record<string, string[]> = {};

for (const sector of data.sectors) {
  for (const v of sector.variations) {
    palettes[v.palette.slug] = {
      slug: v.palette.slug,
      name: v.palette.name,
      description: v.palette.description,
      light: v.palette.light as CssVars,
      dark: v.palette.dark as CssVars,
    };
    presets.push({
      slug: v.preset.slug,
      name: v.preset.name,
      description: v.preset.description,
      paletteSlug: v.preset.paletteSlug,
      radius: v.preset.radius,
      fonts: { ...v.preset.fonts },
    });
    presetSector[v.preset.slug] = sector.sector;
    if (v.google_fonts) presetGoogleFonts[v.preset.slug] = v.google_fonts;
  }
}

export const SECTOR_PALETTES: Record<string, Palette> = palettes;
export const SECTOR_STYLE_PRESETS: StylePreset[] = presets;

/** Map of preset slug → sector slug (for the admin's "by sector" grouping). */
export const SECTOR_PRESET_SECTOR: Record<string, string> = presetSector;

/** Map of preset slug → Google Fonts spec strings (`"Family:wght@400;700"`). */
export const SECTOR_PRESET_GOOGLE_FONTS: Record<string, string[]> = presetGoogleFonts;

/**
 * Sector groups for admin UI: ordered list of `{ sector, label, presetSlugs }`
 * so the picker can render section headers ("E-ticaret", "Restoran & Yeme-İçme"
 * ...) with the variants underneath.
 */
export interface SectorGroup {
  sector: string;
  label: string;
  presetSlugs: string[];
}

export const SECTOR_GROUPS: SectorGroup[] = data.sectors.map((s) => ({
  sector: s.sector,
  label: s.sector_label,
  presetSlugs: s.variations.map((v) => v.preset.slug),
}));
