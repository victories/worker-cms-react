import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { Button } from '@ui/button';
import { X } from 'lucide-react';
import { getSlotEntry } from './slot-catalog';

export interface SelectedSlotInfo {
  uid: string;
  id: string;
  props?: Record<string, unknown>;
}

export interface SlotConfigPanelProps {
  selected: SelectedSlotInfo | null;
  onChangeProps(props: Record<string, unknown>): void;
  onClose(): void;
}

interface MenuOption {
  id: number;
  name: string;
}

/**
 * Right-rail panel for editing the props of a selected slot. Each
 * known slot id has a tailored form; everything else falls through to
 * a read-only "no settings" notice.
 */
export function SlotConfigPanel({ selected, onChangeProps, onClose }: SlotConfigPanelProps) {
  const [menus, setMenus] = useState<MenuOption[] | null>(null);

  useEffect(() => {
    // Lazy fetch menus only when the menu slot is selected.
    if (selected?.id !== 'menu' || menus !== null) return;
    api
      .request<{ success: boolean; data: MenuOption[] }>('/menus')
      .then((res) => setMenus(res.data ?? []))
      .catch(() => setMenus([]));
  }, [selected?.id, menus]);

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Düzenlemek için bir slot seçin.
      </div>
    );
  }

  const entry = getSlotEntry(selected.id);
  const props = (selected.props ?? {}) as Record<string, any>;

  function setProp(key: string, value: unknown) {
    onChangeProps({ ...props, [key]: value });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div className="text-sm font-medium">{entry?.label ?? selected.id}</div>
          <div className="font-mono text-[10px] text-muted-foreground">{selected.id}</div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selected.id === 'logo' ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Alt yazı (a11y)</Label>
              <Input
                value={props.alt ?? ''}
                onChange={(e) => setProp('alt', e.target.value)}
                placeholder="Site logosu"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tıklandığında</Label>
              <Input
                value={props.href ?? '/'}
                onChange={(e) => setProp('href', e.target.value)}
                placeholder="/"
                className="h-8 text-xs"
              />
            </div>
          </>
        ) : null}

        {selected.id === 'menu' ? (
          <div className="space-y-1">
            <Label className="text-xs">Menü</Label>
            <select
              value={props.menu_id ?? ''}
              onChange={(e) =>
                setProp('menu_id', e.target.value ? Number(e.target.value) : null)
              }
              className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
            >
              <option value="">— seçin —</option>
              {(menus ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {menus === null ? (
              <p className="text-[10px] text-muted-foreground">Menüler yükleniyor…</p>
            ) : menus.length === 0 ? (
              <p className="text-[10px] text-amber-600">
                Henüz menü tanımlı değil. Menüler sayfasından oluşturabilirsiniz.
              </p>
            ) : null}
          </div>
        ) : null}

        {selected.id === 'search' ? (
          <div className="space-y-1">
            <Label className="text-xs">Yer tutucu</Label>
            <Input
              value={props.placeholder ?? 'Ara…'}
              onChange={(e) => setProp('placeholder', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ) : null}

        {selected.id === 'widget:recent-posts' ? (
          <div className="space-y-1">
            <Label className="text-xs">Yazı sayısı</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={props.count ?? 5}
              onChange={(e) => setProp('count', Number(e.target.value) || 5)}
              className="h-8 text-xs"
            />
          </div>
        ) : null}

        {selected.id === 'widget:custom-html' ? (
          <div className="space-y-1">
            <Label className="text-xs">HTML</Label>
            <Textarea
              value={props.html ?? ''}
              onChange={(e) => setProp('html', e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder="<div>…</div>"
            />
          </div>
        ) : null}

        {selected.id === 'widget:about' ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Başlık</Label>
              <Input
                value={props.title ?? ''}
                onChange={(e) => setProp('title', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Metin (HTML kabul edilir)</Label>
              <Textarea
                value={props.html ?? ''}
                onChange={(e) => setProp('html', e.target.value)}
                rows={6}
                className="text-xs"
              />
            </div>
          </>
        ) : null}

        {['user-actions', 'main-content', 'widget:categories', 'widget:tags', 'widget:newsletter'].includes(
          selected.id
        ) ? (
          <p className="text-[11px] text-muted-foreground">
            Bu slotun ek ayarı yok.
          </p>
        ) : null}
      </div>
    </div>
  );
}
