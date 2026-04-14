import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Globe, Plus, Trash2, Star, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/toast-notification';

export function SiteSettings() {
  const { id } = useParams();
  const { user, lang } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';
  const [site, setSite] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManagement = site?.is_management === 1;

  useEffect(() => {
    loadSite();
  }, [id]);

  const loadSite = async () => {
    setLoading(true);
    const res = await api.request<any>(`/sites/${id}`);
    setLoading(false);
    if (res.success) {
      setSite(res.data.site || res.data);
      setDomains(res.data.domains || []);
    }
  };

  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    try {
      await api.request(`/sites/${id}`, {
        method: 'PUT',
        body: {
          name: site.name,
          description: site.description,
          status: site.status,
          is_management: site.is_management === 1,
        },
      });
      toast(lang === 'tr' ? 'Site ayarları kaydedildi' : 'Site settings saved', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const addDomain = async () => {
    if (!newDomain) return;
    try {
      await api.request(`/sites/${id}/domains`, {
        method: 'POST',
        body: { domain: newDomain },
      });
      toast(lang === 'tr' ? 'Domain eklendi' : 'Domain added', 'success');
      setNewDomain('');
      loadSite();
    } catch {
      toast(lang === 'tr' ? 'Domain eklenemedi' : 'Failed to add domain', 'error');
    }
  };

  const removeDomain = async (domainId: number) => {
    try {
      await api.request(`/sites/${id}/domains/${domainId}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Domain silindi' : 'Domain removed', 'success');
      loadSite();
    } catch {
      toast(lang === 'tr' ? 'Domain silinemedi' : 'Failed to remove domain', 'error');
    }
  };

  const setPrimary = async (domainId: number) => {
    try {
      await api.request(`/sites/${id}/domains/${domainId}/primary`, { method: 'PUT' });
      toast(lang === 'tr' ? 'Ana domain ayarlandı' : 'Primary domain set', 'success');
      loadSite();
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
  };

  if (loading || !site) return <div className="p-4">{t('common.loading', lang)}</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">
        {lang === 'tr' ? 'Site Ayarları' : 'Site Settings'}: {site.name}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{lang === 'tr' ? 'Genel Bilgiler' : 'General Info'}</CardTitle>
          {isManagement && (
            <CardDescription className="flex items-center gap-1.5 text-amber-600">
              <Shield className="h-3.5 w-3.5" />
              {lang === 'tr'
                ? 'Bu yönetim sitesidir. Silinemez ve duraklatılamaz.'
                : 'This is the management site. It cannot be deleted or paused.'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{lang === 'tr' ? 'Site Adı' : 'Site Name'}</Label>
            <Input
              value={site.name || ''}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
            />
          </div>
          <div>
            <Label>{lang === 'tr' ? 'Açıklama' : 'Description'}</Label>
            <Input
              value={site.description || ''}
              onChange={(e) => setSite({ ...site, description: e.target.value })}
            />
          </div>
          {isSuperAdmin && (
          <div className="flex items-center justify-between pt-2">
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {lang === 'tr' ? 'Yönetim Sitesi' : 'Management Site'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Aktifleştirildiğinde bu site silinemez ve duraklatılamaz.'
                  : 'When enabled, this site cannot be deleted or paused.'}
              </p>
            </div>
            <Switch
              checked={site.is_management === 1}
              onCheckedChange={(checked) => setSite({ ...site, is_management: checked ? 1 : 0 })}
            />
          </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading', lang) : t('action.save', lang)}
          </Button>
        </CardContent>
      </Card>

      {/* Domain Management - super_admin only */}
      {isSuperAdmin && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {lang === 'tr' ? 'Domain Yönetimi' : 'Domain Management'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {domains.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{d.domain}</span>
                  {d.is_primary === 1 && (
                    <Badge variant="success">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {!d.is_primary && (
                    <Button size="sm" variant="ghost" onClick={() => setPrimary(d.id)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeDomain(d.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1"
            />
            <Button onClick={addDomain}>
              <Plus className="h-4 w-4 mr-1" />
              {t('action.create', lang)}
            </Button>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
