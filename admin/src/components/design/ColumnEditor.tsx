import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, X } from 'lucide-react';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { cn } from '@ui/lib/utils';
import { getSlotEntry } from './slot-catalog';

export interface SlotInstanceUI {
  /** Stable per-render uid the editor uses for sortable item ids. */
  uid: string;
  id: string;
  props?: Record<string, unknown>;
}

export interface ColumnEditorProps {
  regionKey: string;
  columnIndex: number;
  width: number;
  slots: SlotInstanceUI[];
  selectedUid: string | null;
  onSelect(uid: string | null): void;
  onWidthChange(next: number): void;
  onRemoveColumn(): void;
  onRemoveSlot(uid: string): void;
}

interface SortableSlotProps {
  slot: SlotInstanceUI;
  isSelected: boolean;
  onSelect(): void;
  onRemove(): void;
}

function SortableSlot({ slot, isSelected, onSelect, onRemove }: SortableSlotProps) {
  const entry = getSlotEntry(slot.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.uid,
    data: { type: 'slot', slotUid: slot.uid },
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const Icon = entry?.icon;
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-2 rounded border bg-card px-2 py-1.5 text-xs cursor-pointer',
        isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border hover:border-primary/40'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        aria-label="Sürükle"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      <span className="flex-1 truncate">{entry?.label ?? slot.id}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function ColumnEditor({
  regionKey,
  columnIndex,
  width,
  slots,
  selectedUid,
  onSelect,
  onWidthChange,
  onRemoveColumn,
  onRemoveSlot,
}: ColumnEditorProps) {
  const droppableId = `column:${regionKey}:${columnIndex}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'column', regionKey, columnIndex },
  });
  return (
    <div
      className="flex flex-col rounded border border-dashed border-border bg-background/50 p-2"
      style={{ flex: `0 0 ${width}%`, minWidth: 100 }}
    >
      <div className="mb-2 flex items-center gap-1">
        <Input
          type="number"
          min={5}
          max={100}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value) || 0)}
          className="h-6 w-14 text-xs"
        />
        <span className="text-[10px] text-muted-foreground">%</span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemoveColumn}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          title="Kolonu kaldır"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-1.5 rounded border-2 border-dashed p-1.5 min-h-[80px] transition-colors',
          isOver ? 'border-primary bg-primary/5' : 'border-transparent'
        )}
      >
        <SortableContext items={slots.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
          {slots.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-[10px] text-muted-foreground">
              Buraya slot bırakın
            </div>
          ) : (
            slots.map((slot) => (
              <SortableSlot
                key={slot.uid}
                slot={slot}
                isSelected={slot.uid === selectedUid}
                onSelect={() => onSelect(slot.uid)}
                onRemove={() => onRemoveSlot(slot.uid)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
