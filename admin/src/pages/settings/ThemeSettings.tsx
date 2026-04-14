import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Paintbrush, Type, Palette, Navigation, Sparkles, RotateCcw, Layout, Monitor, Sun, Moon, Code2, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast-notification';

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
  'Raleway', 'Source Sans Pro', 'PT Sans', 'Fira Sans', 'IBM Plex Sans', 'DM Sans',
  'Outfit', 'Plus Jakarta Sans',
  'Merriweather', 'Playfair Display', 'Lora', 'Crimson Text', 'Source Serif Pro',
  'Libre Baskerville', 'Cormorant Garamond',
];

// Theme presets — must match STARTER_DEFAULTS and MODERN_DEFAULTS in public-db.ts
const STARTER_PRESET = {
  theme_primary_color: '#2563eb',
  theme_secondary_color: '#10b981',
  theme_bg_color: '#f8fafc',
  theme_surface_color: '#ffffff',
  theme_text_color: '#1e293b',
  theme_text_secondary_color: '#64748b',
  theme_border_color: '#e2e8f0',
  theme_header_bg_color: '#ffffff',
  theme_header_text_color: '#0f172a',
  theme_footer_bg_color: '#0f172a',
  theme_footer_text_color: '#94a3b8',
  theme_link_color: '#2563eb',
  theme_link_hover_color: '#1d4ed8',
  theme_font_family: 'Inter',
  theme_heading_font_family: 'Inter',
};

const MODERN_PRESET = {
  theme_primary_color: '#0d9488',
  theme_secondary_color: '#f59e0b',
  theme_bg_color: '#fafaf9',
  theme_surface_color: '#ffffff',
  theme_text_color: '#292524',
  theme_text_secondary_color: '#78716c',
  theme_border_color: '#e7e5e4',
  theme_header_bg_color: '#1c1917',
  theme_header_text_color: '#fafaf9',
  theme_footer_bg_color: '#1c1917',
  theme_footer_text_color: '#a8a29e',
  theme_link_color: '#0d9488',
  theme_link_hover_color: '#0f766e',
  theme_font_family: 'DM Sans',
  theme_heading_font_family: 'Playfair Display',
};

const VELVET_PRESET = {
  theme_primary_color: '#b9a9f5',
  theme_secondary_color: '#f5a9c7',
  theme_bg_color: '#13111a',
  theme_surface_color: '#1d1b26',
  theme_text_color: '#e8e4f0',
  theme_text_secondary_color: '#9892b3',
  theme_border_color: '#2e2b40',
  theme_header_bg_color: '#0e0c17',
  theme_header_text_color: '#e8e4f0',
  theme_footer_bg_color: '#0e0c17',
  theme_footer_text_color: '#9892b3',
  theme_link_color: '#b9a9f5',
  theme_link_hover_color: '#d4c8fa',
  theme_font_family: 'Plus Jakarta Sans',
  theme_heading_font_family: 'Outfit',
};

