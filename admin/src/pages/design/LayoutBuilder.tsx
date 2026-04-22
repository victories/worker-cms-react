import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useToast } from '@ui/toast-notification';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import { cn } from '@ui/lib/utils';
import { SlotPalette } from '@/components/design/SlotPalette';
import { RegionEditor, type RegionUI } from '@/components/design/RegionEditor';
import { SlotConfigPanel } from '@/components/design/SlotConfigPanel';
import { SLOT_CATALOG, REGION_KEYS, REGION_LABELS, type RegionKey, getSlotEntry } from '@/components/design/slot-catalog';

type LayoutUI = Record<string, RegionUI>;

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `slot-${Date.now().toString(36)}-${uidCounter}`;
}

/** Hydrate the persisted layout JSON into the editor's UI shape (adds
 *  per-slot uids so dnd-kit's sortable contexts have stable ids). */
function fromStored(stored: any): LayoutUI {
  const layout: LayoutUI = {};
  for (const region of REGION_KEYS) {
    const r = stored?.[region];
    if (!r || !Array.isArray(r.columns)) {
      layout[region] = { type: 'row', columns: [{ width: 100, slots: [] }] };
      continue;
    }
    layout[region] = {
      type: 'row',
      padding: r.padding ?? 'md',
      sticky: !!r.sticky,
      columns: r.columns.map((c: any) => ({
        width: Number(c.width) || 0,
        sticky: !!c.sticky,
        slots: (Array.isArray(c.slots) ? c.slots : []).map((s: any) => ({
          uid: nextUid(),
          id: String(s.id),
          props: s.props ?? {},
        })),
      })),
    };
  }
  return layout;
}

/** Strip per-slot uids before persisting. */
function toStored(layout: LayoutUI): any {
  const out: any = {};
  for (const region of REGION_KEYS) {
    const r = layout[region];
    out[region] = {
      type: 'row',
      padding: r.padding ?? 'md',
      sticky: !!r.sticky,
      columns: r.columns.map((c) => ({
        width: c.width,
        // Only include sticky when true — keep default rows lean.
        ...(c.sticky ? { sticky: true } : {}),
        slots: c.slots.map((s) => ({ id: s.id, props: s.props ?? {} })),
      })),
    };
  }
  return out;
}

function findSlotLocation(layout: LayoutUI, uid: string) {
  for (const region of REGION_KEYS) {
    const r = layout[region];
    for (let ci = 0; ci < r.columns.length; ci += 1) {
      const idx = r.columns[ci].slots.findIndex((s) => s.uid === uid);
      if (idx !== -1) return { region, columnIndex: ci, slotIndex: idx };
    }
  }
  return null;
}

function collectUsedSingletons(layout: LayoutUI): Set<string> {
  const used = new Set<string>();
  for (const region of REGION_KEYS) {
    for (const col of layout[region].columns) {
      for (const slot of col.slots) {
        const entry = getSlotEntry(slot.id);
        if (entry?.singleton) used.add(slot.id);
      }
    }
  }
  return used;
}

