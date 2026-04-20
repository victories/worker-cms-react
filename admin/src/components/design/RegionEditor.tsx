import { Plus, Pin } from 'lucide-react';
import { Button } from '@ui/button';
import { Switch } from '@ui/switch';
import { ColumnEditor, type SlotInstanceUI } from './ColumnEditor';

export interface RegionUI {
  type: 'row';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  sticky?: boolean;
  columns: { width: number; slots: SlotInstanceUI[] }[];
}

export interface RegionEditorProps {
  regionKey: string;
  region: RegionUI;
  selectedUid: string | null;
  onSelect(uid: string | null): void;
  onChange(next: RegionUI): void;
}

const MAX_COLUMNS = 6;

/**
 * One region (header / body / footer) — orchestrates its columns and
 * exposes region-level controls (sticky, padding) at the top. Drag-drop
 * lifecycle (DndContext, dragEnd) lives in the parent LayoutBuilder so
 * cross-column moves work; this component only mutates its own region.
 */
export function RegionEditor({ regionKey, region, selectedUid, onSelect, onChange }: RegionEditorProps) {
  function addColumn() {
    if (region.columns.length >= MAX_COLUMNS) return;
    // Distribute width evenly across the new column count.
    const next = region.columns.length + 1;
    const evenly = Math.floor(100 / next);
    const remainder = 100 - evenly * next;
    const columns = [
      ...region.columns.map((c) => ({ ...c, width: evenly })),
      { width: evenly + remainder, slots: [] },
    ];
    onChange({ ...region, columns });
  }

  function setColumnWidth(index: number, width: number) {
    const next = region.columns.map((c, i) => (i === index ? { ...c, width } : c));
    onChange({ ...region, columns: next });
  }

  function removeColumn(index: number) {
    if (region.columns.length <= 1) return;
    // Move the removed column's slots into its left neighbour (or the
    // first remaining column when removing index 0).
    const removed = region.columns[index];
    const survivor = index > 0 ? index - 1 : 1;
    const next = region.columns
      .map((c, i) => {
        if (i === index) return null;
        if (i === survivor) return { ...c, slots: [...c.slots, ...removed.slots] };
        return c;
      })
      .filter(Boolean) as RegionUI['columns'];
    // Renormalise widths to 100.
    const totalWidth = next.reduce((s, c) => s + c.width, 0);
    const factor = 100 / Math.max(1, totalWidth);
    const renormalised = next.map((c) => ({ ...c, width: Math.round(c.width * factor) }));
    onChange({ ...region, columns: renormalised });
  }

  function removeSlot(columnIndex: number, slotUid: string) {
    const next = region.columns.map((c, i) =>
      i === columnIndex ? { ...c, slots: c.slots.filter((s) => s.uid !== slotUid) } : c
    );
    onChange({ ...region, columns: next });
    if (selectedUid === slotUid) onSelect(null);
  }

  const totalWidth = region.columns.reduce((s, c) => s + c.width, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3 rounded border border-border bg-muted/30 px-3 py-2">
        <div className="text-xs font-medium">Bölge ayarları</div>
        <div className="flex items-center gap-1.5">
          <Pin className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">Sabit</span>
          <Switch
            checked={!!region.sticky}
            onCheckedChange={(v) => onChange({ ...region, sticky: v })}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Boşluk:</span>
          <select
            value={region.padding ?? 'md'}
            onChange={(e) =>
              onChange({ ...region, padding: e.target.value as RegionUI['padding'] })
            }
            className="h-7 rounded border border-input bg-background px-1.5 text-xs"
          >
            <option value="none">Yok</option>
            <option value="sm">Az</option>
            <option value="md">Orta</option>
            <option value="lg">Çok</option>
          </select>
        </div>
        <div className="flex-1" />
        <span
          className={
            totalWidth === 100
              ? 'text-[11px] text-muted-foreground'
              : 'text-[11px] font-medium text-amber-600'
          }
        >
          Toplam genişlik: {totalWidth}%
        </span>
      </div>

      <div className="flex flex-1 items-stretch gap-2 overflow-x-auto pb-2">
        {region.columns.map((col, i) => (
          <ColumnEditor
            key={`${regionKey}-${i}`}
            regionKey={regionKey}
            columnIndex={i}
            width={col.width}
            slots={col.slots}
            selectedUid={selectedUid}
            onSelect={onSelect}
            onWidthChange={(w) => setColumnWidth(i, w)}
            onRemoveColumn={() => removeColumn(i)}
            onRemoveSlot={(uid) => removeSlot(i, uid)}
          />
        ))}
        {region.columns.length < MAX_COLUMNS ? (
          <Button
            size="sm"
            variant="outline"
            onClick={addColumn}
            className="h-auto self-stretch border-dashed text-xs"
          >
            <Plus className="mr-1 h-3 w-3" /> Kolon
          </Button>
        ) : null}
      </div>
    </div>
  );
}
