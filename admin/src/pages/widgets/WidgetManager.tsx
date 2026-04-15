import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Badge } from '@ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { Plus, Trash2, GripVertical, LayoutGrid, Power, PowerOff, ChevronUp, ChevronDown } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@ui/toast-notification';

const WIDGET_TYPES = [
  { value: 'menu', label: 'Menu' },
  { value: 'recent_posts', label: 'Recent Posts' },
  { value: 'categories', label: 'Categories' },
  { value: 'tags', label: 'Tags' },
  { value: 'search', label: 'Search' },
  { value: 'custom_html', label: 'Custom HTML' },
  { value: 'text', label: 'Text' },
  { value: 'social_links', label: 'Social Links' },
  { value: 'newsletter', label: 'Newsletter' },
];

const WIDGET_AREAS = [
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'footer-1', label: 'Footer 1' },
  { value: 'footer-2', label: 'Footer 2' },
  { value: 'footer-3', label: 'Footer 3' },
  { value: 'header', label: 'Header' },
];

export function WidgetManager() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [activeArea, setActiveArea] = useState('sidebar');
  const [newWidget, setNewWidget] = useState({ widget_type: '', title: '', area: 'sidebar' });
  const [deleteWidgetId, setDeleteWidgetId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [menuConfig, setMenuConfig] = useState({ menu_slug: '', style: 'yatay' });

  useEffect(() => {
    loadWidgets();
    loadMenus();
  }, []);

  const loadMenus = async () => {
    const res = await api.request<any>('/menus');
    if (res.success) setMenus(res.data || []);
  };

  const loadWidgets = async () => {
    setLoading(true);
    const res = await api.request<any>('/widgets');
    setLoading(false);
    if (res.success) setWidgets(res.data || []);
  };

  const addWidget = async () => {
    if (!newWidget.widget_type) return;
    // Build config for menu type
    const config = newWidget.widget_type === 'menu'
      ? { menu_slug: menuConfig.menu_slug, style: menuConfig.style }
      : undefined;
    if (newWidget.widget_type === 'menu' && !menuConfig.menu_slug) {
      toast(lang === 'tr' ? 'Lütfen bir menü seçin' : 'Please select a menu', 'error');
      return;
    }
    try {
      await api.request('/widgets', {
        method: 'POST',
        body: { ...newWidget, area: activeArea, config },
      });
      toast(lang === 'tr' ? 'Widget eklendi' : 'Widget added', 'success');
    } catch {
      toast(lang === 'tr' ? 'Ekleme başarısız' : 'Add failed', 'error');
    }
    setNewWidget({ widget_type: '', title: '', area: 'sidebar' });
    setMenuConfig({ menu_slug: '', style: 'yatay' });
    setShowAdd(false);
    loadWidgets();
  };

  const toggleWidget = async (widget: any) => {
    try {
      await api.request(`/widgets/${widget.id}`, {
        method: 'PUT',
        body: { is_active: !widget.is_active },
      });
      const msg = widget.is_active
        ? (lang === 'tr' ? 'Widget devre dışı' : 'Widget deactivated')
        : (lang === 'tr' ? 'Widget aktifleştirildi' : 'Widget activated');
      toast(msg, 'success');
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    loadWidgets();
  };

  const deleteWidget = (id: number) => setDeleteWidgetId(id);

  const confirmDeleteWidget = async () => {
    if (deleteWidgetId === null) return;
    try {
      await api.request(`/widgets/${deleteWidgetId}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Widget silindi' : 'Widget deleted', 'success');
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteWidgetId(null);
    loadWidgets();
  };

  const saveOrder = async (reorderedItems: any[]) => {
    const items = reorderedItems.map((w, idx) => ({ id: w.id, position: idx }));
    await api.request('/widgets/reorder', { method: 'PUT', body: { items } });
    loadWidgets();
  };

  const moveWidget = (widgetId: number, direction: 'up' | 'down') => {
    const sorted = [...widgets.filter(w => w.area === activeArea)].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(w => w.id === widgetId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    [sorted[idx], sorted[targetIdx]] = [sorted[targetIdx], sorted[idx]];
    saveOrder(sorted);
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOverId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragId === null || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const sorted = [...widgets.filter(w => w.area === activeArea)].sort((a, b) => a.position - b.position);
    const dragIdx = sorted.findIndex(w => w.id === dragId);
    const targetIdx = sorted.findIndex(w => w.id === targetId);
    if (dragIdx < 0 || targetIdx < 0) { setDragId(null); setDragOverId(null); return; }
    const [moved] = sorted.splice(dragIdx, 1);
    sorted.splice(targetIdx, 0, moved);
    setDragId(null);
    setDragOverId(null);
    saveOrder(sorted);
  };

  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const areaWidgets = widgets.filter(w => w.area === activeArea);

  if (loading) return <div className="p-4">{t('common.loading', lang)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{lang === 'tr' ? 'Widget Yönetimi' : 'Widget Manager'}</h1>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {lang === 'tr' ? 'Widget Ekle' : 'Add Widget'}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Area selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{lang === 'tr' ? 'Alanlar' : 'Areas'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {WIDGET_AREAS.map((area) => {
              const count = widgets.filter(w => w.area === area.value).length;
              return (
                <div
                  key={area.value}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    activeArea === area.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setActiveArea(area.value)}
                >
                  <span className="text-sm font-medium">{area.label}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Widgets in selected area */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutGrid className="h-5 w-5" />
                {WIDGET_AREAS.find(a => a.value === activeArea)?.label || activeArea}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {areaWidgets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {lang === 'tr' ? 'Bu alanda widget yok' : 'No widgets in this area'}
                </p>
              ) : (
                <div className="space-y-2">
                  {areaWidgets.sort((a, b) => a.position - b.position).map((widget, idx) => (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, widget.id)}
                      onDragOver={(e) => handleDragOver(e, widget.id)}
                      onDrop={(e) => handleDrop(e, widget.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 rounded border transition-all ${
                        widget.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                      } ${dragId === widget.id ? 'opacity-40 scale-95' : ''} ${
                        dragOverId === widget.id && dragId !== widget.id ? 'border-primary border-2 bg-primary/5' : ''
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{widget.title || widget.widget_type}</span>
                          <Badge variant="outline" className="text-xs">
                            {WIDGET_TYPES.find(t => t.value === widget.widget_type)?.label || widget.widget_type}
                          </Badge>
                          {widget.widget_type === 'menu' && (() => {
                            const cfg = widget.config ? (typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config) : {};
                            const menuName = menus.find((m: any) => m.slug === cfg.menu_slug)?.name;
                            return menuName ? <Badge variant="secondary" className="text-xs">{menuName}</Badge> : null;
                          })()}
                          {!widget.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              {lang === 'tr' ? 'Pasif' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => moveWidget(widget.id, 'up')}
                          disabled={idx === 0}
                          title={lang === 'tr' ? 'Yukarı Taşı' : 'Move Up'}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => moveWidget(widget.id, 'down')}
                          disabled={idx === areaWidgets.length - 1}
                          title={lang === 'tr' ? 'Aşağı Taşı' : 'Move Down'}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleWidget(widget)}
                          title={widget.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {widget.is_active ? (
                            <PowerOff className="h-3.5 w-3.5" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => deleteWidget(widget.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === 'tr' ? 'Widget Ekle' : 'Add Widget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === 'tr' ? 'Widget Tipi' : 'Widget Type'}</Label>
              <Select value={newWidget.widget_type} onValueChange={(v) => setNewWidget({ ...newWidget, widget_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={lang === 'tr' ? 'Seçin...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{lang === 'tr' ? 'Başlık' : 'Title'}</Label>
              <Input
                value={newWidget.title}
                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                placeholder={lang === 'tr' ? 'Widget başlığı' : 'Widget title'}
              />
            </div>
            {newWidget.widget_type === 'menu' && (
              <>
                <div>
                  <Label>{lang === 'tr' ? 'Menü Seçin' : 'Select Menu'}</Label>
                  <Select value={menuConfig.menu_slug} onValueChange={(v) => setMenuConfig({ ...menuConfig, menu_slug: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder={lang === 'tr' ? 'Menü seçin...' : 'Select menu...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {menus.map((m: any) => (
                        <SelectItem key={m.id} value={m.slug}>{m.name} {m.location ? `(${m.location})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {menus.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === 'tr' ? 'Henüz menü oluşturmadınız. Önce Menüler sayfasından bir menü oluşturun.' : 'No menus found. Create a menu first from the Menus page.'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>{lang === 'tr' ? 'Stil' : 'Style'}</Label>
                  <Select value={menuConfig.style} onValueChange={(v) => setMenuConfig({ ...menuConfig, style: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yatay">{lang === 'tr' ? 'Yatay' : 'Horizontal'}</SelectItem>
                      <SelectItem value="dikey">{lang === 'tr' ? 'Dikey' : 'Vertical'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              {t('action.cancel', lang)}
            </Button>
            <Button onClick={addWidget} disabled={!newWidget.widget_type}>
              {t('action.create', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteWidgetId !== null}
        onOpenChange={(open) => { if (!open) setDeleteWidgetId(null); }}
        onConfirm={confirmDeleteWidget}
        title={lang === 'tr' ? 'Widget Sil' : 'Delete Widget'}
        description={lang === 'tr' ? 'Bu widget kalıcı olarak silinecek.' : 'This widget will be permanently deleted.'}
        confirmLabel={lang === 'tr' ? 'Sil' : 'Delete'}
        cancelLabel={lang === 'tr' ? 'İptal' : 'Cancel'}
        variant="destructive"
      />
    </div>
  );
}
