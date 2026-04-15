import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { Card, CardContent } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Switch } from '@ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { ArrowRightLeft, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

interface Redirect {
  id: number;
  site_id: number;
  source_path: string;
  target_url: string | null;
  status_code: number;
  is_active: number;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

const statusCodeConfig: Record<number, { label: string; color: string }> = {
  301: { label: '301 Moved', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  302: { label: '302 Found', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  403: { label: '403 Forbidden', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
  404: { label: '404 Not Found', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  410: { label: '410 Gone', color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
};

export function RedirectSettings() {
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formSource, setFormSource] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formCode, setFormCode] = useState('301');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Redirect | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeSite) loadRedirects();
  }, [activeSite]);

  const loadRedirects = async () => {
    setLoading(true);
    try {
      const res = await api.getRedirects() as any;
      if (res.success) setRedirects(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const openCreate = () => {
    setEditId(null);
    setFormSource('');
    setFormTarget('');
    setFormCode('301');
    setFormActive(true);
    setShowDialog(true);
  };

  const openEdit = (r: Redirect) => {
    setEditId(r.id);
    setFormSource(r.source_path);
    setFormTarget(r.target_url || '');
    setFormCode(String(r.status_code));
    setFormActive(r.is_active === 1);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formSource.trim()) return;
    const code = parseInt(formCode);
    if ((code === 301 || code === 302) && !formTarget.trim()) {
      toast(tr ? 'Hedef URL gerekli' : 'Target URL is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        source_path: formSource.trim(),
        target_url: formTarget.trim() || undefined,
        status_code: code,
        is_active: formActive ? 1 : 0,
      };

      let res: any;
      if (editId) {
        res = await api.updateRedirect(editId, data);
      } else {
        res = await api.createRedirect(data);
      }

      if (res.success) {
        toast(tr ? 'Kaydedildi' : 'Saved', 'success');
        setShowDialog(false);
        loadRedirects();
      } else {
        toast(res.error || (tr ? 'Hata' : 'Error'), 'error');
      }
    } catch {
      toast(tr ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.deleteRedirect(deleteTarget.id) as any;
      if (res.success) {
        toast(tr ? 'Silindi' : 'Deleted', 'success');
        setShowDeleteDialog(false);
        setDeleteTarget(null);
        loadRedirects();
      }
    } catch {
      toast(tr ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  const needsTarget = formCode === '301' || formCode === '302';

  if (loading) {
    return <p className="text-muted-foreground p-4">{tr ? 'Yükleniyor...' : 'Loading...'}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{tr ? 'URL Yönlendirmeleri' : 'URL Redirects'}</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {tr ? 'Yeni Yönlendirme' : 'New Redirect'}
        </Button>
      </div>

      {redirects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{tr ? 'Henüz yönlendirme yok' : 'No redirects yet'}</p>
              <p className="text-sm mt-1">
                {tr ? 'URL yönlendirmelerini buradan yönetin' : 'Manage URL redirects from here'}
              </p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {tr ? 'İlk Yönlendirmeyi Ekle' : 'Add First Redirect'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">{tr ? 'Kaynak' : 'Source'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Hedef' : 'Target'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Kod' : 'Code'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Durum' : 'Status'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Hit' : 'Hits'}</th>
                  <th className="text-right p-3 font-medium">{tr ? 'İşlemler' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => {
                  const config = statusCodeConfig[r.status_code] || statusCodeConfig[301];
                  return (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{r.source_path}</code>
                      </td>
                      <td className="p-3">
                        {r.target_url ? (
                          <span className="text-xs text-muted-foreground font-mono break-all">{r.target_url}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-xs ${config.color}`}>
                          {config.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-xs">
                          {r.is_active ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{r.hit_count}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => { setDeleteTarget(r); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId
                ? (tr ? 'Yönlendirmeyi Düzenle' : 'Edit Redirect')
                : (tr ? 'Yeni Yönlendirme' : 'New Redirect')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{tr ? 'Kaynak Yol' : 'Source Path'}</Label>
              <Input
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="/eski-sayfa"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tr ? 'Otomatik olarak / ile başlatılır' : 'Will auto-prepend / if missing'}
              </p>
            </div>

            <div>
              <Label>{tr ? 'Durum Kodu' : 'Status Code'}</Label>
              <Select value={formCode} onValueChange={setFormCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - {tr ? 'Kalıcı Yönlendirme' : 'Permanent Redirect'}</SelectItem>
                  <SelectItem value="302">302 - {tr ? 'Geçici Yönlendirme' : 'Temporary Redirect'}</SelectItem>
                  <SelectItem value="403">403 - {tr ? 'Yasaklı' : 'Forbidden'}</SelectItem>
                  <SelectItem value="404">404 - {tr ? 'Bulunamadı' : 'Not Found'}</SelectItem>
                  <SelectItem value="410">410 - {tr ? 'Kaldırıldı' : 'Gone'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsTarget && (
              <div>
                <Label>{tr ? 'Hedef URL' : 'Target URL'}</Label>
                <Input
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="/yeni-sayfa veya https://..."
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>{tr ? 'Aktif' : 'Active'}</Label>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tr ? 'İptal' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formSource.trim()}>
              {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr ? 'Yönlendirmeyi Sil' : 'Delete Redirect'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm">
                {tr ? 'Bu yönlendirmeyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this redirect?'}
              </p>
            </div>
            {deleteTarget && (
              <div className="p-3 rounded-md bg-muted">
                <code className="text-sm font-mono">{deleteTarget.source_path}</code>
                {deleteTarget.target_url && (
                  <span className="text-muted-foreground text-sm"> → {deleteTarget.target_url}</span>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {tr ? 'İptal' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? (tr ? 'Siliniyor...' : 'Deleting...') : (tr ? 'Sil' : 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
