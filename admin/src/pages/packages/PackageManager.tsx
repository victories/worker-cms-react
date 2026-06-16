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
import { Package, Plus, Edit2, Trash2, Users, GripVertical, ToggleLeft, ToggleRight, CreditCard, Coins, ExternalLink, Check, X } from 'lucide-react';

interface PackageData {
  id: number;
  name: string;
  description: string | null;
  name_en: string | null;
  description_en: string | null;
  price_monthly: number;
  price_yearly: number;
  max_sites: number;
  max_storage_mb: number;
  max_posts_per_site: number;
  features: string | null;
  is_active: number;
  sort_order: number;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  creem_product_monthly_id: string | null;
  creem_product_yearly_id: string | null;
  crypto_enabled: number;
  white_label: number;
  active_subscribers?: number;
}

const emptyPackage = {
  name: '',
  description: '',
  name_en: '',
  description_en: '',
  price_monthly: 0,
  price_yearly: 0,
  max_sites: 1,
  max_storage_mb: 500,
  max_posts_per_site: 0,
  features: [] as string[],
  is_active: true,
  sort_order: 0,
  stripe_price_monthly_id: '',
  stripe_price_yearly_id: '',
  creem_product_monthly_id: '',
  creem_product_yearly_id: '',
  crypto_enabled: true,
  white_label: false,
};

