import { cn } from '@ui/lib/utils';
import type { LayoutPreset } from './layout-presets';
import { LAYOUT_PRESETS } from './layout-presets';

export interface LayoutPresetGridProps {
  /** Slug of the preset currently considered "active" (or null). */
  activeSlug?: string | null;
  onPick(preset: LayoutPreset): void;
}

/**
 * Tiny visual schematic of a region tree — three stacked rows (header /
 * body / footer) split into proportional column blocks. Gives the user
 * an at-a-glance feel for what they're about to overwrite their layout
 * with, without having to render the full slot palette.
 */
function PresetSchematic({ preset }: { preset: LayoutPreset }) {
  const rows: Array<{ region: keyof LayoutPreset['layout_config']; widths: number[] }> = [
    { region: 'header', widths: preset.layout_config.header.columns.map((c) => c.width) },
    { region: 'body', widths: preset.layout_config.body.columns.map((c) => c.width) },
    { region: 'footer', widths: preset.layout_config.footer.columns.map((c) => c.width) },
  ];
  return (
    <div className="flex h-14 flex-col gap-0.5 rounded-sm bg-muted/40 p-1">
      {rows.map(({ region, widths }) => (
        <div key={region} className="flex flex-1 gap-0.5">
          {widths.map((w, i) => (
            <div
              key={i}
              style={{ flex: `0 0 calc(${w}% - 2px)` }}
              className={cn(
                'rounded-[2px]',
                region === 'body' ? 'bg-primary/70' : 'bg-foreground/30',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Compact row of layout preset cards rendered above the Layout Builder
 * canvas. Clicking a card triggers `onPick`, which the parent handles
 * with a confirm prompt before overwriting the current `layout_config`.
 */
export function LayoutPresetGrid({ activeSlug, onPick }: LayoutPresetGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {LAYOUT_PRESETS.map((p) => {
        const isActive = p.slug === activeSlug;
        return (
          <button
            key={p.slug}
            type="button"
            onClick={() => onPick(p)}
            title={p.description}
            className={cn(
              'group flex flex-col gap-1.5 rounded border-2 p-2 text-left transition',
              isActive
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/50',
            )}
          >
            <PresetSchematic preset={p} />
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-xs font-semibold leading-tight">{p.name}</div>
                <div
                  className="text-[10px] text-muted-foreground line-clamp-2"
                  style={{ wordBreak: 'break-word' }}
                >
                  {p.description}
                </div>
              </div>
              <span
                aria-hidden
                className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {p.glyph}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
