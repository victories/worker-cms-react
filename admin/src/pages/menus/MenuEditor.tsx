import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, ExternalLink, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/ui/toast-notification';

// ─── Types ────────────────────────────────────────────

interface MenuItemData {
  id: string; // string for temp IDs ("new_1") and stringified DB IDs
  title: string;
  url: string;
  target: string;
  item_type: string;
  parent_id: string | null;
  depth: number;
  css_class: string | null;
}

type DropPosition = 'before' | 'after' | 'child';

interface DropIndicator {
  targetId: string;
  position: DropPosition;
}

// ─── Tree Utilities ───────────────────────────────────

let tempIdCounter = 0;
function nextTempId(): string {
  return `new_${++tempIdCounter}`;
}

/** Build a flat display list with depths from raw API items */
function buildFlatTree(rawItems: any[]): MenuItemData[] {
  if (!rawItems || !rawItems.length) return [];

  const sorted = [...rawItems].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const childMap = new Map<string | null, any[]>();

  for (const item of sorted) {
    const pid = item.parent_id ? String(item.parent_id) : null;
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid)!.push(item);
  }

  const result: MenuItemData[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = childMap.get(parentId) || [];
    for (const item of children) {
      const id = String(item.id);
      result.push({
        id,
        title: item.title || '',
        url: item.url || '',
        target: item.target || '_self',
        item_type: item.item_type || 'custom',
        parent_id: parentId,
        depth,
        css_class: item.css_class || null,
      });
      walk(id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

/** Get all descendant IDs of a given parent */
function getDescendantIds(items: MenuItemData[], parentId: string): Set<string> {
  const ids = new Set<string>();
  function collect(pid: string) {
    for (const item of items) {
      if (item.parent_id === pid) {
        ids.add(item.id);
        collect(item.id);
      }
    }
  }
  collect(parentId);
  return ids;
}

/** Move an item (with descendants) to a new position */
function moveItem(
  items: MenuItemData[],
  draggedId: string,
  targetId: string,
  position: DropPosition,
): MenuItemData[] {
  const draggedIdx = items.findIndex((i) => i.id === draggedId);
  if (draggedIdx === -1) return items;

  const dragged = items[draggedIdx];
  const descendantIds = getDescendantIds(items, draggedId);

  // Can't drop on self or own descendant
  if (targetId === draggedId || descendantIds.has(targetId)) return items;

  // Extract dragged subtree
  const draggedSubtree = items.filter((i) => i.id === draggedId || descendantIds.has(i.id));
  const remaining = items.filter((i) => i.id !== draggedId && !descendantIds.has(i.id));

  const targetIdx = remaining.findIndex((i) => i.id === targetId);
  if (targetIdx === -1) return items;

  const target = remaining[targetIdx];

  // Determine new parent and insert position
  let newParentId: string | null;
  let insertIdx: number;

  if (position === 'before') {
    newParentId = target.parent_id;
    insertIdx = targetIdx;
  } else if (position === 'after') {
    newParentId = target.parent_id;
    // Insert after target + its descendants
    const targetDescIds = getDescendantIds(remaining, targetId);
    let afterIdx = targetIdx + 1;
    while (afterIdx < remaining.length && targetDescIds.has(remaining[afterIdx].id)) {
      afterIdx++;
    }
    insertIdx = afterIdx;
  } else {
    // child
    newParentId = targetId;
    const targetDescIds = getDescendantIds(remaining, targetId);
    let afterIdx = targetIdx + 1;
    while (afterIdx < remaining.length && targetDescIds.has(remaining[afterIdx].id)) {
      afterIdx++;
    }
    insertIdx = afterIdx;
  }

  // Calculate depth change
  const newDepth = position === 'child' ? target.depth + 1 : target.depth;
  const depthDiff = newDepth - dragged.depth;

  // Update dragged subtree
  const updatedSubtree = draggedSubtree.map((item) => ({
    ...item,
    depth: item.depth + depthDiff,
    parent_id: item.id === draggedId ? newParentId : item.parent_id,
  }));

  // Insert
  const result = [...remaining];
  result.splice(insertIdx, 0, ...updatedSubtree);
  return result;
}

/** Indent item: make it a child of its previous sibling */
function indentItem(items: MenuItemData[], itemId: string): MenuItemData[] {
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx <= 0) return items;

  const item = items[idx];

  // Find previous sibling (same parent, appears before this item)
  let prevSiblingId: string | null = null;
  for (let i = idx - 1; i >= 0; i--) {
    if (items[i].parent_id === item.parent_id) {
      prevSiblingId = items[i].id;
      break;
    }
    // Stop if we go above the current depth level
    if (items[i].depth < item.depth) break;
  }

  if (!prevSiblingId) return items; // No valid sibling

  // Max depth: 2 levels (0, 1)
  if (item.depth >= 2) return items;

  return moveItem(items, itemId, prevSiblingId, 'child');
}

/** Outdent item: move it to parent's level, after the parent */
function outdentItem(items: MenuItemData[], itemId: string): MenuItemData[] {
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return items;

  const item = items[idx];
  if (item.depth === 0 || !item.parent_id) return items;

  return moveItem(items, itemId, item.parent_id, 'after');
}

/** Convert flat display items to save payload with temp_id references */
function toSavePayload(items: MenuItemData[]) {
  // Assign stable temp_ids based on current id
  const tempIdMap = new Map<string, string>();
  items.forEach((item, idx) => {
    tempIdMap.set(item.id, `t${idx}`);
  });

  return items.map((item) => ({
    temp_id: tempIdMap.get(item.id)!,
    parent_temp_id: item.parent_id ? tempIdMap.get(item.parent_id) || null : null,
    title: item.title,
    url: item.url,
    target: item.target,
    item_type: item.item_type,
    css_class: item.css_class,
  }));
}

// ─── DnD Menu Item Component ──────────────────────────

interface DnDMenuItemProps {
  item: MenuItemData;
  isEditing: boolean;
  editData: { title: string; url: string; target: string; css_class: string };
  dropIndicator: DropIndicator | null;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onEdit: (id: string) => void;
  onEditChange: (field: string, value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  lang: string;
}

function DnDMenuItem({
  item, isEditing, editData, dropIndicator, isDragging,
  onDragStart, onDragOver, onDragLeave, onDrop,
  onEdit, onEditChange, onEditSave, onEditCancel,
  onDelete, onIndent, onOutdent, lang,
}: DnDMenuItemProps) {
  const isDropTarget = dropIndicator?.targetId === item.id;
  const dropPos = isDropTarget ? dropIndicator!.position : null;

  return (
    <div
      className="relative"
      onDragOver={(e) => onDragOver(e, item.id)}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop indicator: before */}
      {isDropTarget && dropPos === 'before' && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10"
          style={{ marginLeft: `${item.depth * 24}px` }}
        />
      )}

      <div
        className={`flex items-start gap-1.5 p-2 rounded border transition-all ${
          isDropTarget && dropPos === 'child'
            ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-700'
            : 'bg-muted/50 border-transparent'
        } ${isDragging ? 'opacity-40' : ''}`}
        style={{ marginLeft: `${item.depth * 24}px` }}
      >
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, item.id)}
          className="cursor-grab active:cursor-grabbing p-0.5 mt-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {isEditing ? (
          /* ── Edit mode ── */
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
                <Input
                  value={editData.title}
                  onChange={(e) => onEditChange('title', e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">URL</Label>
                <Input
                  value={editData.url}
                  onChange={(e) => onEditChange('url', e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{lang === 'tr' ? 'Hedef' : 'Target'}</Label>
                <Select value={editData.target} onValueChange={(v) => onEditChange('target', v)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_self">{lang === 'tr' ? 'Aynı Pencere' : 'Same Window'}</SelectItem>
                    <SelectItem value="_blank">{lang === 'tr' ? 'Yeni Pencere' : 'New Window'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">CSS Class</Label>
                <Input
                  value={editData.css_class}
                  onChange={(e) => onEditChange('css_class', e.target.value)}
                  className="h-7 text-sm"
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs" onClick={onEditSave}>
                <Check className="h-3 w-3 mr-1" />
                {lang === 'tr' ? 'Kaydet' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onEditCancel}>
                <X className="h-3 w-3 mr-1" />
                {lang === 'tr' ? 'İptal' : 'Cancel'}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Display mode ── */
          <>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.title || '(untitled)'}</div>
              {item.url && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.url}</span>
                </div>
              )}
            </div>
            {item.depth > 0 && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {lang === 'tr' ? 'alt' : 'sub'}
              </Badge>
            )}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Indent / Outdent */}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => onOutdent(item.id)}
                disabled={item.depth === 0}
                title={lang === 'tr' ? 'Sola Kaydır' : 'Outdent'}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => onIndent(item.id)}
                disabled={item.depth >= 2}
                title={lang === 'tr' ? 'Sağa Kaydır (Alt öğe yap)' : 'Indent (Make sub-item)'}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              {/* Edit */}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => onEdit(item.id)}
                title={lang === 'tr' ? 'Düzenle' : 'Edit'}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              {/* Delete */}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive"
                onClick={() => onDelete(item.id)}
                title={lang === 'tr' ? 'Sil' : 'Delete'}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Drop indicator: after */}
      {isDropTarget && dropPos === 'after' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10"
          style={{ marginLeft: `${item.depth * 24}px` }}
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────

export function MenuEditor() {
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  // Menu list state
  const [menus, setMenus] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState<any>(null);
  const [newMenuName, setNewMenuName] = useState('');
  const [deleteMenuId, setDeleteMenuId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Menu items state
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [newItem, setNewItem] = useState({ title: '', url: '', target: '_self' });

  // DnD state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', url: '', target: '_self', css_class: '' });

  // Dirty tracking for auto-save
  const [isDirty, setIsDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeSite) loadMenus();
  }, [activeSite]);

  // Auto-save when items change
  useEffect(() => {
    if (isDirty && activeMenu) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveItems(items);
        setIsDirty(false);
      }, 800);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, isDirty]);

  // ── Menu CRUD ──

  const loadMenus = async () => {
    const res = await api.getMenus();
    if (res.success) {
      setMenus(res.data as any[]);
      if (!activeMenu && (res.data as any[]).length > 0) {
        selectMenu((res.data as any[])[0]);
      }
    }
  };

  const selectMenu = async (menu: any) => {
    setActiveMenu(menu);
    setEditingId(null);
    const res = await api.request<any>(`/menus/${menu.id}`);
    if (res.success) {
      setItems(buildFlatTree(res.data?.items || []));
      setIsDirty(false);
    }
  };

  const createMenu = async () => {
    if (!newMenuName) return;
    setLoading(true);
    try {
      await api.createMenu({ name: newMenuName, slug: newMenuName.toLowerCase().replace(/\s+/g, '-') });
      toast(tr ? 'Menü oluşturuldu' : 'Menu created', 'success');
    } catch {
      toast(tr ? 'Oluşturma başarısız' : 'Create failed', 'error');
    }
    setLoading(false);
    setNewMenuName('');
    loadMenus();
  };

  const confirmDeleteMenu = async () => {
    if (deleteMenuId === null) return;
    try {
      await api.request(`/menus/${deleteMenuId}`, { method: 'DELETE' });
      toast(tr ? 'Menü silindi' : 'Menu deleted', 'success');
    } catch {
      toast(tr ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteMenuId(null);
    setActiveMenu(null);
    setItems([]);
    loadMenus();
  };

  // ── Save items to API ──

  const saveItems = async (currentItems: MenuItemData[]) => {
    if (!activeMenu) return;
    try {
      const payload = toSavePayload(currentItems);
      const res = await api.request<any>(`/menus/${activeMenu.id}`, {
        method: 'PUT',
        body: { items: payload },
      });
      if (res.success && res.data?.items) {
        // Re-sync with server IDs
        setItems(buildFlatTree(res.data.items));
      }
    } catch {
      toast(tr ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
  };

  // ── Add item ──

  const addItem = () => {
    if (!activeMenu || !newItem.title) return;
    const newMenuItem: MenuItemData = {
      id: nextTempId(),
      title: newItem.title,
      url: newItem.url,
      target: newItem.target,
      item_type: 'custom',
      parent_id: null,
      depth: 0,
      css_class: null,
    };
    setItems((prev) => [...prev, newMenuItem]);
    setNewItem({ title: '', url: '', target: '_self' });
    setIsDirty(true);
    toast(tr ? 'Öğe eklendi' : 'Item added', 'success');
  };

  // ── Delete item ──

  const deleteItem = (itemId: string) => {
    const descendantIds = getDescendantIds(items, itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId && !descendantIds.has(i.id)));
    setIsDirty(true);
    toast(tr ? 'Öğe silindi' : 'Item removed', 'success');
  };

  // ── Edit item ──

  const startEdit = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setEditingId(itemId);
    setEditData({
      title: item.title,
      url: item.url,
      target: item.target,
      css_class: item.css_class || '',
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingId
          ? { ...item, title: editData.title, url: editData.url, target: editData.target, css_class: editData.css_class || null }
          : item,
      ),
    );
    setEditingId(null);
    setIsDirty(true);
  };

  const cancelEdit = () => setEditingId(null);

  // ── Indent / Outdent ──

  const handleIndent = (itemId: string) => {
    setItems((prev) => indentItem(prev, itemId));
    setIsDirty(true);
  };

  const handleOutdent = (itemId: string) => {
    setItems((prev) => outdentItem(prev, itemId));
    setIsDirty(true);
  };

  // ── Drag and Drop ──

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Set a minimal drag image
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, 10, 10);
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (!draggedId || draggedId === targetId) {
        setDropIndicator(null);
        return;
      }

      // Can't drop on own descendant
      const descIds = getDescendantIds(items, draggedId);
      if (descIds.has(targetId)) {
        setDropIndicator(null);
        return;
      }

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      let position: DropPosition;
      if (y < height * 0.25) {
        position = 'before';
      } else if (y > height * 0.75) {
        position = 'after';
      } else {
        position = 'child';
      }

      // Limit nesting depth
      const target = items.find((i) => i.id === targetId);
      if (target && position === 'child' && target.depth >= 2) {
        position = 'after';
      }

      setDropIndicator({ targetId, position });
    },
    [draggedId, items],
  );

  const handleDragLeave = () => {
    // Don't clear immediately - let dragover on next element set it
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedId || !dropIndicator) {
      setDraggedId(null);
      setDropIndicator(null);
      return;
    }

    setItems((prev) => moveItem(prev, draggedId, dropIndicator.targetId, dropIndicator.position));
    setDraggedId(null);
    setDropIndicator(null);
    setIsDirty(true);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropIndicator(null);
  };

  // ── Render ──

  return (
    <div className="space-y-4" onDragEnd={handleDragEnd}>
      <h1 className="text-2xl font-bold">{t('nav.menus', lang)}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left Panel: Menu List ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tr ? 'Menüler' : 'Menus'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              {menus.map((menu) => (
                <div
                  key={menu.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    activeMenu?.id === menu.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => selectMenu(menu)}
                >
                  <span className="text-sm font-medium">{menu.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteMenuId(menu.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder={tr ? 'Menü adı' : 'Menu name'}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && createMenu()}
              />
              <Button size="sm" onClick={createMenu} disabled={loading}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Right Panel: Menu Items ── */}
        <div className="lg:col-span-2 space-y-4">
          {activeMenu ? (
            <>
              {/* Item Tree */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>
                      {activeMenu.name} — {tr ? 'Öğeler' : 'Items'}
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        ({items.length})
                      </span>
                    </span>
                    {isDirty && (
                      <Badge variant="outline" className="text-xs animate-pulse">
                        {tr ? 'Kaydediliyor...' : 'Saving...'}
                      </Badge>
                    )}
                  </CardTitle>
                  {items.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {tr
                        ? 'Sürükleyerek sıralayın. Ortasına bırakarak alt öğe yapın. ← → ile de iç/dış yapabilirsiniz.'
                        : 'Drag to reorder. Drop on middle to nest. Use ← → to indent/outdent.'}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {tr ? 'Henüz öğe eklenmemiş' : 'No items yet'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {items.map((item) => (
                        <DnDMenuItem
                          key={item.id}
                          item={item}
                          isEditing={editingId === item.id}
                          editData={editData}
                          dropIndicator={dropIndicator}
                          isDragging={draggedId === item.id}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onEdit={startEdit}
                          onEditChange={(field, val) =>
                            setEditData((prev) => ({ ...prev, [field]: val }))
                          }
                          onEditSave={saveEdit}
                          onEditCancel={cancelEdit}
                          onDelete={deleteItem}
                          onIndent={handleIndent}
                          onOutdent={handleOutdent}
                          lang={lang}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add New Item */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {tr ? 'Yeni Öğe Ekle' : 'Add New Item'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{tr ? 'Başlık' : 'Title'}</Label>
                      <Input
                        value={newItem.title}
                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={newItem.url}
                        onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                        placeholder="https://"
                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="w-40">
                      <Label className="text-xs">{tr ? 'Hedef' : 'Target'}</Label>
                      <Select
                        value={newItem.target}
                        onValueChange={(v) => setNewItem({ ...newItem, target: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_self">{tr ? 'Aynı Pencere' : 'Same Window'}</SelectItem>
                          <SelectItem value="_blank">{tr ? 'Yeni Pencere' : 'New Window'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addItem} disabled={!newItem.title}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('action.create', lang)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {tr ? 'Bir menü seçin veya yeni oluşturun' : 'Select a menu or create a new one'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteMenuId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteMenuId(null);
        }}
        onConfirm={confirmDeleteMenu}
        title={tr ? 'Menüyü Sil' : 'Delete Menu'}
        description={tr ? 'Bu menü kalıcı olarak silinecek.' : 'This menu will be permanently deleted.'}
        confirmLabel={tr ? 'Sil' : 'Delete'}
        cancelLabel={tr ? 'İptal' : 'Cancel'}
        variant="destructive"
      />
    </div>
  );
}