export function PackageManager() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyPackage);
  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Pending crypto payments
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await api.request('/packages/admin/all') as any;
      if (res.success) setPackages(res.data);
    } catch {}
    setLoading(false);
  };

  const fetchPending = async () => {
    try {
      const res = await api.request('/subscriptions/pending') as any;
      if (res.success) setPendingPayments(res.data);
    } catch {}
  };

  useEffect(() => { fetchPackages(); fetchPending(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyPackage);
    setFeatureInput('');
    setShowEditor(true);
  };

  const openEdit = (pkg: PackageData) => {
    setEditId(pkg.id);
    let features: string[] = [];
    try { features = pkg.features ? JSON.parse(pkg.features) : []; } catch {}
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      name_en: pkg.name_en || '',
      description_en: pkg.description_en || '',
      price_monthly: pkg.price_monthly,
      price_yearly: pkg.price_yearly,
      max_sites: pkg.max_sites,
      max_storage_mb: pkg.max_storage_mb,
      max_posts_per_site: pkg.max_posts_per_site,
      features,
      is_active: pkg.is_active === 1,
      sort_order: pkg.sort_order,
      stripe_price_monthly_id: pkg.stripe_price_monthly_id || '',
      stripe_price_yearly_id: pkg.stripe_price_yearly_id || '',
      creem_product_monthly_id: pkg.creem_product_monthly_id || '',
      creem_product_yearly_id: pkg.creem_product_yearly_id || '',
      crypto_enabled: pkg.crypto_enabled === 1,
      white_label: pkg.white_label === 1,
    });
    setFeatureInput('');
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const body = { ...form };
      if (editId) {
        await api.request(`/packages/admin/${editId}`, { method: 'PUT', body });
        toast(tr ? 'Paket g\u00fcncellendi' : 'Package updated', 'success');
      } else {
        await api.request('/packages/admin', { method: 'POST', body });
        toast(tr ? 'Paket olu\u015fturuldu' : 'Package created', 'success');
      }
      setShowEditor(false);
      fetchPackages();
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const res = await api.request(`/packages/admin/${deleteId}`, { method: 'DELETE' }) as any;
      if (res.success) {
        toast(tr ? 'Paket silindi' : 'Package deleted', 'success');
        fetchPackages();
      } else {
        toast(res.error || 'Error', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
    setDeleteId(null);
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !form.features.includes(f)) {
      setForm({ ...form, features: [...form.features, f] });
      setFeatureInput('');
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const handleApproveCrypto = async (id: number) => {
    try {
      const res = await api.request(`/subscriptions/${id}/approve`, { method: 'POST' }) as any;
      if (res.success) {
        toast(tr ? '\u00d6deme onayland\u0131' : 'Payment approved', 'success');
        fetchPending();
      }
    } catch {}
  };

  const handleRejectCrypto = async (id: number) => {
    try {
      await api.request(`/subscriptions/${id}/reject`, { method: 'POST' });
      toast(tr ? '\u00d6deme reddedildi' : 'Payment rejected', 'success');
      fetchPending();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          {tr ? 'Paket Y\u00f6netimi' : 'Package Management'}
        </h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {tr ? 'Yeni Paket' : 'New Package'}
        </Button>
      </div>

      {/* Pending Crypto Payments */}
      {pendingPayments.length > 0 && (
        <div className="rounded-lg border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 p-4 space-y-3">
          <h3 className="font-bold text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <Coins className="h-5 w-5" />
            {tr ? `Bekleyen Crypto Ödemeler (${pendingPayments.length})` : `Pending Crypto Payments (${pendingPayments.length})`}
          </h3>
          {pendingPayments.map((p: any) => {
            const explorerUrls: Record<string, string> = {
              ethereum: `https://etherscan.io/tx/${p.crypto_tx_hash}`,
              bsc: `https://bscscan.com/tx/${p.crypto_tx_hash}`,
              polygon: `https://polygonscan.com/tx/${p.crypto_tx_hash}`,
              arbitrum: `https://arbiscan.io/tx/${p.crypto_tx_hash}`,
              optimism: `https://optimistic.etherscan.io/tx/${p.crypto_tx_hash}`,
              avalanche: `https://snowtrace.io/tx/${p.crypto_tx_hash}`,
              solana: `https://solscan.io/tx/${p.crypto_tx_hash}`,
              tron: `https://tronscan.org/#/transaction/${p.crypto_tx_hash}`,
            };
            const explorerUrl = explorerUrls[p.crypto_chain] || `https://www.google.com/search?q=${p.crypto_chain}+tx+${p.crypto_tx_hash}`;
            return (
              <div key={p.id} className="bg-background rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{p.user_name || p.user_email}</span>
                    <span className="text-muted-foreground">&rarr;</span>
                    <Badge variant="outline">{p.package_name}</Badge>
                    <Badge variant="secondary" className="text-xs uppercase">{p.crypto_chain}</Badge>
                    <span className="font-semibold text-green-600">${p.crypto_amount}</span>
                    <span className="text-xs text-muted-foreground">USDT/USDC</span>
                    <span className="text-xs text-muted-foreground">• {p.billing_period === 'yearly' ? (tr ? 'Yıllık' : 'Yearly') : (tr ? 'Aylık' : 'Monthly')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveCrypto(p.id)}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {tr ? 'Onayla' : 'Approve'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleRejectCrypto(p.id)}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      {tr ? 'Reddet' : 'Reject'}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">TX:</span>
                  <code className="font-mono bg-muted px-1.5 py-0.5 rounded break-all flex-1">{p.crypto_tx_hash}</code>
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-primary hover:underline font-medium">
                    <ExternalLink className="h-3 w-3" />
                    Explorer
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => {
          let features: string[] = [];
          try { features = pkg.features ? JSON.parse(pkg.features) : []; } catch {}
          return (
            <div key={pkg.id} className={`rounded-xl border p-5 space-y-3 transition-all ${pkg.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  {pkg.description && <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(pkg)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(pkg.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">${pkg.price_monthly}</span>
                <span className="text-sm text-muted-foreground">/{tr ? 'ay' : 'mo'}</span>
                {pkg.price_yearly > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">(${pkg.price_yearly}/{tr ? 'y\u0131l' : 'yr'})</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">{pkg.max_sites} {tr ? 'site' : 'sites'}</Badge>
                <Badge variant="outline" className="text-xs">{pkg.max_storage_mb} MB</Badge>
                {pkg.max_posts_per_site > 0 && <Badge variant="outline" className="text-xs">{pkg.max_posts_per_site} {tr ? 'yaz\u0131/site' : 'posts/site'}</Badge>}
                {pkg.max_posts_per_site === 0 && <Badge variant="outline" className="text-xs">{tr ? 'S\u0131n\u0131rs\u0131z yaz\u0131' : 'Unlimited posts'}</Badge>}
              </div>

              {features.length > 0 && (
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {features.map((f, i) => <li key={i} className="flex items-center gap-1.5">{'\u2713'} {f}</li>)}
                </ul>
              )}

              <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {pkg.active_subscribers || 0} {tr ? 'abone' : 'subscribers'}
                </div>
                <div className="flex items-center gap-2">
                  {pkg.stripe_price_monthly_id && <span title="Stripe"><CreditCard className="h-3 w-3 text-blue-500" /></span>}
                  {pkg.crypto_enabled === 1 && <span title="Crypto"><Coins className="h-3 w-3 text-orange-500" /></span>}
                  <Badge variant={pkg.is_active ? 'success' : 'secondary'} className="text-[10px]">
                    {pkg.is_active ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}

        {packages.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {tr ? 'Hen\u00fcz paket olu\u015fturulmam\u0131\u015f.' : 'No packages created yet.'}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? (tr ? 'Paket D\u00fczenle' : 'Edit Package') : (tr ? 'Yeni Paket' : 'New Package')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{tr ? 'Paket Ad\u0131 (TR)' : 'Package Name (TR)'} *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ba\u015flang\u0131\u00e7" />
              </div>
              <div className="col-span-2">
                <Label>{tr ? 'Paket Ad\u0131 (EN)' : 'Package Name (EN)'}</Label>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} placeholder="Starter" />
              </div>
              <div className="col-span-2">
                <Label>{tr ? 'A\u00e7\u0131klama (TR)' : 'Description (TR)'}</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>{tr ? 'A\u00e7\u0131klama (EN)' : 'Description (EN)'}</Label>
                <Input value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
              </div>
              <div>
                <Label>{tr ? 'Ayl\u0131k Fiyat ($)' : 'Monthly Price ($)'}</Label>
                <Input type="number" step="0.01" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>{tr ? 'Y\u0131ll\u0131k Fiyat ($)' : 'Yearly Price ($)'}</Label>
                <Input type="number" step="0.01" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>{tr ? 'Maks Site' : 'Max Sites'}</Label>
                <Input type="number" value={form.max_sites} onChange={(e) => setForm({ ...form, max_sites: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>{tr ? 'Depolama (MB)' : 'Storage (MB)'}</Label>
                <Input type="number" value={form.max_storage_mb} onChange={(e) => setForm({ ...form, max_storage_mb: parseInt(e.target.value) || 500 })} />
              </div>
              <div>
                <Label>{tr ? 'Yaz\u0131/Site (0=s\u0131n\u0131rs\u0131z)' : 'Posts/Site (0=unlimited)'}</Label>
                <Input type="number" value={form.max_posts_per_site} onChange={(e) => setForm({ ...form, max_posts_per_site: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>{tr ? 'S\u0131ralama' : 'Sort Order'}</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            {/* Features */}
            <div>
              <Label>{tr ? '\u00d6zellikler' : 'Features'}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder={tr ? '\u00d6zellik ekle...' : 'Add feature...'}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>+</Button>
              </div>
              {form.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {f}
                      <button type="button" onClick={() => removeFeature(i)} className="ml-1 hover:text-destructive">&times;</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Stripe IDs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stripe Monthly Price ID</Label>
                <Input value={form.stripe_price_monthly_id} onChange={(e) => setForm({ ...form, stripe_price_monthly_id: e.target.value })} placeholder="price_xxx" className="font-mono text-xs" />
              </div>
              <div>
                <Label>Stripe Yearly Price ID</Label>
                <Input value={form.stripe_price_yearly_id} onChange={(e) => setForm({ ...form, stripe_price_yearly_id: e.target.value })} placeholder="price_xxx" className="font-mono text-xs" />
              </div>
            </div>

            {/* Creem product IDs — the card-payment provider. Create a
                product per billing period in the Creem dashboard and paste
                its ID here; the "Pay with Card" button uses these. */}
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

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                <span className="text-sm">{tr ? 'Aktif' : 'Active'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.crypto_enabled} onChange={(e) => setForm({ ...form, crypto_enabled: e.target.checked })} className="rounded" />
                <span className="text-sm">{tr ? 'Crypto \u00d6deme' : 'Crypto Payment'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.white_label} onChange={(e) => setForm({ ...form, white_label: e.target.checked })} className="rounded" />
                <span className="text-sm">{tr ? 'White Label (Footer gizle)' : 'White Label (Hide footer)'}</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>{tr ? '\u0130ptal' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? '...' : (editId ? (tr ? 'G\u00fcncelle' : 'Update') : (tr ? 'Olu\u015ftur' : 'Create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={confirmDelete}
        title={tr ? 'Paketi Sil' : 'Delete Package'}
        description={tr ? 'Bu paket kal\u0131c\u0131 olarak silinecek.' : 'This package will be permanently deleted.'}
        confirmLabel={tr ? 'Sil' : 'Delete'}
        cancelLabel={tr ? '\u0130ptal' : 'Cancel'}
        variant="destructive"
      />
    </div>
  );
}
