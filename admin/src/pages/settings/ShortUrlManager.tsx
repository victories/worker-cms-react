import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link2, Plus, Trash2, Pencil, Copy, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/toast-notification';

interface ShortUrl {
  id: number;
  name: string | null;
  slug: string | null;
  target_url: string;
  click_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export function ShortUrlManager() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  const [shortUrls, setShortUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ShortUrl | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Copy
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadShortUrls();
  }, []);

  const loadShortUrls = async () => {
    setLoading(true);
    try {
      const res = await api.getShortUrls() as any;
      if (res.success) setShortUrls(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const openCreate = () => {
    setEditId(null);
    setFormName('');
    setFormTarget('');
    setShowDialog(true);
  };

  const openEdit = (s: ShortUrl) => {
    setEditId(s.id);
    setFormName(s.name || '');
    setFormTarget(s.target_url);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formTarget.trim()) return;

    setSaving(true);
    try {
      const data = {
        name: formName.trim() || undefined,
        target_url: formTarget.trim(),
      };

      let res: any;
      if (editId) {
        res = await api.updateShortUrl(editId, data);
      } else {
        res = await api.createShortUrl(data);
      }

      if (res.success) {
        toast(tr ? 'Kaydedildi' : 'Saved', 'success');
        setShowDialog(false);
        loadShortUrls();
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
      const res = await api.deleteShortUrl(deleteTarget.id) as any;
      if (res.success) {
        toast(tr ? 'Silindi' : 'Deleted', 'success');
        setShowDeleteDialog(false);
        setDeleteTarget(null);
        loadShortUrls();
      }
    } catch {
      toast(tr ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleting(false);
  };

  const getShortLink = (s: ShortUrl): string => {
    if (s.slug) return `/git/${s.slug}`;
    return `/git/${s.id}`;
  };

  const handleCopy = async (s: ShortUrl) => {
    const link = `${window.location.origin}${getShortLink(s)}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast(tr ? 'Kopyalandı' : 'Copied', 'success');
  };

  if (loading) {
    return <p className="text-muted-foreground p-4">{tr ? 'Yükleniyor...' : 'Loading...'}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{tr ? 'Kısa URL Yönetimi' : 'Short URL Manager'}</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {tr ? 'Yeni Kısa URL' : 'New Short URL'}
        </Button>
      </div>

      {shortUrls.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{tr ? 'Henüz kısa URL yok' : 'No short URLs yet'}</p>
              <p className="text-sm mt-1">
                {tr ? 'Uzun linkleri kısaltmak için kullanın' : 'Use to shorten long links'}
              </p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {tr ? 'İlk Kısa URL\'yi Oluştur' : 'Create First Short URL'}
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
                  <th className="text-left p-3 font-medium">ID</th>
                  <th className="text-left p-3 font-medium">{tr ? 'İsim' : 'Name'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Kısa URL' : 'Short URL'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Hedef URL' : 'Target URL'}</th>
                  <th className="text-left p-3 font-medium">{tr ? 'Tıklama' : 'Clicks'}</th>
                  <th className="text-right p-3 font-medium">{tr ? 'İşlemler' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {shortUrls.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{s.id}</td>
                    <td className="p-3">
                      {s.name ? (
                        <span className="font-medium">{s.name}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono inline-block w-fit">
                          /git/{s.id}
                        </code>
                        {s.slug && (
                          <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono inline-block w-fit">
                            /git/{s.slug}
                          </code>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <a
                        href={s.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground font-mono break-all hover:text-primary flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {s.target_url.length > 60 ? s.target_url.substring(0, 60) + '...' : s.target_url}
                      </a>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{s.click_count}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleCopy(s)} title={tr ? 'Kopyala' : 'Copy'}>
                          <Copy className="h-3 w-3" />
                          {copiedId === s.id && <span className="text-xs ml-1">✓</span>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => { setDeleteTarget(s); setShowDeleteDialog(true); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                ? (tr ? 'Kısa URL Düzenle' : 'Edit Short URL')
                : (tr ? 'Yeni Kısa URL' : 'New Short URL')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{tr ? 'İsim (Opsiyonel)' : 'Name (Optional)'}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={tr ? 'örn: VMware Workstation Pro Indir' : 'e.g. VMware Workstation Pro Download'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {tr
                  ? 'İsim girerseniz otomatik slug oluşturulur (örn: VMware-Workstation-Pro-Indir)'
                  : 'If provided, a slug will be auto-generated (e.g. VMware-Workstation-Pro-Download)'}
              </p>
            </div>

            <div>
              <Label>{tr ? 'Hedef URL' : 'Target URL'}</Label>
              <Input
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="https://example.com/very-long-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tr ? 'İptal' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formTarget.trim()}>
              {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr ? 'Kısa URL Sil' : 'Delete Short URL'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm">
                {tr ? 'Bu kısa URL\'yi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this short URL?'}
              </p>
            </div>
            {deleteTarget && (
              <div className="p-3 rounded-md bg-muted">
                <code className="text-sm font-mono">/git/{deleteTarget.slug || deleteTarget.id}</code>
                <span className="text-muted-foreground text-sm"> → {deleteTarget.target_url}</span>
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
