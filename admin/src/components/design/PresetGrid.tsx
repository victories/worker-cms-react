import { cn } from '@ui/lib/utils';

export interface PresetEntry {
  slug: string;
  name: string;
  description: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface PresetGridProps {
  presets: PresetEntry[];
  activeSlug: string | null;
  onPick(p: PresetEntry): void;
}

/**
 * Grid of palette preset thumbnails. Each thumbnail visualises the
 * preset's primary + accent + background swatches; clicking it tells
 * the parent to overwrite the current style tokens.
 */
export function PresetGrid({ presets, activeSlug, onPick }: PresetGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {presets.map((p) => {
        const bg = p.light['--background'] ?? '0 0% 100%';
        const fg = p.light['--foreground'] ?? '0 0% 0%';
        const primary = p.light['--primary'] ?? '0 0% 0%';
        const accent = p.light['--accent'] ?? '0 0% 90%';
        const isActive = p.slug === activeSlug;
        return (
          <button
            key={p.slug}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              'group flex flex-col rounded border-2 text-left transition',
              isActive
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div
              className="h-16 w-full rounded-t-[2px]"
              style={{ background: `hsl(${bg})` }}
            >
              <div className="flex h-full items-center gap-1 px-2">
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ background: `hsl(${primary})` }}
                />
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ background: `hsl(${accent})` }}
                />
                <div
                  className="h-3 w-3 rounded-full border"
                  style={{ background: `hsl(${fg})` }}
                />
              </div>
            </div>
            <div className="bg-card px-2 py-1.5 rounded-b-[2px]">
              <div className="text-xs font-medium leading-tight">{p.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{p.slug}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
