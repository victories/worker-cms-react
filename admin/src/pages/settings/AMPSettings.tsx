import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Zap, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast-notification';

const AMP_CSS_MAX_BYTES = 75000;

interface AmpSettings {
  amp_enabled: boolean;
  amp_url_format: string;
  amp_custom_domain: string;
  amp_post_types: string[];
  amp_analytics_id: string;
  amp_custom_css: string;
  amp_ad_slots: Record<string, string>;
}

interface AmpSettingsResponse {
  success: boolean;
  data: Record<string, string>;
}

const DEFAULT_SETTINGS: AmpSettings = {
  amp_enabled: false,
  amp_url_format: '/amp/slug',
  amp_custom_domain: '',
  amp_post_types: ['post', 'page'],
  amp_analytics_id: '',
  amp_custom_css: '',
  amp_ad_slots: {
    header_ad: '',
    content_ad: '',
    footer_ad: '',
  },
};

const URL_FORMATS = [
  {
    value: '/amp/slug',
    labelTr: '/amp/slug — Ön ek (Varsayılan)',
    labelEn: '/amp/slug — Prefix (Default)',
    descTr: 'AMP sayfaları /amp/ öneki ile sunulur',
    descEn: 'AMP pages served with /amp/ prefix',
    example: (domain: string) => `${domain}/amp/ornek-yazi`,
    isDefault: true,
  },
  {
    value: '/slug/amp',
    labelTr: '/slug/amp — Son ek',
    labelEn: '/slug/amp — Suffix',
    descTr: 'AMP sayfaları /amp son eki ile sunulur',
    descEn: 'AMP pages served with /amp suffix',
    example: (domain: string) => `${domain}/ornek-yazi/amp`,
    isDefault: false,
  },
  {
    value: '/slug?amp=1',
    labelTr: '/slug?amp=1 — Query parametresi',
    labelEn: '/slug?amp=1 — Query parameter',
    descTr: 'AMP sayfaları ?amp=1 parametresi ile sunulur',
    descEn: 'AMP pages served with ?amp=1 query parameter',
    example: (domain: string) => `${domain}/ornek-yazi?amp=1`,
    isDefault: false,
  },
];

const POST_TYPES = [
  { key: 'post', labelTr: 'Yazılar', labelEn: 'Posts' },
  { key: 'page', labelTr: 'Sayfalar', labelEn: 'Pages' },
];

const AD_SLOT_KEYS = [
  { key: 'header_ad', labelTr: 'Header Reklam', labelEn: 'Header Ad' },
  { key: 'content_ad', labelTr: 'İçerik Reklam', labelEn: 'Content Ad' },
  { key: 'footer_ad', labelTr: 'Footer Reklam', labelEn: 'Footer Ad' },
];

function parseSettings(data: Record<string, string>): AmpSettings {
  let postTypes: string[] = DEFAULT_SETTINGS.amp_post_types;
  try {
    if (data.amp_post_types) {
      postTypes = JSON.parse(data.amp_post_types);
    }
  } catch {
    // keep default
  }

  let adSlots: Record<string, string> = { ...DEFAULT_SETTINGS.amp_ad_slots };
  try {
    if (data.amp_ad_slots) {
      adSlots = JSON.parse(data.amp_ad_slots);
    }
  } catch {
    // keep default
  }

  return {
    amp_enabled: data.amp_enabled === 'true' || data.amp_enabled === '1',
    amp_url_format: data.amp_url_format || DEFAULT_SETTINGS.amp_url_format,
    amp_custom_domain: data.amp_custom_domain || '',
    amp_post_types: postTypes,
    amp_analytics_id: data.amp_analytics_id || '',
    amp_custom_css: data.amp_custom_css || '',
    amp_ad_slots: adSlots,
  };
}

function serializeSettings(settings: AmpSettings): Record<string, string> {
  return {
    amp_enabled: settings.amp_enabled ? 'true' : 'false',
    amp_url_format: settings.amp_url_format,
    amp_custom_domain: settings.amp_custom_domain,
    amp_post_types: JSON.stringify(settings.amp_post_types),
    amp_analytics_id: settings.amp_analytics_id,
    amp_custom_css: settings.amp_custom_css,
    amp_ad_slots: JSON.stringify(settings.amp_ad_slots),
  };
}