interface ColorFieldProps {
  label: string;
  settingKey: string;
  defaultValue: string;
  settings: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function ColorField({ label, settingKey, defaultValue, settings, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={settings[settingKey] || defaultValue}
          onChange={(e) => onChange(settingKey, e.target.value)}
          className="w-9 h-9 rounded border cursor-pointer flex-shrink-0"
        />
        <Input
          value={settings[settingKey] || defaultValue}
          onChange={(e) => onChange(settingKey, e.target.value)}
          placeholder={defaultValue}
          className="flex-1 h-9 text-xs font-mono"
        />
      </div>
    </div>
  );
}

export function ThemeSettings() {
  const { lang, user } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasWhiteLabel, setHasWhiteLabel] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (!activeSite) return;
    loadSettings();
    // Check white_label from subscription (super_admin always has it)
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
    const res = await api.getSettings();
    setLoading(false);
    if (res.success) {
      const data = res.data as any;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setSettings(data);
      } else if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      }
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateSettings(settings) as any;
      setSaving(false);
      if (res?.success) {
        toast(lang === 'tr' ? 'Tema ayarları kaydedildi' : 'Theme settings saved', 'success');
      }
    } catch {
      setSaving(false);
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
  };

  const currentTemplate = settings.theme_template || 'starter';
  const currentPreset = currentTemplate === 'velvet' ? VELVET_PRESET : currentTemplate === 'modern' ? MODERN_PRESET : STARTER_PRESET;
  const navStyle = settings.theme_nav_style || 'default';

  const applyPresetColors = (preset: Record<string, string>) => {
    setSettings(prev => ({ ...prev, ...preset }));
  };

  const resetToDefaults = () => {
    applyPresetColors(currentPreset);
    toast(lang === 'tr' ? 'Varsayılan renkler yüklendi' : 'Default colors applied', 'success');
  };

  const handleTemplateChange = (newTemplate: string) => {
    const newPreset = newTemplate === 'velvet' ? VELVET_PRESET : newTemplate === 'modern' ? MODERN_PRESET : STARTER_PRESET;
    const displayName = newTemplate === 'velvet' ? 'Velvet' : newTemplate === 'modern' ? 'Modern' : 'Starter';
    // Change template and apply preset colors
    setSettings(prev => ({
      ...prev,
      theme_template: newTemplate,
      ...newPreset,
    }));
    toast(
      lang === 'tr'
        ? `"${displayName}" tema varsayılanları uygulandı`
        : `"${displayName}" theme defaults applied`,
      'success'
    );
  };

  if (loading) return <div className="p-4">{t('common.loading', lang)}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Banner: New Theme System */}
      {showBanner && (
        <div className="relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {lang === 'tr' ? 'Yeni tema sistemi kullanılabilir!' : 'New theme system available!'}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              {lang === 'tr'
                ? '8 hazır tema, gelişmiş özelleştirme ve daha fazlası için Tema Mağazasını deneyin.'
                : 'Try the Theme Store for 8 ready-made themes, advanced customization and more.'}
            </p>
          </div>
          <Link to="/themes" className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0">
            {lang === 'tr' ? 'Tema Mağazası' : 'Theme Store'}
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button onClick={() => setShowBanner(false)} className="absolute top-1.5 right-1.5 text-blue-400 hover:text-blue-600 text-xs p-1">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {lang === 'tr' ? 'Tema Ayarları' : 'Theme Settings'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t('common.loading', lang) : t('action.save', lang)}
        </Button>
      </div>

      {/* ===== Section 1: Template Selector ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layout className="h-5 w-5" />
            {lang === 'tr' ? 'Tema Şablonu' : 'Theme Template'}
          </CardTitle>
          <CardDescription>
            {lang === 'tr'
              ? 'Sitenizin genel düzenini ve görünümünü belirleyin'
              : 'Choose the overall layout and look for your site'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Starter Card */}
            <button
              type="button"
              onClick={() => handleTemplateChange('starter')}
              className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                currentTemplate === 'starter'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {currentTemplate === 'starter' && (
                <Badge className="absolute top-2 right-2 text-[10px]" variant="default">
                  {lang === 'tr' ? 'Aktif' : 'Active'}
                </Badge>
              )}
              {/* Wireframe Preview */}
              <div className="mb-3 rounded-lg border bg-white dark:bg-gray-900 p-2 h-28 flex flex-col">
                <div className="h-3 bg-white border-b flex items-center px-1 gap-0.5 flex-shrink-0">
                  <div className="w-6 h-1.5 bg-gray-300 rounded-sm"></div>
                  <div className="flex-1"></div>
                  <div className="w-3 h-1.5 bg-gray-200 rounded-sm"></div>
                  <div className="w-3 h-1.5 bg-gray-200 rounded-sm"></div>
                </div>
                <div className="flex-1 flex gap-1 mt-1">
                  <div className="flex-1 space-y-1">
                    <div className="h-8 bg-gray-100 rounded-sm"></div>
                    <div className="h-8 bg-gray-100 rounded-sm"></div>
                  </div>
                  <div className="w-1/4 bg-gray-50 rounded-sm border"></div>
                </div>
                <div className="h-3 bg-gray-800 mt-1 rounded-sm flex-shrink-0"></div>
              </div>
              <h3 className="font-semibold text-sm">Starter</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Klasik 2 sütun, sabit header, dikey kartlar'
                  : 'Classic 2-column, fixed header, vertical cards'}
              </p>
            </button>

            {/* Modern Card */}
            <button
              type="button"
              onClick={() => handleTemplateChange('modern')}
              className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                currentTemplate === 'modern'
                  ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {currentTemplate === 'modern' && (
                <Badge className="absolute top-2 right-2 text-[10px] bg-teal-600">
                  {lang === 'tr' ? 'Aktif' : 'Active'}
                </Badge>
              )}
              {/* Wireframe Preview */}
              <div className="mb-3 rounded-lg border bg-white dark:bg-gray-900 p-2 h-28 flex flex-col">
                <div className="h-3 bg-gray-800 flex items-center px-1 gap-0.5 rounded-t-sm flex-shrink-0">
                  <div className="w-6 h-1.5 bg-gray-400 rounded-sm"></div>
                  <div className="flex-1"></div>
                  <div className="w-3 h-1.5 bg-gray-500 rounded-sm"></div>
                  <div className="w-3 h-1.5 bg-gray-500 rounded-sm"></div>
                </div>
                <div className="flex-1 mx-auto w-3/4 space-y-1 mt-1">
                  <div className="h-5 bg-gray-100 rounded-sm flex">
                    <div className="w-1/3 bg-gray-200 rounded-l-sm border-l-2 border-teal-400"></div>
                    <div className="flex-1"></div>
                  </div>
                  <div className="h-5 bg-gray-100 rounded-sm flex">
                    <div className="w-1/3 bg-gray-200 rounded-l-sm border-l-2 border-teal-400"></div>
                    <div className="flex-1"></div>
                  </div>
                </div>
                <div className="flex gap-1 mx-auto w-3/4 mt-1">
                  <div className="flex-1 h-3 bg-gray-100 rounded-sm border"></div>
                  <div className="flex-1 h-3 bg-gray-100 rounded-sm border"></div>
                  <div className="flex-1 h-3 bg-gray-100 rounded-sm border"></div>
                </div>
                <div className="h-3 bg-gray-800 mt-1 rounded-sm flex-shrink-0"></div>
              </div>
              <h3 className="font-semibold text-sm">Modern</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Tek sütun, koyu header, yatay kartlar, serif başlık'
                  : 'Single column, dark header, horizontal cards, serif headings'}
              </p>
            </button>

            {/* Velvet Card */}
            <button
              type="button"
              onClick={() => handleTemplateChange('velvet')}
              className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                currentTemplate === 'velvet'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              {currentTemplate === 'velvet' && (
                <Badge className="absolute top-2 right-2 text-[10px] bg-purple-600">
                  {lang === 'tr' ? 'Aktif' : 'Active'}
                </Badge>
              )}
              {/* Wireframe Preview — dark charcoal bg */}
              <div className="mb-3 rounded-lg border bg-[#13111a] p-2 h-28 flex flex-col overflow-hidden">
                {/* Ad bar */}
                <div className="h-1.5 bg-[#2e2b40] rounded-sm flex-shrink-0 mb-0.5"></div>
                {/* Glass header: logo | nav | toggle + search */}
                <div className="h-3 bg-[#1d1b26]/80 backdrop-blur flex items-center px-1 gap-0.5 flex-shrink-0 border-b border-[#2e2b40]">
                  <div className="w-5 h-1.5 bg-[#b9a9f5] rounded-sm"></div>
                  <div className="flex-1 flex justify-center gap-0.5">
                    <div className="w-3 h-1 bg-[#9892b3] rounded-sm"></div>
                    <div className="w-3 h-1 bg-[#9892b3] rounded-sm"></div>
                    <div className="w-3 h-1 bg-[#9892b3] rounded-sm"></div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f5a9c7]"></div>
                  <div className="w-3 h-1 bg-[#2e2b40] rounded-sm"></div>
                </div>
                {/* Slider band */}
                <div className="h-4 bg-gradient-to-r from-[#b9a9f5]/20 to-[#f5a9c7]/20 rounded-sm mt-0.5 flex-shrink-0"></div>
                {/* 2-col layout */}
                <div className="flex-1 flex gap-1 mt-0.5">
                  <div className="flex-1 space-y-0.5">
                    <div className="h-3 bg-[#1d1b26] rounded-sm border border-[#2e2b40]"></div>
                    <div className="h-3 bg-[#1d1b26] rounded-sm border border-[#2e2b40]"></div>
                  </div>
                  <div className="w-1/4 bg-[#1d1b26] rounded-sm border border-[#2e2b40]"></div>
                </div>
                {/* 4-col footer */}
                <div className="flex gap-0.5 mt-0.5 flex-shrink-0">
                  <div className="flex-1 h-2 bg-[#0e0c17] rounded-sm"></div>
                  <div className="flex-1 h-2 bg-[#0e0c17] rounded-sm"></div>
                  <div className="flex-1 h-2 bg-[#0e0c17] rounded-sm"></div>
                  <div className="flex-1 h-2 bg-[#0e0c17] rounded-sm"></div>
                </div>
              </div>
              <h3 className="font-semibold text-sm">Velvet</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Koyu/Açık mod, pastel renkler, magazin düzeni, 4 sütun footer'
                  : 'Dark/Light mode, soft pastels, magazine layout, 4-column footer'}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 2: Color Customization ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" />
                {lang === 'tr' ? 'Renkler' : 'Colors'}
              </CardTitle>
              <CardDescription>
                {lang === 'tr'
                  ? 'Temanızdaki tüm renkleri özelleştirin'
                  : 'Customize all colors in your theme'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {lang === 'tr' ? 'Varsayılanlara Sıfırla' : 'Reset Defaults'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* General Colors */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              {lang === 'tr' ? 'Genel Renkler' : 'General Colors'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ColorField label={lang === 'tr' ? 'Ana Renk' : 'Primary Color'} settingKey="theme_primary_color" defaultValue={currentPreset.theme_primary_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'İkincil Renk' : 'Secondary Color'} settingKey="theme_secondary_color" defaultValue={currentPreset.theme_secondary_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Arka Plan' : 'Background'} settingKey="theme_bg_color" defaultValue={currentPreset.theme_bg_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Kart Arka Planı' : 'Surface / Card'} settingKey="theme_surface_color" defaultValue={currentPreset.theme_surface_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Metin Rengi' : 'Text Color'} settingKey="theme_text_color" defaultValue={currentPreset.theme_text_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'İkincil Metin' : 'Secondary Text'} settingKey="theme_text_secondary_color" defaultValue={currentPreset.theme_text_secondary_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Kenarlık' : 'Border'} settingKey="theme_border_color" defaultValue={currentPreset.theme_border_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Bağlantı Rengi' : 'Link Color'} settingKey="theme_link_color" defaultValue={currentPreset.theme_link_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Bağlantı Hover' : 'Link Hover'} settingKey="theme_link_hover_color" defaultValue={currentPreset.theme_link_hover_color} settings={settings} onChange={updateSetting} />
            </div>
          </div>

          {/* Header & Footer Colors */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              {lang === 'tr' ? 'Üstbilgi & Altbilgi' : 'Header & Footer'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ColorField label={lang === 'tr' ? 'Header Arka Plan' : 'Header BG'} settingKey="theme_header_bg_color" defaultValue={currentPreset.theme_header_bg_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Header Metin' : 'Header Text'} settingKey="theme_header_text_color" defaultValue={currentPreset.theme_header_text_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Footer Arka Plan' : 'Footer BG'} settingKey="theme_footer_bg_color" defaultValue={currentPreset.theme_footer_bg_color} settings={settings} onChange={updateSetting} />
              <ColorField label={lang === 'tr' ? 'Footer Metin' : 'Footer Text'} settingKey="theme_footer_text_color" defaultValue={currentPreset.theme_footer_text_color} settings={settings} onChange={updateSetting} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 3: Typography ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5" />
            {lang === 'tr' ? 'Yazı Tipleri' : 'Typography'}
          </CardTitle>
          <CardDescription>
            {lang === 'tr'
              ? 'Başlık ve gövde yazı tiplerini ayrı ayrı belirleyin'
              : 'Set heading and body fonts independently'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{lang === 'tr' ? 'Başlık Yazı Tipi' : 'Heading Font'}</Label>
              <Select
                value={settings.theme_heading_font_family || currentPreset.theme_heading_font_family}
                onValueChange={(v) => updateSetting('theme_heading_font_family', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'H1-H6 başlıklarda kullanılır' : 'Used for H1-H6 headings'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{lang === 'tr' ? 'Gövde Yazı Tipi' : 'Body Font'}</Label>
              <Select
                value={settings.theme_font_family || currentPreset.theme_font_family}
                onValueChange={(v) => updateSetting('theme_font_family', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'Paragraflar ve genel metin' : 'Paragraphs and general text'}
              </p>
            </div>
          </div>
          {/* Live preview */}
          <div className="rounded-lg border p-4 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr' ? 'Önizleme' : 'Preview'}
            </p>
            <h3 style={{ fontFamily: `'${settings.theme_heading_font_family || currentPreset.theme_heading_font_family}', serif`, fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              {lang === 'tr' ? 'Merhaba Dünya' : 'Hello World'}
            </h3>
            <p style={{ fontFamily: `'${settings.theme_font_family || currentPreset.theme_font_family}', sans-serif`, fontSize: '0.95rem', color: '#64748b' }}>
              {lang === 'tr'
                ? 'Bu bir gövde metin önizlemesidir. Seçtiğiniz yazı tipleri burada görünür.'
                : 'This is a body text preview. Your selected fonts are displayed here.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 4: Branding ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5" />
            {lang === 'tr' ? 'Marka' : 'Branding'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{lang === 'tr' ? 'Logo URL' : 'Logo URL'}</Label>
            <Input
              value={settings.theme_logo_url || ''}
              onChange={(e) => updateSetting('theme_logo_url', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            {settings.theme_logo_url && (
              <div className="mt-2 p-3 rounded-lg bg-muted flex items-center justify-center">
                <img
                  src={settings.theme_logo_url}
                  alt="Logo preview"
                  className="max-h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>{lang === 'tr' ? 'Site Sloganı' : 'Site Tagline'}</Label>
            <Input
              value={settings.site_tagline || ''}
              onChange={(e) => updateSetting('site_tagline', e.target.value)}
              placeholder={lang === 'tr' ? 'Sitenizin kısa açıklaması' : 'Your site\'s short description'}
            />
          </div>
          <div className="space-y-2">
            <Label>{lang === 'tr' ? 'Footer Metni' : 'Footer Text'}</Label>
            {hasWhiteLabel ? (
              <Input
                value={settings.theme_footer_text || ''}
                onChange={(e) => updateSetting('theme_footer_text', e.target.value)}
                placeholder="Powered by WorkerCms"
              />
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  {lang === 'tr'
                    ? 'Footer metnini özelleştirmek için paketinizi White Label destekleyen bir pakete yükseltmeniz gerekmektedir.'
                    : 'To customize the footer text, please upgrade to a plan that supports White Label.'}
                </p>
                <a href="/admin/upgrade" className="text-sm font-medium text-amber-900 underline mt-1 inline-block">
                  {lang === 'tr' ? 'Paketinizi yükseltin →' : 'Upgrade your plan →'}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 5: Navigation Style ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Navigation className="h-5 w-5" />
            {lang === 'tr' ? 'Navigasyon Stili' : 'Navigation Style'}
          </CardTitle>
          <CardDescription>
            {lang === 'tr'
              ? 'Sitenizin menü görünümünü seçin'
              : 'Choose how your site\'s navigation menu looks'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{lang === 'tr' ? 'Menü Stili' : 'Menu Style'}</Label>
            <Select
              value={navStyle}
              onValueChange={(v) => updateSetting('theme_nav_style', v)}
            >
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {lang === 'tr' ? 'Varsayılan (Klasik)' : 'Default (Classic)'}
                </SelectItem>
                <SelectItem value="underline">
                  {lang === 'tr' ? 'Alt Çizgi' : 'Underline'}
                </SelectItem>
                <SelectItem value="gooey">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    GooeyNav
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {lang === 'tr' ? 'Animasyonlu' : 'Animated'}
                    </Badge>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {navStyle === 'gooey'
                ? (lang === 'tr'
                    ? 'GooeyNav: Koyu arka plan üzerinde parçacık animasyonlu modern menü'
                    : 'GooeyNav: Modern menu with particle animation on a dark header')
                : navStyle === 'underline'
                  ? (lang === 'tr'
                      ? 'Alt Çizgi: Hover\'da alt çizgi animasyonlu zarif menü'
                      : 'Underline: Elegant menu with underline animation on hover')
                  : (lang === 'tr'
                      ? 'Klasik: Beyaz/koyu arka plan üzerinde basit metin bağlantıları'
                      : 'Classic: Simple text links on header')}
            </p>
          </div>

          {navStyle === 'gooey' && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                {lang === 'tr' ? 'GooeyNav Ayarları' : 'GooeyNav Settings'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{lang === 'tr' ? 'Parçacık Sayısı' : 'Particle Count'}</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={settings.theme_nav_particle_count || '15'}
                    onChange={(e) => updateSetting('theme_nav_particle_count', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Tıklama animasyonundaki parçacık sayısı (5-50)' : 'Number of particles in click animation (5-50)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{lang === 'tr' ? 'Animasyon Süresi (ms)' : 'Animation Time (ms)'}</Label>
                  <Input
                    type="number"
                    min={200}
                    max={2000}
                    step={100}
                    value={settings.theme_nav_animation_time || '600'}
                    onChange={(e) => updateSetting('theme_nav_animation_time', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Parçacık animasyonunun süresi (200-2000ms)' : 'Duration of particle animation (200-2000ms)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Section 6: Header Ad Settings (All Themes) ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="h-5 w-5" />
            {lang === 'tr' ? 'Header Reklam Ayarları' : 'Header Ad Settings'}
          </CardTitle>
          <CardDescription>
            {lang === 'tr'
              ? 'Tüm temalarda header üstünde gösterilen reklam ayarları'
              : 'Ad settings displayed above the header in all themes'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header AMP Domain */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              {lang === 'tr' ? 'Header AMP Reklam Domain' : 'Header AMP Ad Domain'}
            </Label>
            <Input
              value={settings.theme_header_ad_domain || ''}
              onChange={(e) => updateSetting('theme_header_ad_domain', e.target.value)}
              placeholder={lang === 'tr' ? 'örn: example.com' : 'e.g. example.com'}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {lang === 'tr'
                ? 'Domain girildiğinde header üstünde reklam otomatik oluşturulur. Boş bırakılırsa gizlenir.'
                : 'When a domain is entered, an ad is automatically generated above the header. Hidden when empty.'}
            </p>
            {/* Desktop toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={settings.theme_header_ad_desktop !== 'false'}
                onClick={() => updateSetting('theme_header_ad_desktop', settings.theme_header_ad_desktop === 'false' ? 'true' : 'false')}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.theme_header_ad_desktop === 'false' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-primary'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.theme_header_ad_desktop === 'false' ? 'translate-x-0.5' : 'translate-x-[18px]'}`} />
              </button>
              <span className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'Masaüstünde göster' : 'Show on desktop'}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {settings.theme_header_ad_desktop === 'false'
                  ? (lang === 'tr' ? '(sadece AMP)' : '(AMP only)')
                  : (lang === 'tr' ? '(masaüstü + AMP)' : '(desktop + AMP)')}
              </span>
            </div>
          </div>

          {/* Header Ad Code */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              {lang === 'tr' ? 'Header Reklam Kodu (Manuel)' : 'Header Ad Code (Manual)'}
            </Label>
            <Textarea
              value={settings.theme_header_ad_code || ''}
              onChange={(e) => updateSetting('theme_header_ad_code', e.target.value)}
              placeholder={lang === 'tr' ? 'Header üstünde gösterilecek HTML/reklam kodu' : 'HTML/ad code to display above the header'}
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              {lang === 'tr'
                ? 'Özel HTML/reklam kodu. AMP domain ayarlanmışsa bu alanın altında gösterilir.'
                : 'Custom HTML/ad code. Shown below the AMP domain ad if one is set.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===== Section 7: Velvet-Specific Settings ===== */}
      {currentTemplate === 'velvet' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5" />
              {lang === 'tr' ? 'Velvet Tema Ayarları' : 'Velvet Theme Settings'}
            </CardTitle>
            <CardDescription>
              {lang === 'tr'
                ? 'Velvet temasına özel ek bölüm ayarları'
                : 'Additional section settings specific to the Velvet theme'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dark/Light Mode Info */}
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">/</span>
                  <Moon className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {lang === 'tr' ? 'Koyu/Açık Mod Geçişi' : 'Dark/Light Mode Toggle'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === 'tr'
                      ? 'Header\'daki güneş/ay düğmesi ile ziyaretçiler koyu ve açık mod arasında geçiş yapabilir. Buradaki renkler koyu modu yapılandırır, açık mod otomatik türetilir.'
                      : 'Visitors can switch between dark and light mode using the sun/moon button in the header. Colors here configure dark mode, light mode auto-derives from them.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Slider Enabled */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <Label>
                  {lang === 'tr' ? 'Slider Alanı' : 'Slider Area'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {lang === 'tr'
                    ? 'Header altında tam genişlik slider widget alanını etkinleştirir'
                    : 'Enables the full-width slider widget area below the header'}
                </p>
              </div>
              <Switch
                checked={settings.theme_slider_enabled === 'true'}
                onCheckedChange={(checked) => updateSetting('theme_slider_enabled', checked ? 'true' : 'false')}
              />
            </div>

            {/* Gallery / Custom HTML */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                {lang === 'tr' ? 'Galeri / Özel HTML Alanı' : 'Gallery / Custom HTML Section'}
              </Label>
              <Textarea
                value={settings.theme_gallery_section_code || ''}
                onChange={(e) => updateSetting('theme_gallery_section_code', e.target.value)}
                placeholder={lang === 'tr' ? 'İçerikten sonra gösterilecek HTML kodu (galeri, slider, vb.)' : 'HTML code to display after content (gallery, slider, etc.)'}
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'Ana içerik ve sidebar\'dan sonra tam genişlik HTML alanı. Boş bırakılırsa gizlenir.'
                  : 'Full-width HTML area after the main content and sidebar. Hidden when empty.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? t('common.loading', lang) : t('action.save', lang)}
        </Button>
      </div>
    </div>
  );
}
