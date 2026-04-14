import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/toast-notification';

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  permissions: string;
  user_id: number;
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ApiKeyCreateResponse {
  success: boolean;
  data: ApiKey & { key: string };
}

interface ApiKeyListResponse {
  success: boolean;
  data: ApiKey[];
}

const PERMISSIONS = ['read', 'write', 'delete'] as const;

const permissionBadgeVariant = (perm: string) => {
  switch (perm) {
    case 'delete': return 'destructive' as const;
    case 'write': return 'default' as const;
    case 'read': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

function maskKey(prefix: string): string {
  if (!prefix) return '****-****-****-****';
  return `${prefix}-****-****`;
}

export function ApiKeys() {
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { toast } = useToast();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>(['read']);
  const [createExpiry, setCreateExpiry] = useState('');
  const [creating, setCreating] = useState(false);

  // Reveal dialog (shown after creation)
  const [showRevealDialog, setShowRevealDialog] = useState(false);
  const [revealedKey, setRevealedKey] = useState('');
  const [revealedName, setRevealedName] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!activeSite) return;
    loadKeys();
  }, [activeSite]);

  const loadKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.request<ApiKeyListResponse>('/api-keys');
      if (res.success) {
        setKeys(res.data || []);
      } else {
        setError(lang === 'tr' ? 'API anahtarları yüklenemedi' : 'Failed to load API keys');
      }
    } catch {
      setError(lang === 'tr' ? 'API anahtarları yüklenemedi' : 'Failed to load API keys');
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setCreateName('');
    setCreatePermissions(['read']);
    setCreateExpiry('');
    setCreating(false);
    setShowCreateDialog(true);
  };

  const togglePermission = (perm: string) => {
    setCreatePermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    if (createPermissions.length === 0) return;

    setCreating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: createName.trim(),
        permissions: createPermissions.join(','),
      };
      if (createExpiry) {
        body.expires_at = createExpiry;
      }

      const res = await api.request<ApiKeyCreateResponse>('/api-keys', {
        method: 'POST',
        body,
      });

      if (res.success && res.data) {
        toast(lang === 'tr' ? 'API anahtarı oluşturuldu' : 'API key created', 'success');
        setShowCreateDialog(false);
        setRevealedKey(res.data.key);
        setRevealedName(res.data.name);
        setKeyVisible(false);
        setCopied(false);
        setShowRevealDialog(true);
        loadKeys();
      } else {
        toast(lang === 'tr' ? 'Anahtar oluşturulamadı' : 'Failed to create key', 'error');
        setError(lang === 'tr' ? 'Anahtar olusturulamadi' : 'Failed to create key');
      }
    } catch {
      toast(lang === 'tr' ? 'Anahtar oluşturulamadı' : 'Failed to create key', 'error');
      setError(lang === 'tr' ? 'Anahtar olusturulamadi' : 'Failed to create key');
    }
    setCreating(false);
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = revealedKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openDeleteDialog = (key: ApiKey) => {
    setDeleteTarget(key);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.request<{ success: boolean }>(`/api-keys/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        toast(lang === 'tr' ? 'API anahtarı silindi' : 'API key deleted', 'success');
        setShowDeleteDialog(false);
        setDeleteTarget(null);
        loadKeys();
      } else {
        toast(lang === 'tr' ? 'Anahtar silinemedi' : 'Failed to delete key', 'error');
        setError(lang === 'tr' ? 'Anahtar silinemedi' : 'Failed to delete key');
      }
    } catch {
      toast(lang === 'tr' ? 'Anahtar silinemedi' : 'Failed to delete key', 'error');
      setError(lang === 'tr' ? 'Anahtar silinemedi' : 'Failed to delete key');
    }
    setDeleting(false);
  };

  const parsePermissions = (perms: string): string[] => {
    if (!perms) return [];
    return perms.split(',').map((p) => p.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="p-4 text-muted-foreground">
        {lang === 'tr' ? 'Yukleniyor...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {lang === 'tr' ? 'API Anahtarlari' : 'API Keys'}
          </h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {lang === 'tr' ? 'Yeni Anahtar Olustur' : 'Create New Key'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Key List */}
      {keys.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {lang === 'tr' ? 'Henuz API anahtari yok' : 'No API keys yet'}
              </p>
              <p className="text-sm mt-1">
                {lang === 'tr'
                  ? 'Programatik erisim icin bir API anahtari olusturun'
                  : 'Create an API key for programmatic access'}
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {lang === 'tr' ? 'Ilk Anahtari Olustur' : 'Create First Key'}
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
                  <th className="text-left p-3 font-medium">
                    {lang === 'tr' ? 'Ad' : 'Name'}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {lang === 'tr' ? 'Anahtar' : 'Key'}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {lang === 'tr' ? 'Yetkiler' : 'Permissions'}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {lang === 'tr' ? 'Son Kullanim' : 'Last Used'}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {lang === 'tr' ? 'Bitis Tarihi' : 'Expires'}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {lang === 'tr' ? 'Olusturulma' : 'Created'}
                  </th>
                  <th className="text-right p-3 font-medium">
                    {lang === 'tr' ? 'Islemler' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((apiKey) => (
                  <tr key={apiKey.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{apiKey.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {maskKey(apiKey.key_prefix)}
                      </code>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {parsePermissions(apiKey.permissions).map((perm) => (
                          <Badge key={perm} variant={permissionBadgeVariant(perm)} className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {apiKey.last_used
                        ? formatDateTime(apiKey.last_used, lang)
                        : (lang === 'tr' ? 'Hic' : 'Never')}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {apiKey.expires_at
                        ? formatDateTime(apiKey.expires_at, lang)
                        : (lang === 'tr' ? 'Suresi yok' : 'No expiry')}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDateTime(apiKey.created_at, lang)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => openDeleteDialog(apiKey)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === 'tr' ? 'Yeni API Anahtari' : 'New API Key'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{lang === 'tr' ? 'Anahtar Adi' : 'Key Name'}</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={lang === 'tr' ? 'orn. Mobil Uygulama' : 'e.g. Mobile App'}
              />
            </div>
            <div>
              <Label>{lang === 'tr' ? 'Yetkiler' : 'Permissions'}</Label>
              <div className="flex gap-3 mt-2">
                {PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createPermissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="rounded border-gray-300"
                    />
                    <Badge variant={permissionBadgeVariant(perm)} className="text-xs">
                      {perm}
                    </Badge>
                  </label>
                ))}
              </div>
              {createPermissions.length === 0 && (
                <p className="text-xs text-destructive mt-1">
                  {lang === 'tr' ? 'En az bir yetki secin' : 'Select at least one permission'}
                </p>
              )}
            </div>
            <div>
              <Label>
                {lang === 'tr' ? 'Bitis Tarihi (Opsiyonel)' : 'Expiry Date (Optional)'}
              </Label>
              <Input
                type="date"
                value={createExpiry}
                onChange={(e) => setCreateExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr'
                  ? 'Bos birakirsaniz anahtarin suresi dolmaz'
                  : 'Leave empty for a key that never expires'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {lang === 'tr' ? 'Iptal' : 'Cancel'}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createName.trim() || createPermissions.length === 0}
            >
              {creating
                ? (lang === 'tr' ? 'Olusturuluyor...' : 'Creating...')
                : (lang === 'tr' ? 'Olustur' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Reveal Dialog */}
      <Dialog open={showRevealDialog} onOpenChange={setShowRevealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === 'tr' ? 'API Anahtari Olusturuldu' : 'API Key Created'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-700">
                  {lang === 'tr'
                    ? 'Bu anahtari simdi kopyalayin!'
                    : 'Copy this key now!'}
                </p>
                <p className="text-yellow-600 mt-1">
                  {lang === 'tr'
                    ? 'Bu anahtar bir daha gosterilemez. Guvenli bir yerde saklayin.'
                    : 'This key will not be shown again. Store it in a safe place.'}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                {revealedName}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 relative">
                  <Input
                    readOnly
                    value={keyVisible ? revealedKey : revealedKey.replace(/./g, '*')}
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setKeyVisible(!keyVisible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {keyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyKey}>
                  <Copy className="h-4 w-4 mr-1" />
                  {copied
                    ? (lang === 'tr' ? 'Kopyalandi!' : 'Copied!')
                    : (lang === 'tr' ? 'Kopyala' : 'Copy')}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowRevealDialog(false)}>
              {lang === 'tr' ? 'Tamam' : 'Done'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lang === 'tr' ? 'API Anahtarini Sil' : 'Delete API Key'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p>
                  {lang === 'tr'
                    ? 'Bu API anahtarini silmek istediginize emin misiniz?'
                    : 'Are you sure you want to delete this API key?'}
                </p>
                <p className="text-muted-foreground mt-1">
                  {lang === 'tr'
                    ? 'Bu anahtari kullanan tum uygulamalar erisimini kaybedecek. Bu islem geri alinamaz.'
                    : 'All applications using this key will lose access. This action cannot be undone.'}
                </p>
              </div>
            </div>
            {deleteTarget && (
              <div className="p-3 rounded-md bg-muted">
                <p className="font-medium text-sm">{deleteTarget.name}</p>
                <code className="text-xs text-muted-foreground font-mono">
                  {maskKey(deleteTarget.key_prefix)}
                </code>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {lang === 'tr' ? 'Iptal' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting
                ? (lang === 'tr' ? 'Siliniyor...' : 'Deleting...')
                : (lang === 'tr' ? 'Sil' : 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
