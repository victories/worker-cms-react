// PaletteSelector — rendered inside ThemeCustomizer when the active theme
// declares palette_variants (currently: Publisher). Shows a 2x2 grid of
// palette cards and a Light/Dark mode toggle. The parent owns the state
// and persists it via the existing /themes/:id/overrides endpoint.
//
// The palette data is mirrored from src/lib/themePresets.ts (Publisher).
// Keep this file in sync with the server-side SYSTEM_THEMES entry if the
// Publisher palette values ever change.

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Check } from 'lucide-react';

export type ColorMode = 'light' | 'dark';

export interface PaletteSwatch {
  primary: string;
  secondary: string;
  bg: string;
  surface: string;
  text: string;
}

export interface PaletteEntry {
  slug: string;
  name: string;
  description: string;
  light: PaletteSwatch;
  dark: PaletteSwatch;
}

// Mirrors SYSTEM_THEMES['publisher'].palette_variants on the server.
export const PUBLISHER_PALETTES: PaletteEntry[] = [
  {
    slug: 'lavender',
    name: 'Soft Lavender',
    description: 'Muted plum on a warm pastel lavender background.',
    light: { primary: '#8B7AB5', secondary: '#B9A7DB', bg: '#F0EBF5', surface: '#FFFFFF', text: '#2C2533' },
    dark:  { primary: '#B9A7DB', secondary: '#D4C8F0', bg: '#1A1620', surface: '#241F2C', text: '#F0EBF5' },
  },
  {
    slug: 'blush',
    name: 'Soft Blush',
    description: 'Dusty rose on a warm pink-cream background.',
    light: { primary: '#B07080', secondary: '#D99BA8', bg: '#F7EDEF', surface: '#FFFFFF', text: '#2D1F23' },
    dark:  { primary: '#D99BA8', secondary: '#EDBFC9', bg: '#1C1518', surface: '#261C21', text: '#F7EDEF' },
  },
  {
    slug: 'cream',
    name: 'Warm Cream',
    description: 'Warm bronze accents on a linen cream background.',
    light: { primary: '#8B7355', secondary: '#C4A57A', bg: '#F7F2E8', surface: '#FFFFFF', text: '#2B241B' },
    dark:  { primary: '#C4A57A', secondary: '#D8BC91', bg: '#1A1714', surface: '#25201A', text: '#F7F2E8' },
  },
  {
    slug: 'periwinkle',
    name: 'Soft Periwinkle',
    description: 'Cool pastel lavender-blue on a breezy background.',
    light: { primary: '#6B7BB5', secondary: '#9FB0E5', bg: '#EBEEF8', surface: '#FFFFFF', text: '#1E2233' },
    dark:  { primary: '#9FB0E5', secondary: '#C2CFEF', bg: '#161822', surface: '#20232F', text: '#EBEEF8' },
  },
];

// ── Swatch row ───────────────────────────────────────────────────────────

function SwatchRow({ colors }: { colors: PaletteSwatch }) {
  const order: Array<keyof PaletteSwatch> = ['bg', 'surface', 'secondary', 'primary', 'text'];
  return (
    <div className="flex items-center gap-1.5">
      {order.map((k) => (
        <div
          key={k}
          className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
          style={{ backgroundColor: colors[k] }}
          title={`${k}: ${colors[k]}`}
        />
      ))}
    </div>
  );
}

// ── Mini preview (6 stacked lines styled with the palette) ──────────────

function MiniPreview({ swatch }: { swatch: PaletteSwatch }) {
  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{
        backgroundColor: swatch.bg,
        borderColor: 'rgba(0,0,0,0.08)',
      }}
    >
      {/* top ad strip */}
      <div
        className="h-2"
        style={{ backgroundColor: swatch.surface, borderBottom: `1px solid ${swatch.secondary}33` }}
      />
      {/* header row */}
      <div
        className="flex items-center justify-between px-2 py-1.5"
        style={{ backgroundColor: swatch.surface, borderBottom: `1px solid ${swatch.secondary}33` }}
      >
        <div className="h-2 w-10 rounded-full" style={{ backgroundColor: swatch.primary }} />
        <div className="flex gap-1">
          <div className="h-2 w-6 rounded-full" style={{ backgroundColor: swatch.secondary }} />
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: swatch.text }} />
        </div>
      </div>
      {/* 2 col content area */}
      <div className="flex gap-1.5 p-2" style={{ backgroundColor: swatch.bg }}>
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: swatch.surface }} />
          <div className="h-1.5 w-4/5 rounded" style={{ backgroundColor: swatch.surface }} />
          <div className="h-1.5 w-3/5 rounded" style={{ backgroundColor: swatch.surface }} />
        </div>
        <div className="w-10 space-y-1">
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: swatch.primary }} />
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: swatch.secondary }} />
        </div>
      </div>
      {/* footer strip */}
      <div className="h-2" style={{ backgroundColor: swatch.surface, borderTop: `1px solid ${swatch.secondary}33` }} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────

interface PaletteSelectorProps {
  palettes?: PaletteEntry[];
  selectedPalette: string;
  colorMode: ColorMode;
  onPaletteChange: (slug: string) => void;
  onModeChange: (mode: ColorMode) => void;
  lang?: 'tr' | 'en';
}

export function PaletteSelector({
  palettes = PUBLISHER_PALETTES,
  selectedPalette,
  colorMode,
  onPaletteChange,
  onModeChange,
  lang = 'en',
}: PaletteSelectorProps) {
  const selected = useMemo(
    () => palettes.find((p) => p.slug === selectedPalette) || palettes[0],
    [palettes, selectedPalette]
  );

  const t = (en: string, tr: string) => (lang === 'tr' ? tr : en);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {palettes.map((p) => {
            const isSelected = p.slug === selectedPalette;
            const swatch = colorMode === 'dark' ? p.dark : p.light;
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
                      <div>
                        <div className="font-semibold text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <SwatchRow colors={swatch} />
                    <MiniPreview swatch={swatch} />
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
          {t('Currently selected', 'Seçili')}: <strong className="text-foreground">{selected.name}</strong>{' '}
          &middot; <strong className="text-foreground">{colorMode === 'dark' ? t('Dark', 'Koyu') : t('Light', 'Açık')}</strong>
        </div>
      )}
    </div>
  );
}