export function AMPSettings() {
  const { lang, user } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AmpSettings>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasWhiteLabel, setHasWhiteLabel] = useState(false);

  useEffect(() => {
    if (!activeSite) return;
    loadSettings();
    if (user?.role === 'super_admin') {
      setHasWhiteLabel(true);
    } else {
      api.request('/api/subscriptions/my').then((res: any) => {
        if (res?.success && res.data) {
          setHasWhiteLabel(res.data.white_label === 1);
        }
      }).catch(() => {});
    }
  }, [activeSite]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.request<AmpSettingsResponse>('/settings/amp');
      if (res.success && res.data) {
        setSettings(parseSettings(res.data));
      }
    } catch {
      setError(lang === 'tr' ? 'AMP ayarları yüklenemedi' : 'Failed to load AMP settings');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.request<{ success: boolean }>('/settings/amp', {
        method: 'PUT',
        body: serializeSettings(settings),
      });
      if (res.success) {
        toast(lang === 'tr' ? 'AMP ayarları kaydedildi' : 'AMP settings saved', 'success');
        setSuccess(lang === 'tr' ? 'AMP ayarları kaydedildi' : 'AMP settings saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        toast(lang === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings', 'error');
        setError(lang === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings');
      }
    } catch {
      toast(lang === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings', 'error');
      setError(lang === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings');
    }
    setSaving(false);
  };

  const togglePostType = (postType: string) => {
    setSettings((prev) => ({
      ...prev,
      amp_post_types: prev.amp_post_types.includes(postType)
        ? prev.amp_post_types.filter((pt) => pt !== postType)
        : [...prev.amp_post_types, postType],
    }));
  };

  const updateAdSlot = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      amp_ad_slots: {
        ...prev.amp_ad_slots,
        [key]: value,
      },
    }));
  };

  const cssCharCount = new TextEncoder().encode(settings.amp_custom_css).length;
  const cssOverLimit = cssCharCount > AMP_CSS_MAX_BYTES;

  if (loading) {
    return (
      <div className="p-4 text-muted-foreground">
        {t('common.loading', lang)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {t('nav.amp', lang)}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving || cssOverLimit}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...')
            : t('action.save', lang)}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Global AMP Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'Genel AMP Ayarı' : 'Global AMP Setting'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {lang === 'tr' ? 'AMP\'yi Etkinleştir' : 'Enable AMP'}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {lang === 'tr'
                  ? 'Tüm site için AMP sayfalarını etkinleştirir veya devre dışı bırakır'
                  : 'Enable or disable AMP pages for the entire site'}
              </p>
            </div>
            <Switch
              checked={settings.amp_enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, amp_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* AMP URL Format */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'AMP URL Formatı' : 'AMP URL Format'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {URL_FORMATS.map((fmt) => (
              <label
                key={fmt.value}
                className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors ${
                  settings.amp_url_format === fmt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:bg-muted/50'
                }`}
              >
                <input
                  type="radio"
                  name="amp_url_format"
                  value={fmt.value}
                  checked={settings.amp_url_format === fmt.value}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, amp_url_format: e.target.value }))
                  }
                  className="h-4 w-4 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium font-mono">
                    {fmt.value}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === 'tr' ? fmt.descTr : fmt.descEn}
                  </p>
                </div>
                {fmt.isDefault && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {lang === 'tr' ? 'Varsayılan' : 'Default'}
                  </Badge>
                )}
              </label>
            ))}
          </div>

          {/* Live Preview */}
          {(() => {
            const primaryDomain = activeSite?.domains?.find((d: any) => d.is_primary)?.domain;
            const baseDomain = settings.amp_custom_domain || primaryDomain || activeSite?.slug + '.example.com';
            const previewDomain = baseDomain.startsWith('http') ? baseDomain : `https://${baseDomain}`;
            const fmt = URL_FORMATS.find((f) => f.value === settings.amp_url_format) || URL_FORMATS[0];
            const previewUrl = fmt.example(previewDomain);
            return (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {lang === 'tr' ? 'Önizleme' : 'Preview'}
                </p>
                <p className="text-sm font-mono break-all text-primary">{previewUrl}</p>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Custom AMP Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'Özel AMP Domain' : 'Custom AMP Domain'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasWhiteLabel ? (
            <>
              <div>
                <Label htmlFor="amp_custom_domain">
                  {lang === 'tr' ? 'AMP Domain Adresi' : 'AMP Domain Address'}
                </Label>
                <Input
                  id="amp_custom_domain"
                  value={settings.amp_custom_domain}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, amp_custom_domain: e.target.value }))
                  }
                  placeholder={lang === 'tr' ? 'amp.siteniz.com (opsiyonel)' : 'amp.yoursite.com (optional)'}
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'AMP sayfalarını farklı bir domain üzerinden sunmak için bir domain girin. Boş bırakırsanız AMP sayfaları mevcut domain üzerinden URL formatına göre sunulur. Domain\'in Cloudflare DNS\'te yapılandırılmış olması gerekir.'
                  : 'Enter a domain to serve AMP pages from a separate domain. If left empty, AMP pages are served from the current domain using the URL format above. The domain must be configured in Cloudflare DNS.'}
              </p>
              {settings.amp_custom_domain && (
                <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {lang === 'tr' ? 'AMP URL Önizleme' : 'AMP URL Preview'}
                  </p>
                  <p className="text-sm font-mono break-all text-primary">
                    https://{settings.amp_custom_domain}/{lang === 'tr' ? 'ornek-yazi' : 'example-post'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === 'tr'
                      ? 'Custom domain kullanıldığında URL formatı her zaman /slug şeklindedir'
                      : 'When using custom domain, URL format is always /slug'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                {lang === 'tr'
                  ? 'Özel AMP domain kullanmak için paketinizi White Label destekleyen bir pakete yükseltmeniz gerekmektedir.'
                  : 'To use a custom AMP domain, please upgrade to a plan that supports White Label.'}
              </p>
              <a href="/admin/upgrade" className="text-sm font-medium text-amber-900 underline mt-1 inline-block">
                {lang === 'tr' ? 'Paketinizi yükseltin →' : 'Upgrade your plan →'}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'Yazı Türleri' : 'Post Types'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'tr'
              ? 'AMP versiyonu oluşturulacak yazı türlerini seçin'
              : 'Select which post types should have AMP versions'}
          </p>
          <div className="space-y-3">
            {POST_TYPES.map((pt) => (
              <label key={pt.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.amp_post_types.includes(pt.key)}
                  onChange={() => togglePostType(pt.key)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  {lang === 'tr' ? pt.labelTr : pt.labelEn}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AMP Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'AMP Analitik' : 'AMP Analytics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="amp_analytics_id">
              {lang === 'tr' ? 'Google Analytics Takip ID' : 'Google Analytics Tracking ID'}
            </Label>
            <Input
              id="amp_analytics_id"
              value={settings.amp_analytics_id}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, amp_analytics_id: e.target.value }))
              }
              placeholder="G-XXXXXXXXXX"
            />
            <p className="text-xs text-muted-foreground">
              {lang === 'tr'
                ? 'AMP sayfalarında Google Analytics takibi için ölçüm kimliğinizi girin. Boş bırakırsanız analitik devre dışı kalır.'
                : 'Enter your measurement ID for Google Analytics tracking on AMP pages. Leave empty to disable analytics.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom AMP CSS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'Özel AMP CSS' : 'Custom AMP CSS'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="amp_custom_css">
              {lang === 'tr' ? 'CSS Kodu' : 'CSS Code'}
            </Label>
            <Textarea
              id="amp_custom_css"
              value={settings.amp_custom_css}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, amp_custom_css: e.target.value }))
              }
              placeholder={lang === 'tr'
                ? '/* AMP sayfalarına özel CSS yazın */'
                : '/* Write custom CSS for AMP pages */'}
              className="font-mono text-sm min-h-[200px]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'AMP, satır içi CSS ile maksimum 75KB sınırına sahiptir'
                  : 'AMP has a maximum inline CSS limit of 75KB'}
              </p>
              <span
                className={`text-xs font-mono ${
                  cssOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'
                }`}
              >
                {cssCharCount.toLocaleString()} / {AMP_CSS_MAX_BYTES.toLocaleString()}{' '}
                {lang === 'tr' ? 'bayt' : 'bytes'}
              </span>
            </div>
            {cssOverLimit && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {lang === 'tr'
                  ? 'CSS boyutu 75KB sınırını aşıyor. Lütfen CSS\'i kısaltın.'
                  : 'CSS size exceeds the 75KB limit. Please reduce the CSS.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AMP Ad Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {lang === 'tr' ? 'AMP Reklam Alanları' : 'AMP Ad Slots'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'tr'
              ? 'AMP sayfalarında görünecek reklam birimlerinin kodlarını girin'
              : 'Enter the ad unit codes for ad placements on AMP pages'}
          </p>
          <div className="space-y-4">
            {AD_SLOT_KEYS.map((slot) => (
              <div key={slot.key} className="space-y-2">
                <Label htmlFor={`ad_slot_${slot.key}`}>
                  {lang === 'tr' ? slot.labelTr : slot.labelEn}
                </Label>
                <Input
                  id={`ad_slot_${slot.key}`}
                  value={settings.amp_ad_slots[slot.key] || ''}
                  onChange={(e) => updateAdSlot(slot.key, e.target.value)}
                  placeholder={`ca-pub-XXXXXXXXXXXXXXXX/${slot.key}`}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {lang === 'tr'
                ? 'Reklam birim kodlarını veya AMP uyumlu reklam etiketlerini girin. Boş bırakılan alanlar görüntülenmez.'
                : 'Enter ad unit codes or AMP-compatible ad tags. Empty slots will not be displayed.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || cssOverLimit}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...')
            : t('action.save', lang)}
        </Button>
      </div>
    </div>
  );
}
