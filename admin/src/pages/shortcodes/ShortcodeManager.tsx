import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { t } from '@/lib/i18n';
import { useToast } from '@ui/toast-notification';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Switch } from '@ui/switch';
import { Badge } from '@ui/badge';
import { Code, Plus, Pencil, Trash2, Globe, Building2, Copy, Check } from 'lucide-react';

interface Shortcode {
  id: number;
  site_id: number | null;
  name: string;
  content: string;
  is_active: number;
  scope: 'global' | 'site';
  created_at: string;
  updated_at: string;
}

export function ShortcodeManager() {
  const { lang, user } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';

  const [shortcodes, setShortcodes] = useState<Shortcode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsGlobal, setFormIsGlobal] = useState(false);

  const fetchShortcodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.request<{ success: boolean; data: Shortcode[] }>('/shortcodes');
      if (res.success) {
        setShortcodes(res.data);
      }
    } catch (err) {
      toast(lang === 'tr' ? 'Shortcode\'lar yüklenemedi' : 'Failed to load shortcodes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShortcodes();
  }, [fetchShortcodes]);

  const resetForm = () => {
    setFormName('');
    setFormContent('');
    setFormIsGlobal(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (sc: Shortcode) => {
    setFormName(sc.name);
    setFormContent(sc.content);
    setFormIsGlobal(sc.scope === 'global');
    setEditingId(sc.id);
    setShowForm(true);
  };

  const handleCopyTag = (name: string) => {
    navigator.clipboard.writeText(`[${name}]`);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formContent.trim()) {
      toast(lang === 'tr' ? 'İsim ve içerik gerekli' : 'Name and content are required', 'error');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formName)) {
      toast(
        lang === 'tr'
          ? 'İsim sadece harf, rakam, alt çizgi ve tire içerebilir'
          : 'Name can only contain letters, numbers, underscore, and hyphen',
        'error'
      );
      return;
    }

    try {
      if (editingId) {
        const res = await api.request<{ success: boolean; error?: string }>(`/shortcodes/${editingId}`, {
          method: 'PUT',
          body: { name: formName, content: formContent },
        });
        if (res.success) {
          toast(lang === 'tr' ? 'Shortcode güncellendi' : 'Shortcode updated', 'success');
        } else {
          toast(res.error || 'Error', 'error');
          return;
        }
      } else {
        const res = await api.request<{ success: boolean; error?: string }>('/shortcodes', {
          method: 'POST',
          body: { name: formName, content: formContent, is_global: formIsGlobal },
        });
        if (res.success) {
          toast(lang === 'tr' ? 'Shortcode oluşturuldu' : 'Shortcode created', 'success');
        } else {
          toast(res.error || 'Error', 'error');
          return;
        }
      }
      resetForm();
      fetchShortcodes();
    } catch (err: any) {
      toast(err.message || 'Error', 'error');
    }
  };

  const handleToggleActive = async (sc: Shortcode) => {
    try {
      await api.request(`/shortcodes/${sc.id}`, {
        method: 'PUT',
        body: { is_active: !sc.is_active },
      });
      fetchShortcodes();
    } catch {
      toast(lang === 'tr' ? 'Güncelleme başarısız' : 'Update failed', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('common.confirm_delete', lang))) return;
    try {
      await api.request(`/shortcodes/${id}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Shortcode silindi' : 'Shortcode deleted', 'success');
      fetchShortcodes();
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {lang === 'tr' ? 'İçerik Enjektörü' : 'Content Injector'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'tr'
              ? 'Kısa kodlar tanımlayın ve içeriklerinizde [isim] şeklinde kullanın.'
              : 'Define shortcodes and use them as [name] in your content.'}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          {lang === 'tr' ? 'Yeni Shortcode' : 'New Shortcode'}
        </Button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Code className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">
              {lang === 'tr' ? 'Nasıl kullanılır?' : 'How to use?'}
            </p>
            <p>
              {lang === 'tr'
                ? 'Örnek: "benimmail" adında bir shortcode oluşturun, içeriğine "admin@mail.com" yazın. Yazılarınızda [benimmail] yazdığınızda otomatik olarak "admin@mail.com" ile değiştirilir. HTML içerik de desteklenir.'
                : 'Example: Create a shortcode named "myemail", set content to "admin@mail.com". When you write [myemail] in your posts, it will be automatically replaced with "admin@mail.com". HTML content is also supported.'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border rounded-lg p-6 bg-card animate-fade-in">
          <h2 className="text-lg font-semibold mb-4">
            {editingId
              ? (lang === 'tr' ? 'Shortcode Düzenle' : 'Edit Shortcode')
              : (lang === 'tr' ? 'Yeni Shortcode' : 'New Shortcode')
            }
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{lang === 'tr' ? 'İsim (Shortcode Adı)' : 'Name (Shortcode Tag)'}</Label>
                <div className="relative">
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder={lang === 'tr' ? 'ornek: benimmail' : 'e.g.: myemail'}
                    className="font-mono"
                  />
                  {formName && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                      [{formName}]
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lang === 'tr'
                    ? 'Sadece küçük harf, rakam, alt çizgi ve tire'
                    : 'Lowercase letters, numbers, underscore, and hyphen only'}
                </p>
              </div>

              {isSuperAdmin && !editingId && (
                <div className="space-y-2">
                  <Label>{lang === 'tr' ? 'Kapsam' : 'Scope'}</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={formIsGlobal}
                      onCheckedChange={setFormIsGlobal}
                    />
                    <span className="text-sm">
                      {formIsGlobal
                        ? (lang === 'tr' ? 'Global (Tüm Siteler)' : 'Global (All Sites)')
                        : (lang === 'tr' ? 'Sadece Bu Site' : 'This Site Only')
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{lang === 'tr' ? 'İçerik (HTML desteklenir)' : 'Content (HTML supported)'}</Label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={lang === 'tr'
                  ? 'Metin veya HTML içerik...\nÖrnek: <a href="mailto:admin@mail.com">admin@mail.com</a>'
                  : 'Text or HTML content...\nExample: <a href="mailto:admin@mail.com">admin@mail.com</a>'}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? t('action.save', lang) : t('action.create', lang)}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                {t('action.cancel', lang)}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Shortcodes List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading', lang)}</div>
      ) : shortcodes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <Code className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">
            {lang === 'tr' ? 'Henüz shortcode yok' : 'No shortcodes yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'tr' ? 'İlk shortcode\'unuzu oluşturmak için yukarıdaki butona tıklayın.' : 'Click the button above to create your first shortcode.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto"><table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium">
                  {lang === 'tr' ? 'Shortcode' : 'Shortcode'}
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden sm:table-cell">
                  {lang === 'tr' ? 'İçerik' : 'Content'}
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">
                  {lang === 'tr' ? 'Kapsam' : 'Scope'}
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium">
                  {lang === 'tr' ? 'Aktif' : 'Active'}
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium">
                  {lang === 'tr' ? 'İşlemler' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shortcodes.map((sc) => {
                const canEdit = sc.scope === 'site' || isSuperAdmin;
                return (
                  <tr key={sc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                          [{sc.name}]
                        </code>
                        <button
                          onClick={() => handleCopyTag(sc.name)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={lang === 'tr' ? 'Kopyala' : 'Copy'}
                        >
                          {copiedName === sc.name
                            ? <Check className="h-3.5 w-3.5 text-green-500" />
                            : <Copy className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-sm text-muted-foreground truncate max-w-[300px]" title={sc.content}>
                        {sc.content.length > 80 ? sc.content.substring(0, 80) + '...' : sc.content}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {sc.scope === 'global' ? (
                        <Badge variant="secondary" className="gap-1">
                          <Globe className="h-3 w-3" />
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          Site
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={!!sc.is_active}
                        onCheckedChange={() => handleToggleActive(sc)}
                        disabled={!canEdit}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(sc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(sc.id)}
                            className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {lang === 'tr' ? 'Salt okunur' : 'Read-only'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
