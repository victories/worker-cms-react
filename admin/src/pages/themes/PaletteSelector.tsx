// PaletteSelector — palette chooser used by both ThemeStore (top-level
// site palette switcher) and ThemeCustomizer (per-theme fine-tuning).
//
// Single source of truth: the server-side palette registry at
// `src/lib/themes/palettes.ts`, imported through the `@themes` alias
// (see admin/tsconfig.json + admin/vite.config.ts). This replaces the
// Faz 5 mirrored copy of the old Publisher `lavender`/`blush`/`cream`/
// `periwinkle` palettes which no longer exist on the server.
//
// The palette data is pure shadcn HSL triples (e.g. `"221 83% 53%"`)
// keyed by token name (`--primary`, `--background`, ...). For swatch
// rendering we hand them straight to the browser as `hsl(...)`, so no
// hex conversion is needed here.

import { useMemo } from 'react';
import { Card, CardContent } from '@ui/card';
import { Button } from '@ui/button';
import { Sun, Moon, Check } from 'lucide-react';
import { PALETTES, DEFAULT_PALETTE_SLUG } from '@themes/palettes';
import type { CssVars, Palette } from '@themes/types';

export type ColorMode = 'light' | 'dark';

export { DEFAULT_PALETTE_SLUG };

// Ordered list rendered in the grid. Mirrors the declaration order in
// `palettes.ts` and the `palette_variants` array on the default theme
// manifest in the seed — keep these three in sync so admins and the
// public site never disagree on available palettes.
const PALETTE_ORDER: string[] = [
  'neutral',
  'zinc',
  'slate',
  'stone',
  'rose',
  'blue',
  'emerald',
  'violet',
];

const ORDERED_PALETTES: Palette[] = PALETTE_ORDER
  .map((slug) => PALETTES[slug])
  .filter((p): p is Palette => Boolean(p));

// Pull a CSS var out of a shadcn HSL var map as a full `hsl(...)` color
// string ready for `style.backgroundColor`. Returns a harmless fallback
// when the key is missing so a malformed palette never crashes the UI.
function hslVar(vars: CssVars, key: string, fallback = '0 0% 50%'): string {
  return `hsl(${vars[key] ?? fallback})`;
}

// ── Swatch row ───────────────────────────────────────────────────────────

function SwatchRow({ vars }: { vars: CssVars }) {
  // Five tokens that best characterise a palette at a glance. Order
  // goes background → surface → accents → primary → destructive so the
  // eye sweeps from the calmest to the loudest value.
  const tokens: Array<{ key: string; label: string }> = [
    { key: '--background', label: 'background' },
    { key: '--card', label: 'card' },
    { key: '--muted', label: 'muted' },
    { key: '--primary', label: 'primary' },
    { key: '--destructive', label: 'destructive' },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {tokens.map(({ key, label }) => (
        <div
          key={key}
          className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
          style={{ backgroundColor: hslVar(vars, key) }}
          title={`${label}: ${vars[key] ?? '—'}`}
        />
      ))}
    </div>
  );
}

// ── Mini preview (6 stacked lines styled with the palette) ──────────────

function MiniPreview({ vars }: { vars: CssVars }) {
  const bg = hslVar(vars, '--background');
  const card = hslVar(vars, '--card');
  const primary = hslVar(vars, '--primary');
  const secondary = hslVar(vars, '--secondary');
  const muted = hslVar(vars, '--muted');
  const border = hslVar(vars, '--border');
  const fg = hslVar(vars, '--foreground');
  const mutedFg = hslVar(vars, '--muted-foreground');

  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      {/* header row */}
      <div
        className="flex items-center justify-between px-2 py-1.5"
        style={{ backgroundColor: card, borderBottom: `1px solid ${border}` }}
      >
        <div className="h-2 w-10 rounded-full" style={{ backgroundColor: primary }} />
        <div className="flex gap-1">
          <div className="h-2 w-6 rounded-full" style={{ backgroundColor: secondary }} />
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: fg }} />
        </div>
      </div>
      {/* 2 col content area */}
      <div className="flex gap-1.5 p-2" style={{ backgroundColor: bg }}>
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: card, border: `1px solid ${border}` }} />
          <div className="h-1.5 w-4/5 rounded" style={{ backgroundColor: card, border: `1px solid ${border}` }} />
          <div className="h-1.5 w-3/5 rounded" style={{ backgroundColor: muted }} />
        </div>
        <div className="w-10 space-y-1">
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: primary }} />
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: secondary }} />
          <div className="h-1.5 w-2/3 rounded" style={{ backgroundColor: mutedFg }} />
        </div>
      </div>
      {/* footer strip */}
      <div className="h-2" style={{ backgroundColor: card, borderTop: `1px solid ${border}` }} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export interface PaletteSelectorProps {
  selectedPalette: string;
  colorMode: ColorMode;
  onPaletteChange: (slug: string) => void;
  onModeChange: (mode: ColorMode) => void;
  lang?: 'tr' | 'en';
  /** Columns in the palette grid (default: 2 on sm+, 4 on lg+). */
  dense?: boolean;
}

export function PaletteSelector({
  selectedPalette,
  colorMode,
  onPaletteChange,
  onModeChange,
  lang = 'en',
  dense = false,
}: PaletteSelectorProps) {
  const selected = useMemo<Palette | undefined>(
    () =>
      ORDERED_PALETTES.find((p) => p.slug === selectedPalette) ??
      ORDERED_PALETTES.find((p) => p.slug === DEFAULT_PALETTE_SLUG),
    [selectedPalette]
  );

  const t = (en: string, tr: string) => (lang === 'tr' ? tr : en);

  const gridClass = dense
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';

  return (
    <div className="space-y-6">
      {/* Color mode toggle */}
      <div>
        <div className="text-sm font-semibold mb-2">{t('Color Mode', 'Renk Modu')}</div>
        <div className="inline-flex rounded-lg border p-1 bg-muted/30">
          <Button
            type="button"
            size="sm"
            variant={colorMode === 'light' ? 'default' : 'ghost'}
            className="gap-2"
            onClick={() => onModeChange('light')}
          >
            <Sun className="h-4 w-4" />
            {t('Light', 'Açık')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={colorMode === 'dark' ? 'default' : 'ghost'}
            className="gap-2"
            onClick={() => onModeChange('dark')}
          >
            <Moon className="h-4 w-4" />
            {t('Dark', 'Koyu')}
          </Button>
        </div>
      </div>

      {/* Palette cards grid */}
      <div>
        <div className="text-sm font-semibold mb-2">{t('Palette', 'Renk Paleti')}</div>
        <div className={gridClass}>
          {ORDERED_PALETTES.map((p) => {
            const isSelected = p.slug === selectedPalette;
            const vars = colorMode === 'dark' ? p.dark : p.light;
            return (
              <button
                type="button"
                key={p.slug}
                onClick={() => onPaletteChange(p.slug)}
                className={[
                  'text-left rounded-xl border-2 transition-all overflow-hidden',
                  isSelected
                    ? 'border-primary shadow-md ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40',
                ].join(' ')}
              >
                <Card className="border-0 shadow-none rounded-none">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {p.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <SwatchRow vars={vars} />
                    <MiniPreview vars={vars} />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current selection summary */}
      {selected && (
        <div className="text-xs text-muted-foreground">
          {t('Currently selected', 'Seçili')}:{' '}
          <strong className="text-foreground">{selected.name}</strong> &middot;{' '}
          <strong className="text-foreground">
            {colorMode === 'dark' ? t('Dark', 'Koyu') : t('Light', 'Açık')}
          </strong>
        </div>
      )}
    </div>
  );
}