export function LayoutBuilder() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<LayoutUI | null>(null);
  const [original, setOriginal] = useState<LayoutUI | null>(null);
  const [activeRegion, setActiveRegion] = useState<RegionKey>('header');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getDesign()
      .then((res: any) => {
        if (cancelled) return;
        const hydrated = fromStored(res.data?.layoutConfig);
        setLayout(hydrated);
        setOriginal(hydrated);
      })
      .catch((e) => toast(`${t('design.load_failed')}: ${String(e)}`, 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => {
    if (!layout || !original) return false;
    return JSON.stringify(toStored(layout)) !== JSON.stringify(toStored(original));
  }, [layout, original]);

  const usedSingletons = useMemo(
    () => (layout ? collectUsedSingletons(layout) : new Set<string>()),
    [layout]
  );

  const selectedInfo = useMemo(() => {
    if (!layout || !selectedUid) return null;
    const loc = findSlotLocation(layout, selectedUid);
    if (!loc) return null;
    const slot = layout[loc.region].columns[loc.columnIndex].slots[loc.slotIndex];
    return { uid: slot.uid, id: slot.id, props: slot.props };
  }, [layout, selectedUid]);

  function setRegion(region: RegionKey, next: RegionUI) {
    if (!layout) return;
    setLayout({ ...layout, [region]: next });
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!layout) return;
    const { active, over } = event;
    if (!over) return;

    const aData = active.data.current as any;
    const oData = over.data.current as any;

    // Drop target normalisation: dropping on a slot means "before that slot
    // in its column"; dropping on a column means "append to that column".
    let targetRegion: string | null = null;
    let targetColumn: number | null = null;
    let targetIndex: number | null = null;

    if (oData?.type === 'column') {
      targetRegion = oData.regionKey;
      targetColumn = oData.columnIndex;
      const col = layout[targetRegion!].columns[targetColumn!];
      targetIndex = col.slots.length;
    } else if (oData?.type === 'slot') {
      const overLoc = findSlotLocation(layout, oData.slotUid);
      if (!overLoc) return;
      targetRegion = overLoc.region;
      targetColumn = overLoc.columnIndex;
      targetIndex = overLoc.slotIndex;
    } else {
      return;
    }

    // Case 1: dragging a palette item — append a new slot.
    if (aData?.type === 'palette') {
      const entry = SLOT_CATALOG.find((s) => s.id === aData.slotId);
      if (!entry) return;
      if (entry.singleton && usedSingletons.has(entry.id)) {
        toast('Bu slot zaten bir bölgede kullanılıyor.', 'error');
        return;
      }
      const newSlot = { uid: nextUid(), id: entry.id, props: { ...(entry.defaultProps ?? {}) } };
      const next = { ...layout };
      next[targetRegion!] = {
        ...next[targetRegion!],
        columns: next[targetRegion!].columns.map((c, i) =>
          i === targetColumn
            ? { ...c, slots: [...c.slots.slice(0, targetIndex!), newSlot, ...c.slots.slice(targetIndex!)] }
            : c
        ),
      };
      setLayout(next);
      setSelectedUid(newSlot.uid);
      return;
    }

    // Case 2: moving an existing slot (cross-column or within column).
    if (aData?.type === 'slot') {
      const fromLoc = findSlotLocation(layout, aData.slotUid);
      if (!fromLoc) return;
      // Same position → noop.
      if (
        fromLoc.region === targetRegion &&
        fromLoc.columnIndex === targetColumn &&
        fromLoc.slotIndex === targetIndex
      )
        return;

      const next = { ...layout };
      // Pull slot out.
      const sourceRegion = next[fromLoc.region];
      const sourceCol = sourceRegion.columns[fromLoc.columnIndex];
      const movingSlot = sourceCol.slots[fromLoc.slotIndex];
      const newSourceSlots = sourceCol.slots.filter((_, i) => i !== fromLoc.slotIndex);
      next[fromLoc.region] = {
        ...sourceRegion,
        columns: sourceRegion.columns.map((c, i) =>
          i === fromLoc.columnIndex ? { ...c, slots: newSourceSlots } : c
        ),
      };
      // Adjust target index when moving within the same column behind the source.
      let insertAt = targetIndex!;
      if (fromLoc.region === targetRegion && fromLoc.columnIndex === targetColumn && fromLoc.slotIndex < targetIndex!) {
        insertAt = targetIndex! - 1;
      }
      const targetReg = next[targetRegion!];
      const targetCol = targetReg.columns[targetColumn!];
      const newTargetSlots = [
        ...targetCol.slots.slice(0, insertAt),
        movingSlot,
        ...targetCol.slots.slice(insertAt),
      ];
      next[targetRegion!] = {
        ...targetReg,
        columns: targetReg.columns.map((c, i) =>
          i === targetColumn ? { ...c, slots: newTargetSlots } : c
        ),
      };
      setLayout(next);
    }
  }

  async function save() {
    if (!layout) return;
    setSaving(true);
    try {
      const res: any = await api.saveDesign({ layoutConfig: toStored(layout) });
      const hydrated = fromStored(res.data.layoutConfig);
      setLayout(hydrated);
      setOriginal(hydrated);
      toast(t('design.saved'), 'success');
    } catch (e) {
      toast(`${t('design.save_failed')}: ${String(e)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  function revert() {
    if (!original) return;
    setLayout(original);
    setSelectedUid(null);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  if (!layout) {
    return <div className="p-6 text-sm text-muted-foreground">{t('design.no_data')}</div>;
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('layout.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('layout.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={revert} disabled={!dirty || saving}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t('layout.revert')}
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            {t('design.save')}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid flex-1 grid-cols-12 overflow-hidden">
          {/* Slot palette */}
          <aside className="col-span-2 overflow-y-auto border-r border-border bg-muted/20 p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              {t('layout.slots')}
            </h2>
            <SlotPalette usedSingletons={usedSingletons} />
          </aside>

          {/* Canvas */}
          <main className="col-span-7 flex flex-col overflow-hidden border-r border-border">
            <nav className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-3 py-1.5">
              {REGION_KEYS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRegion(r)}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium',
                    activeRegion === r
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  {REGION_LABELS[r]}
                </button>
              ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-3">
              <RegionEditor
                regionKey={activeRegion}
                region={layout[activeRegion]}
                selectedUid={selectedUid}
                onSelect={setSelectedUid}
                onChange={(next) => setRegion(activeRegion, next)}
              />
            </div>
          </main>

          {/* Slot config */}
          <aside className="col-span-3 overflow-hidden">
            <SlotConfigPanel
              selected={selectedInfo}
              onChangeProps={(props) => {
                if (!layout || !selectedUid) return;
                const loc = findSlotLocation(layout, selectedUid);
                if (!loc) return;
                const next = { ...layout };
                next[loc.region] = {
                  ...next[loc.region],
                  columns: next[loc.region].columns.map((c, ci) =>
                    ci === loc.columnIndex
                      ? {
                          ...c,
                          slots: c.slots.map((s, si) =>
                            si === loc.slotIndex ? { ...s, props } : s
                          ),
                        }
                      : c
                  ),
                };
                setLayout(next);
              }}
              onClose={() => setSelectedUid(null)}
            />
          </aside>
        </div>
      </DndContext>
    </div>
  );
}
