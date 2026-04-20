import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SLOT_CATALOG, type SlotCatalogEntry } from './slot-catalog';
import { cn } from '@ui/lib/utils';

interface PaletteItemProps {
  entry: SlotCatalogEntry;
  disabled?: boolean;
}

function PaletteItem({ entry, disabled }: PaletteItemProps) {
  const Icon = entry.icon;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${entry.id}`,
    data: { type: 'palette', slotId: entry.id },
    disabled,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : disabled ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 rounded border border-border bg-card p-2 text-xs',
        disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:border-primary/50'
      )}
      title={disabled ? 'Bu slot zaten layout\'ta kullanılıyor' : entry.hint ?? entry.label}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground" />
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate">{entry.label}</span>
    </div>
  );
}

export interface SlotPaletteProps {
  /** Slot ids that are singleton-locked (already placed somewhere). */
  usedSingletons: Set<string>;
}

const CATEGORY_LABELS: Record<SlotCatalogEntry['category'], string> = {
  site: 'Site Bileşenleri',
  core: 'Çekirdek',
  widget: 'Widget\'lar',
};

export function SlotPalette({ usedSingletons }: SlotPaletteProps) {
  const grouped = SLOT_CATALOG.reduce<Record<string, SlotCatalogEntry[]>>((acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      {(['site', 'core', 'widget'] as const).map((cat) => (
        <div key={cat}>
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[cat]}
          </div>
          <div className="space-y-1.5">
            {(grouped[cat] || []).map((e) => (
              <PaletteItem
                key={e.id}
                entry={e}
                disabled={!!e.singleton && usedSingletons.has(e.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
