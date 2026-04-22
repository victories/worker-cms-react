import { cn } from '@ui/lib/utils';
import type { PresetEntry } from './PresetGrid';
import { STYLE_PRESETS, type StylePreset } from './style-presets';

export interface StylePresetGridProps {
  /** Server-supplied palettes, used to colour each style card's swatches. */
  palettes: PresetEntry[];
  /** Currently active style slug (may be null if none matches). */
  activeSlug: string | null;
  onPick(style: StylePreset, palette: PresetEntry): void;
}

/**
 * Grid of curated "Style" bundles — each card applies a palette,
 * radius and font triple in one click (same UX as shadcn's /create
 * top picker). Renders the palette's dominant swatches plus a small
 * Aa in the style's heading font so the bundle is legible at a glance.
 */
export function StylePresetGrid({ palettes, activeSlug, onPick }: StylePresetGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STYLE_PRESETS.map((s) => {
        const palette = palettes.find((p) => p.slug === s.paletteSlug);
        if (!palette) return null;
        const bg = palette.light['--background'] ?? '0 0% 100%';
        const primary = palette.light['--primary'] ?? '0 0% 0%';
        const accent = palette.light['--accent'] ?? '0 0% 90%';
        const isActive = s.slug === activeSlug;
        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onPick(s, palette)}
            title={s.description}
            className={cn(
              'group flex flex-col rounded border-2 text-left transition overflow-hidden',
              isActive
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/50',
            )}
          >
            <div
              className="flex h-14 items-center justify-between px-3"
              style={{ background: `hsl(${bg})` }}
            >
              <span
                className="text-xl font-semibold"
                style={{
                  color: `hsl(${primary})`,
                  fontFamily: `'${s.fonts.heading}', system-ui, sans-serif`,
                }}
              >
                Aa
              </span>
              <span className="flex items-center gap-0.5">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ background: `hsl(${primary})` }}
                />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: `hsl(${accent})` }}
                />
              </span>
            </div>
            <div className="bg-card px-2 py-1.5">
              <div className="text-xs font-semibold leading-tight">{s.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {s.fonts.heading} · {palette.name}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
