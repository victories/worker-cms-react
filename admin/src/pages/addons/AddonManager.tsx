import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@ui/toast-notification';
import { Boxes, Plus, Edit2, Trash2 } from 'lucide-react';

interface AddonData {
  id: number;
  key: string;
  name: string;
  description: string | null;
  type: 'unit' | 'feature';
  unit_label: string | null;
  feature_key: string | null;
  price_monthly: number;
  price_yearly: number;
  creem_product_monthly_id: string | null;
  creem_product_yearly_id: string | null;
  max_units: number | null;
  is_active: number;
  sort_order: number;
}

const emptyAddon = {
  name: '',
  description: '',
  type: 'feature' as 'unit' | 'feature',
  unit_label: '',
  feature_key: '',
  price_monthly: 0,
  price_yearly: 0,
  creem_product_monthly_id: '',
  creem_product_yearly_id: '',
  max_units: 0,
  is_active: true,
  sort_order: 0,
};

export function AddonManager() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  const [addons, setAddons] = useState<AddonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyAddon);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const res = await api.request('/addons/admin/all') as any;
      if (res.success) setAddons(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAddons(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyAddon);
    setShowEditor(true);
  };

  const openEdit = (addon: AddonData) => {
    setEditId(addon.id);
    setForm({
      name: addon.name,
      description: addon.description || '',
      type: addon.type === 'unit' ? 'unit' : 'feature',
      unit_label: addon.unit_label || '',
      feature_key: addon.feature_key || '',
      price_monthly: addon.price_monthly,
      price_yearly: addon.price_yearly,
      creem_product_monthly_id: addon.creem_product_monthly_id || '',
      creem_product_yearly_id: addon.creem_product_yearly_id || '',
      max_units: addon.max_units ?? 0,
      is_active: addon.is_active === 1,
      sort_order: addon.sort_order,
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const body = { ...form };
      let res: any;
      if (editId) {
        res = await api.request(`/addons/admin/${editId}`, { method: 'PUT', body });
        toast(tr ? 'Eklenti güncellendi' : 'Add-on updated', 'success');
      } else {
        res = await api.request('/addons/admin', { method: 'POST', body });
        toast(tr ? 'Eklenti oluşturuldu' : 'Add-on created', 'success');
      }
      // Surface the non-fatal Creem product-sync warning, if any. The save
      // already succeeded.
      if (res?.warning) toast(res.warning, 'error');
      setShowEditor(false);
      fetchAddons();
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const res = await api.request(`/addons/admin/${deleteId}`, { method: 'DELETE' }) as any;
      if (res.success) {
        toast(tr ? 'Eklenti silindi' : 'Add-on deleted', 'success');
        fetchAddons();
      } else {
        toast(res.error || 'Error', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="h-6 w-6" />
          {tr ? 'Eklenti Kataloğu' : 'Add-on Catalog'}
        </h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {tr ? 'Yeni Eklenti' : 'New Add-on'}
        </Button>
      </div>

      {/* Add-on Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {addons.map((addon) => (
          <div key={addon.id} className={`rounded-xl border p-5 space-y-3 transition-all ${addon.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{addon.name}</h3>
                {addon.description && <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(addon)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(addon.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">${addon.price_monthly}</span>
              <span className="text-sm text-muted-foreground">/{tr ? 'ay' : 'mo'}</span>
              {addon.price_yearly > 0 && (
                <span className="text-xs text-muted-foreground ml-2">(${addon.price_yearly}/{tr ? 'yıl' : 'yr'})</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">
                {addon.type === 'unit' ? (tr ? 'Birim' : 'Unit') : (tr ? 'Özellik' : 'Feature')}
              </Badge>
              {addon.type === 'unit' && addon.unit_label && (
                <Badge variant="outline" className="text-xs">{addon.unit_label}</Badge>
              )}
              {addon.type === 'unit' && (addon.max_units ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs">{tr ? 'Maks' : 'Max'} {addon.max_units}</Badge>
              )}
              {addon.feature_key && (
                <Badge variant="secondary" className="text-xs font-mono">{addon.feature_key}</Badge>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>#{addon.sort_order}</span>
              <Badge variant={addon.is_active ? 'success' : 'secondary'} className="text-[10px]">
                {addon.is_active ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
              </Badge>
            </div>
          </div>
        ))}

        {addons.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {tr ? 'Henüz eklenti oluşturulmamış.' : 'No add-ons created yet.'}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? (tr ? 'Eklenti Düzenle' : 'Edit Add-on') : (tr ? 'Yeni Eklenti' : 'New Add-on')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{tr ? 'Eklenti Adı' : 'Add-on Name'} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tr ? 'Beyaz Etiket' : 'White Label'} />
              </div>
              <div className="col-span-2">
                <Label>{tr ? 'Açıklama' : 'Description'}</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>{tr ? 'Tip' : 'Type'}</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value === 'unit' ? 'unit' : 'feature' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="feature">{tr ? 'Özellik' : 'Feature'}</option>
                  <option value="unit">{tr ? 'Birim' : 'Unit'}</option>
                </select>
              </div>
              <div>
                <Label>{tr ? 'Sıralama' : 'Sort Order'}</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>

              {form.type === 'unit' && (
                <>
                  <div>
                    <Label>{tr ? 'Birim Etiketi' : 'Unit Label'}</Label>
                    <Input value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} placeholder={tr ? 'site' : 'site'} />
                  </div>
                  <div>
                    <Label>{tr ? 'Maks Birim (0=sınırsız)' : 'Max Units (0=unlimited)'}</Label>
                    <Input type="number" value={form.max_units} onChange={(e) => setForm({ ...form, max_units: parseInt(e.target.value) || 0 })} />
                  </div>
                </>
              )}

              <div className="col-span-2">
                <Label>{tr ? 'Özellik Anahtarı' : 'Feature Key'}</Label>
                <Input value={form.feature_key} onChange={(e) => setForm({ ...form, feature_key: e.target.value })} placeholder="white_label, extra_site" className="font-mono text-xs" />
              </div>

              <div>
                <Label>{tr ? 'Aylık Fiyat ($)' : 'Monthly Price ($)'}</Label>
                <Input type="number" step="0.01" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>{tr ? 'Yıllık Fiyat ($)' : 'Yearly Price ($)'}</Label>
                <Input type="number" step="0.01" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Creem product IDs — auto-fill when you save a price. Leave blank
                to let the server provision a Creem product per billing period. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Creem Monthly Product ID</Label>
                <Input value={form.creem_product_monthly_id} onChange={(e) => setForm({ ...form, creem_product_monthly_id: e.target.value })} placeholder="prod_xxx" className="font-mono text-xs" />
              </div>
              <div>
                <Label>Creem Yearly Product ID</Label>
                <Input value={form.creem_product_yearly_id} onChange={(e) => setForm({ ...form, creem_product_yearly_id: e.target.value })} placeholder="prod_xxx" className="font-mono text-xs" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {tr
                ? 'Creem ürün ID\'leri boş bırakılırsa, bir fiyat kaydettiğinizde otomatik doldurulur.'
                : 'Leave the Creem product IDs blank — they auto-fill when you save a price.'}
            </p>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                <span className="text-sm">{tr ? 'Aktif' : 'Active'}</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>{tr ? 'İptal' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? '...' : (editId ? (tr ? 'Güncelle' : 'Update') : (tr ? 'Oluştur' : 'Create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title={tr ? 'Eklentiyi Sil' : 'Delete Add-on'}
        description={tr ? 'Bu eklenti kalıcı olarak silinecek.' : 'This add-on will be permanently deleted.'}
        confirmLabel={tr ? 'Sil' : 'Delete'}
        cancelLabel={tr ? 'İptal' : 'Cancel'}
        variant="destructive"
      />
    </div>
  );
}
