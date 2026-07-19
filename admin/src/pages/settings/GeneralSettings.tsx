import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Separator } from '@ui/separator';
import { Switch } from '@ui/switch';
import { Save, Home, FileText, List, Type, Blocks, Shield, ShieldCheck, MessageSquare, Globe, RotateCcw, BarChart3, Code, Clock, Layers, PenTool, Edit3 } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

// One settings section, shown only when its tab is active. Renders a
// plain (always-open) card — the tab nav replaces the old accordion.
function SectionCard({ active, icon, title, description, children }: {
  active: boolean;
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          <span className="flex-1">{title}</span>
        </CardTitle>
        {description && (
          <CardDescription className="text-xs mt-1">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function GeneralSettings() {
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [inherited, setInherited] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<{ id: number; title: string }[]>([]);
  const [tab, setTab] = useState('general');

  useEffect(() => {
    if (!activeSite) return;
    loadSettings();
    loadPages();
  }, [activeSite]);

  const applySettingsResponse = (res: any) => {
    if (res.success && res.data) {
      setSettings(res.data as Record<string, string>);
      setInherited(Array.isArray(res._inherited) ? res._inherited : []);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    const res = await api.getSettings();
    setLoading(false);
    applySettingsResponse(res);
  };

  const loadPages = async () => {
    try {
      const res = await api.getPosts({ post_type: 'page', status: 'publish', per_page: '100' });
      if (res?.success && res?.data) {
        const list = (res.data || []).map((p: any) => ({ id: p.id, title: p.title }));
        setPages(list);
      }
    } catch { /* ignore */ }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast(lang === 'tr' ? 'Ayarlar kaydedildi' : 'Settings saved', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const resetToGlobal = async (key: string) => {
    try {
      await api.deleteSiteSetting(key);
      // Soft reload — no loading spinner so UI stays mounted
      const res = await api.getSettings();
      applySettingsResponse(res);
      toast(lang === 'tr' ? 'Global değere döndürüldü' : 'Reset to global value', 'success');
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
  };

  const GlobalBadge = ({ settingKey }: { settingKey: string }) => {
    if (!inherited.includes(settingKey)) return null;
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
        title={lang === 'tr' ? 'Bu değer global ayarlardan alınıyor' : 'This value is inherited from global settings'}
      >
        <Globe className="h-3 w-3" />
        Global
      </span>
    );
  };

  const ResetToGlobalButton = ({ settingKey }: { settingKey: string }) => {
    if (inherited.includes(settingKey)) return null;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); resetToGlobal(settingKey); }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
        title={lang === 'tr' ? 'Site değerini sil, global ayara dön' : 'Remove site override, revert to global value'}
      >
        <RotateCcw className="h-3 w-3" />
        {lang === 'tr' ? 'Globale Dön' : 'Reset to Global'}
      </button>
    );
  };

  const TABS: { id: string; icon: React.ReactNode; label: string }[] = [
    { id: 'general', icon: <Globe className="h-4 w-4" />, label: lang === 'tr' ? 'Genel' : 'General' },
    { id: 'homepage', icon: <Home className="h-4 w-4" />, label: lang === 'tr' ? 'Ana Sayfa' : 'Homepage' },
    { id: 'editor', icon: <Type className="h-4 w-4" />, label: lang === 'tr' ? 'Editör' : 'Editor' },
    { id: 'seo', icon: <Globe className="h-4 w-4" />, label: 'SEO' },
    { id: 'snippets', icon: <Code className="h-4 w-4" />, label: 'Rich Snippets' },
    { id: 'analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
    { id: 'header', icon: <Code className="h-4 w-4" />, label: lang === 'tr' ? 'Header Kodu' : 'Header Code' },
    { id: 'gate', icon: <ShieldCheck className="h-4 w-4" />, label: lang === 'tr' ? 'Ziyaretçi Kapısı' : 'Visitor Gate' },
    { id: 'recaptcha', icon: <Shield className="h-4 w-4" />, label: 'reCAPTCHA' },
    { id: 'comments', icon: <MessageSquare className="h-4 w-4" />, label: lang === 'tr' ? 'Yorumlar' : 'Comments' },
  ];

  if (loading) return <div className="p-4">{t('common.loading', lang)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.settings', lang)}</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t('common.loading', lang) : t('action.save', lang)}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Tab nav */}
        <nav className="w-full md:w-52 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-4">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors text-left ${
                tab === tabItem.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tabItem.icon}
              <span>{tabItem.label}</span>
            </button>
          ))}
        </nav>

        {/* Active section */}
        <div className="flex-1 min-w-0 max-w-2xl space-y-4">

      {/* Genel Ayarlar */}
      <SectionCard
        active={tab === 'general'}
        icon={<Globe className="h-5 w-5" />}
        title={lang === 'tr' ? 'Genel Ayarlar' : 'General Settings'}
        description={`${activeSite?.name} - ${lang === 'tr' ? 'site ayarları' : 'site settings'}`}
      >
        <div className="space-y-4">
          <div>
            <Label>{lang === 'tr' ? 'Site Başlığı' : 'Site Title'}</Label>
            <Input
              value={settings.site_title || ''}
              onChange={(e) => updateSetting('site_title', e.target.value)}
            />
          </div>
          <div>
            <Label>{lang === 'tr' ? 'Site Açıklaması' : 'Site Description'}</Label>
            <Textarea
              value={settings.site_description || ''}
              onChange={(e) => updateSetting('site_description', e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label>{lang === 'tr' ? 'Varsayılan Dil' : 'Default Language'}</Label>
            <Select
              value={settings.default_language || 'tr'}
              onValueChange={(v) => updateSetting('default_language', v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {lang === 'tr' ? 'Saat Dilimi' : 'Timezone'}
              <GlobalBadge settingKey="timezone" />
              <ResetToGlobalButton settingKey="timezone" />
            </Label>
            <select
              value={settings.timezone || 'Europe/Istanbul'}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
            >
              <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
              <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="Europe/Moscow">Europe/Moscow (GMT+3)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="America/Chicago">America/Chicago (GMT-6)</option>
              <option value="America/Denver">America/Denver (GMT-7)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (GMT+8)</option>
              <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
              <option value="Australia/Sydney">Australia/Sydney (GMT+11)</option>
              <option value="Pacific/Auckland">Pacific/Auckland (GMT+13)</option>
              <option value="UTC">UTC (GMT+0)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'tr'
                ? 'Rich Snippets tarih/saat bilgilerinde kullanılır. Boş bırakılırsa global ayar geçerlidir.'
                : 'Used for Rich Snippets date/time. Falls back to global setting if empty.'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Ana Sayfa Görünümü */}
      <SectionCard
        active={tab === 'homepage'}
        icon={<Home className="h-5 w-5" />}
        title={lang === 'tr' ? 'Ana Sayfa Görünümü' : 'Homepage Display'}
        description={lang === 'tr'
          ? 'Ana sayfanızda ne gösterilsin? Son yazıları veya sabit bir sayfayı seçebilirsiniz.'
          : 'What should your homepage display? You can show latest posts or a static page.'}
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer flex-1 transition-colors ${
              (settings.show_on_front || 'posts') === 'posts' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input
                type="radio"
                name="show_on_front"
                value="posts"
                checked={(settings.show_on_front || 'posts') === 'posts'}
                onChange={() => updateSetting('show_on_front', 'posts')}
                className="accent-blue-500"
              />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <List className="h-4 w-4" />
                  {lang === 'tr' ? 'Son Yazılar' : 'Latest Posts'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Blog yazıları listesi gösterilir' : 'Shows a list of your blog posts'}
                </p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer flex-1 transition-colors ${
              settings.show_on_front === 'page' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input
                type="radio"
                name="show_on_front"
                value="page"
                checked={settings.show_on_front === 'page'}
                onChange={() => updateSetting('show_on_front', 'page')}
                className="accent-blue-500"
              />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  {lang === 'tr' ? 'Sabit Sayfa' : 'Static Page'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Seçtiğiniz sayfa ana sayfa olur' : 'A page of your choice becomes the homepage'}
                </p>
              </div>
            </label>
          </div>

          {settings.show_on_front === 'page' && (
            <div className="pl-1">
              <Label>{lang === 'tr' ? 'Ana Sayfa' : 'Homepage'}</Label>
              <Select
                value={settings.page_on_front || ''}
                onValueChange={(v) => updateSetting('page_on_front', v)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder={lang === 'tr' ? 'Sayfa seçin...' : 'Select a page...'} />
                </SelectTrigger>
                <SelectContent>
                  {pages.length === 0 ? (
                    <SelectItem value="0" disabled>
                      {lang === 'tr' ? 'Yayınlanmış sayfa yok' : 'No published pages'}
                    </SelectItem>
                  ) : (
                    pages.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {lang === 'tr'
                  ? 'İpucu: Sayfanızda [son-yazilar], [slider], [kategori slug="..."] gibi shortcode\'lar kullanarak dinamik içerik ekleyebilirsiniz.'
                  : 'Tip: Use shortcodes like [son-yazilar], [slider], [kategori slug="..."] in your page to add dynamic content.'}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Editör Tercihi */}
      <SectionCard
        active={tab === 'editor'}
        icon={<Type className="h-5 w-5" />}
        title={<>
          {lang === 'tr' ? 'Editör Tercihi' : 'Editor Preference'}
          {' '}<GlobalBadge settingKey="editor_type" />
          {' '}<ResetToGlobalButton settingKey="editor_type" />
        </>}
        description={lang === 'tr'
          ? 'Yazı ve sayfa düzenlemede kullanılacak editörü seçin.'
          : 'Choose the editor used for editing posts and pages.'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            (settings.editor_type || 'classic') === 'classic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
          }`}>
            <input type="radio" name="editor_type" value="classic"
              checked={(settings.editor_type || 'classic') === 'classic'}
              onChange={() => updateSetting('editor_type', 'classic')}
              className="accent-blue-500" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Type className="h-4 w-4" />
                {lang === 'tr' ? 'Klasik Editör' : 'Classic Editor'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Araç çubuğu tabanlı zengin metin editörü' : 'Toolbar-based rich text editor'}
              </p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            settings.editor_type === 'blocknote' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
          }`}>
            <input type="radio" name="editor_type" value="blocknote"
              checked={settings.editor_type === 'blocknote'}
              onChange={() => updateSetting('editor_type', 'blocknote')}
              className="accent-blue-500" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Blocks className="h-4 w-4" />
                {lang === 'tr' ? 'Blok Editör' : 'Block Editor'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Gutenberg benzeri blok tabanlı editör' : 'Gutenberg-like block-based editor'}
              </p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            settings.editor_type === 'tiptap' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
          }`}>
            <input type="radio" name="editor_type" value="tiptap"
              checked={settings.editor_type === 'tiptap'}
              onChange={() => updateSetting('editor_type', 'tiptap')}
              className="accent-blue-500" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                <PenTool className="h-4 w-4" />
                Tiptap
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Gelişmiş özellikler: renk, highlight, YouTube, kod bloğu' : 'Advanced: color, highlight, YouTube, code blocks'}
              </p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            settings.editor_type === 'plate' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
          }`}>
            <input type="radio" name="editor_type" value="plate"
              checked={settings.editor_type === 'plate'}
              onChange={() => updateSetting('editor_type', 'plate')}
              className="accent-blue-500" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Layers className="h-4 w-4" />
                Plate.js
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Slate tabanlı modern editör, eklenti desteği' : 'Slate-based modern editor with plugin system'}
              </p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
            settings.editor_type === 'tinymce' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
          }`}>
            <input type="radio" name="editor_type" value="tinymce"
              checked={settings.editor_type === 'tinymce'}
              onChange={() => updateSetting('editor_type', 'tinymce')}
              className="accent-blue-500" />
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Edit3 className="h-4 w-4" />
                TinyMCE
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr' ? 'Klasik WordPress editörü, tam özellikli' : 'Classic WordPress-style editor, full-featured'}
              </p>
            </div>
          </label>
        </div>
      </SectionCard>

      {/* SEO */}
      <SectionCard
        active={tab === 'seo'}
        icon={<Globe className="h-5 w-5" />}
        title="SEO"
        description={lang === 'tr'
          ? 'Meta başlık, açıklama, robots.txt ve WWW yönlendirmesi.'
          : 'Meta title, description, robots.txt and WWW redirect.'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium inline-flex items-center gap-2">
                {lang === 'tr' ? 'Okuma Süresi Göster' : 'Show Reading Time'}
                <GlobalBadge settingKey="show_reading_time" />
                <ResetToGlobalButton settingKey="show_reading_time" />
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Yazılarda tahmini okuma süresini gösterir (Ana sayfada her zaman gizlenir)'
                  : 'Show estimated reading time on posts (Always hidden on homepage)'}
              </p>
            </div>
            <Switch
              checked={settings.show_reading_time === 'true'}
              onCheckedChange={(checked) => updateSetting('show_reading_time', checked ? 'true' : 'false')}
            />
          </div>
          <Separator />
          <div>
            <Label>{lang === 'tr' ? 'Meta Başlık Şablonu' : 'Meta Title Template'}</Label>
            <Input
              value={settings.seo_title_template || ''}
              onChange={(e) => updateSetting('seo_title_template', e.target.value)}
              placeholder="{title} - {site_name}"
            />
          </div>
          <div>
            <Label>{lang === 'tr' ? 'Varsayılan Meta Açıklama' : 'Default Meta Description'}</Label>
            <Textarea
              value={settings.seo_default_description || ''}
              onChange={(e) => updateSetting('seo_default_description', e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>robots.txt</Label>
            <Textarea
              value={settings.robots_txt || ''}
              onChange={(e) => updateSetting('robots_txt', e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder="User-agent: *&#10;Allow: /"
            />
          </div>
          <Separator />
          <div>
            <Label className="inline-flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {lang === 'tr' ? 'WWW Yönlendirmesi' : 'WWW Redirect'}
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr'
                ? 'Sitenize www ile mi yoksa www\'suz mu erisilsin? Seciminize gore otomatik 301 yonlendirme yapilir.'
                : 'Should your site be accessed with or without www? A 301 redirect is applied automatically.'}
            </p>
            <Select
              value={settings.www_preference || 'none'}
              onValueChange={(v) => updateSetting('www_preference', v)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{lang === 'tr' ? 'Yönlendirme Yok' : 'No Redirect'}</SelectItem>
                <SelectItem value="non-www">{lang === 'tr' ? 'www \u2192 non-www (örn: example.com)' : 'www \u2192 non-www (e.g. example.com)'}</SelectItem>
                <SelectItem value="www">{lang === 'tr' ? 'non-www \u2192 www (örn: www.example.com)' : 'non-www \u2192 www (e.g. www.example.com)'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Rich Snippets */}
      <SectionCard
        active={tab === 'snippets'}
        icon={<Code className="h-5 w-5" />}
        title="Rich Snippets (Schema.org)"
        description={lang === 'tr'
          ? 'Google arama sonuçlarında zengin sonuçlar (rich results) için yapılandırılmış veri (JSON-LD).'
          : 'Structured data (JSON-LD) for rich results in Google search.'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">
                {lang === 'tr' ? 'Rich Snippets Aktif' : 'Enable Rich Snippets'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Tüm site genelinde yapılandırılmış veri (JSON-LD) eklenmesini etkinleştirir'
                  : 'Enables JSON-LD structured data injection site-wide'}
              </p>
            </div>
            <Switch
              checked={settings.rs_enabled === 'true'}
              onCheckedChange={(checked) => updateSetting('rs_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {settings.rs_enabled === 'true' && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  {lang === 'tr' ? 'Sayfa Türleri' : 'Page Types'}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">
                      {lang === 'tr' ? 'Yazılar (Article/BlogPosting)' : 'Posts (Article/BlogPosting)'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Yazı detay sayfalarına makale şeması ekler' : 'Adds article schema to post detail pages'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.rs_posts !== 'false'}
                    onCheckedChange={(checked) => updateSetting('rs_posts', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">
                      {lang === 'tr' ? 'Sayfalar (WebPage)' : 'Pages (WebPage)'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Statik sayfalara web sayfası şeması ekler' : 'Adds webpage schema to static pages'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.rs_pages !== 'false'}
                    onCheckedChange={(checked) => updateSetting('rs_pages', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">
                      {lang === 'tr' ? 'Ana Sayfa (WebSite + Organization)' : 'Homepage (WebSite + Organization)'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Ana sayfaya site ve kuruluş şeması ekler' : 'Adds website & organization schema to homepage'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.rs_homepage !== 'false'}
                    onCheckedChange={(checked) => updateSetting('rs_homepage', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">
                      {lang === 'tr' ? 'Arşiv Sayfaları (CollectionPage)' : 'Archive Pages (CollectionPage)'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Kategori ve etiket arşiv sayfalarına şema ekler' : 'Adds schema to category & tag archive pages'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.rs_archives !== 'false'}
                    onCheckedChange={(checked) => updateSetting('rs_archives', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">
                      {lang === 'tr' ? 'Breadcrumb (BreadcrumbList)' : 'Breadcrumbs (BreadcrumbList)'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Gezinme yol haritası şeması ekler' : 'Adds breadcrumb navigation schema'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.rs_breadcrumbs !== 'false'}
                    onCheckedChange={(checked) => updateSetting('rs_breadcrumbs', checked ? 'true' : 'false')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">
                      {lang === 'tr' ? 'AMP Sayfaları' : 'AMP Pages'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'AMP versiyonlarına da yapılandırılmış veri ekler' : 'Adds structured data to AMP versions too'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.rs_amp !== 'false'}
                    onCheckedChange={(checked) => updateSetting('rs_amp', checked ? 'true' : 'false')}
                  />
                </div>
              </div>

              <Separator />
              <div>
                <Label>{lang === 'tr' ? 'Yayıncı / Kuruluş Adı' : 'Publisher / Organization Name'}</Label>
                <Input
                  value={settings.rs_publisher_name || ''}
                  onChange={(e) => updateSetting('rs_publisher_name', e.target.value)}
                  placeholder={lang === 'tr' ? 'Site adınız (boş bırakılırsa site başlığı kullanılır)' : 'Your site name (defaults to site title if empty)'}
                />
              </div>
              <div>
                <Label>{lang === 'tr' ? 'Yayıncı Logo URL' : 'Publisher Logo URL'}</Label>
                <Input
                  value={settings.rs_publisher_logo || ''}
                  onChange={(e) => updateSetting('rs_publisher_logo', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr'
                    ? 'Google için önerilen boyut: 600x60 piksel veya 112x112 piksel kare logo'
                    : 'Recommended by Google: 600x60px or 112x112px square logo'}
                </p>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* Analytics */}
      <SectionCard
        active={tab === 'analytics'}
        icon={<BarChart3 className="h-5 w-5" />}
        title={lang === 'tr' ? 'Analytics / İzleme Kodları' : 'Analytics / Tracking Codes'}
        description={lang === 'tr'
          ? 'Google Analytics, Tag Manager veya diğer izleme kodlarını ekleyin.'
          : 'Add Google Analytics, Tag Manager or other tracking codes.'}
      >
        <div className="space-y-4">
          <div>
            <Label className="inline-flex items-center gap-2">
              {lang === 'tr' ? '<head> İçine Eklenecek Kod' : 'Code for <head> Section'}
              <GlobalBadge settingKey="analytics_head_code" />
              <ResetToGlobalButton settingKey="analytics_head_code" />
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr'
                ? '<script> etiketleri dahil yapıştırın.'
                : 'Paste including <script> tags.'}
            </p>
            <Textarea
              value={settings.analytics_head_code || ''}
              onChange={(e) => updateSetting('analytics_head_code', e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder={'<!-- Google tag (gtag.js) -->\n<script async src="..."></script>'}
            />
          </div>
          <Separator />
          <div>
            <Label className="inline-flex items-center gap-2">
              {lang === 'tr' ? '</body> Öncesine Eklenecek Kod' : 'Code Before </body>'}
              <GlobalBadge settingKey="analytics_body_code" />
              <ResetToGlobalButton settingKey="analytics_body_code" />
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr'
                ? 'Sayfa yüklendikten sonra çalışması gereken scriptler.'
                : 'Scripts that should run after page load.'}
            </p>
            <Textarea
              value={settings.analytics_body_code || ''}
              onChange={(e) => updateSetting('analytics_body_code', e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder={'<!-- Facebook Pixel, Hotjar, etc. -->'}
            />
          </div>
        </div>
      </SectionCard>

      {/* Header Code */}
      <SectionCard
        active={tab === 'header'}
        icon={<Code className="h-5 w-5" />}
        title={lang === 'tr' ? 'Header Kodu' : 'Header Code'}
        description={lang === 'tr'
          ? '<head> içine, analytics/izleme kodundan önce eklenen özel kod.'
          : 'Custom code injected into <head>, before the analytics/tracking code.'}
      >
        <div className="space-y-3">
          {/* Enable / disable — keeps the code but stops injecting it */}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label className="text-sm">{lang === 'tr' ? 'Header kodunu etkinleştir' : 'Enable header code'}</Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'Kapatınca kod silinmez; sadece siteye eklenmez.'
                  : 'Turning this off keeps the code but stops injecting it.'}
              </p>
            </div>
            <Switch
              checked={settings.header_code_enabled !== 'false'}
              onCheckedChange={(checked) => updateSetting('header_code_enabled', checked ? 'true' : 'false')}
            />
          </div>

          <div className={settings.header_code_enabled === 'false' ? 'opacity-50' : ''}>
            <Label className="inline-flex items-center gap-2">
              {lang === 'tr' ? '<head> İçine Eklenecek Kod (analytics öncesi)' : 'Code for <head> (before analytics)'}
              <GlobalBadge settingKey="header_code" />
              <ResetToGlobalButton settingKey="header_code" />
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr'
                ? 'Doğrulama meta etiketleri, preconnect, özel scriptler vb. Analytics kodundan önce yüklenir.'
                : 'Verification meta tags, preconnect, custom scripts, etc. Loaded before the analytics code.'}
            </p>
            <Textarea
              value={settings.header_code || ''}
              onChange={(e) => updateSetting('header_code', e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder={'<meta name="google-site-verification" content="..." />\n<link rel="preconnect" href="..." />'}
            />
          </div>
        </div>
      </SectionCard>

      {/* Visitor Gate */}
      <SectionCard
        active={tab === 'gate'}
        icon={<ShieldCheck className="h-5 w-5" />}
        title={lang === 'tr' ? 'Ziyaretçi Kapısı' : 'Visitor Gate'}
        description={lang === 'tr'
          ? 'Sayfa açılmadan önce ziyaretçiyi süzer. Yalnızca mobil + Türkçe + Türkiye + VPN/proxy’siz ziyaretçiler geçer; diğerleri uyarı sayfası görür.'
          : 'Screens visitors before the page loads. Only mobile + Turkish + from Turkey + non-VPN/proxy visitors pass; others see a notice page.'}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label className="text-sm">{lang === 'tr' ? 'Ziyaretçi kapısını etkinleştir' : 'Enable visitor gate'}</Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'Bu site için kapıyı aç/kapat. Kapalıyken site herkese normal açılır.'
                  : 'Turn the gate on/off for this site. When off, the site opens normally for everyone.'}
              </p>
            </div>
            <Switch
              checked={settings.gate_enabled === '1'}
              onCheckedChange={(checked) => updateSetting('gate_enabled', checked ? '1' : '0')}
            />
          </div>

          {/* Pass rules — each rule can be toggled per site */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{lang === 'tr' ? 'Geçiş kuralları' : 'Pass rules'}</p>
            <div className="rounded-lg border divide-y">
              {[
                { k: 'gate_require_mobile',   tr: 'Sadece mobil cihazlar',   en: 'Mobile devices only',  trd: 'Kapatınca masaüstü de girer.',   end: 'Off lets desktop in too.' },
                { k: 'gate_require_turkish',  tr: 'Sadece Türkçe tarayıcı',  en: 'Turkish browser only', trd: 'Tarayıcı dili tr ile başlamalı.', end: 'Browser language must start with tr.' },
                { k: 'gate_require_country',  tr: "Sadece Türkiye'den",      en: 'From Turkey only',     trd: 'Ziyaretçi IP ülkesi TR olmalı.', end: 'Visitor IP country must be TR.' },
                { k: 'gate_require_no_proxy', tr: 'VPN / proxy engelle',     en: 'Block VPN / proxy',    trd: 'Kapatınca VPN/proxy de girer.',  end: 'Off lets VPN/proxy in too.' },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <Label className="text-sm">{lang === 'tr' ? r.tr : r.en}</Label>
                    <p className="text-xs text-muted-foreground">{lang === 'tr' ? r.trd : r.end}</p>
                  </div>
                  <Switch
                    checked={settings[r.k] !== '0'}
                    onCheckedChange={(checked) => updateSetting(r.k, checked ? '1' : '0')}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Ignore whitelist — for testing the gate as a real visitor */}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label className="text-sm">{lang === 'tr' ? 'Muaf IP listesini (whitelist) yok say' : 'Ignore the exempt-IP whitelist'}</Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr'
                  ? 'Test için. Açıkken kendi muaf IP’lerin de kapıya tabi olur — kapıyı gerçek bir ziyaretçi gibi denemek için kullan.'
                  : 'For testing. When on, your own exempt IPs are also gated — use it to experience the gate as a real visitor.'}
              </p>
            </div>
            <Switch
              checked={settings.gate_ignore_whitelist === '1'}
              onCheckedChange={(checked) => updateSetting('gate_ignore_whitelist', checked ? '1' : '0')}
            />
          </div>

          {/* Detailed system explanation */}
          <div className="rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground space-y-4">
            {lang === 'tr' ? (
              <>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">Sistem nasıl çalışır?</p>
                  <p>Kapı açık olduğunda, sayfa CMS tarafından oluşturulmadan <strong>önce</strong> her istek değerlendirilir. Ziyaretçi aşağıdaki kontrolleri <strong>sırayla</strong> geçmek zorundadır; ilk başarısız kontrolde durur ve o kurala ait uyarı sayfası (HTTP 403) gösterilir. Tüm kontrolleri geçen ziyaretçiye site normal açılır ve iç linkler, formlar, görseller olağan şekilde çalışır.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Uygulanan kurallar (sırasıyla)</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li><strong>Yalnızca mobil cihaz</strong> — cihaz <code>Sec-CH-UA-Mobile</code> başlığından ve User-Agent’tan tespit edilir. Masaüstü ziyaretçiler engellenir.</li>
                    <li><strong>Yalnızca Türkçe</strong> — tarayıcının <code>Accept-Language</code> başlığı <code>tr</code> ile başlamalıdır.</li>
                    <li><strong>Yalnızca Türkiye</strong> — Cloudflare’in tespit ettiği ülke (<code>TR</code>) kontrol edilir.</li>
                    <li><strong>VPN / proxy yok</strong> — ziyaretçinin IP’si proxycheck.io ile sorgulanır. Datacenter/VPN her zaman engellenir; residential/mobil bağlantılar ise risk skoru 50 ve üzeriyse engellenir.</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Engellenen ziyaretçi ne görür?</p>
                  <p>Nazik, iki dilli (TR/EN) bir bilgi sayfası — engellenme nedenine göre metin değişir (ör. “Yalnızca Mobil Cihazlar”, “Yalnızca Türkçe Hizmet”, “Bağlantı Doğrulanamadı”). Sayfa 403 durum koduyla döner ve arama motorlarında önbelleğe alınmaz.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Her zaman muaf tutulanlar</p>
                  <p>Yönetim paneli (<code>/admin</code>), API ve webhook’lar (<code>/api</code>), medya dosyaları (<code>/uploads</code>) ve yönetim alan adı hiçbir zaman kapıya takılmaz. Böylece masaüstünden panele girişin ve ödeme/webhook çağrıları etkilenmez.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Önbellek ve muaf IP’ler</p>
                  <p>Aynı IP için proxy/VPN sonucu tekrar tekrar sorulmaz; temiz sonuçlar 24 saat önbelleğe alınır (kota tasarrufu). Yöneticinin kendi IP’leri beyaz listededir ve tüm kontrollerden muaftır.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Kapsam ve kurulum</p>
                  <p>Bu anahtar yalnızca <strong>bu siteyi</strong> etkiler; her siteyi ayrı ayrı açıp kapatabilirsin. Kurallar (mobil/dil/ülke/proxy eşikleri) ve muaf IP listesi worker tarafındaki <code>gate.js</code> dosyasından yönetilir.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">SEO / bot notu</p>
                  <p>Kapı, Googlebot gibi tarayıcıları da (mobil değil / dil yok diye) engelleyebilir. Kampanya/erişim kısıtı amacıyla kullanıldığından bu beklenen davranıştır; sitenin Google’da indekslenmesini istiyorsan kapıyı bu sitede kapalı tut.</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">How the system works</p>
                  <p>When the gate is on, every request is evaluated <strong>before</strong> the CMS renders the page. Visitors must pass the checks below <strong>in order</strong>; on the first failed check they stop and see a notice page (HTTP 403) for that rule. Visitors who pass all checks get the site normally — internal links, forms and images all work as usual.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Rules applied (in order)</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li><strong>Mobile devices only</strong> — detected from the <code>Sec-CH-UA-Mobile</code> header and User-Agent. Desktop visitors are blocked.</li>
                    <li><strong>Turkish only</strong> — the browser’s <code>Accept-Language</code> must start with <code>tr</code>.</li>
                    <li><strong>Turkey only</strong> — Cloudflare’s detected country must be <code>TR</code>.</li>
                    <li><strong>No VPN / proxy</strong> — the visitor’s IP is checked via proxycheck.io. Datacenter/VPN is always blocked; residential/mobile connections are blocked at risk score 50 or above.</li>
                  </ol>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">What a blocked visitor sees</p>
                  <p>A polite bilingual (TR/EN) notice page whose text depends on the reason (e.g. “Mobile Devices Only”, “Turkish Language Only”, “Connection Not Verified”). It returns HTTP 403 and is not cached by search engines.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Always exempt</p>
                  <p>The admin panel (<code>/admin</code>), API and webhooks (<code>/api</code>), media files (<code>/uploads</code>) and the management domain are never gated — so your desktop admin access and payment/webhook calls are unaffected.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Caching and exempt IPs</p>
                  <p>The proxy/VPN result for an IP is not re-queried repeatedly; clean results are cached for 24 hours (saves quota). The admin’s own IPs are whitelisted and skip all checks.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">Scope and setup</p>
                  <p>This switch affects <strong>this site only</strong>; you can turn each site on/off independently. The rules (mobile/language/country/proxy thresholds) and the exempt-IP list are managed in the worker’s <code>gate.js</code> file.</p>
                </div>

                <div>
                  <p className="font-medium text-foreground mb-1">SEO / bot note</p>
                  <p>The gate may also block crawlers like Googlebot (not mobile / no language). This is expected for campaign/access-restriction use; if you want this site indexed by Google, keep the gate off for it.</p>
                </div>
              </>
            )}
          </div>

          {/* Critical requirement */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {lang === 'tr'
              ? <p><strong>Önemli:</strong> VPN/proxy kontrolü için worker’a <code>PROXYCHECK_KEY</code> secret’ı eklenmiş olmalıdır. Eklenmezse kapı güvenli tarafta kalıp (fail-closed) mobil + Türkçe ziyaretçiler dahil <strong>tüm</strong> ziyaretçileri engeller. Bu yüzden anahtarı eklemeden bu siteyi açma.</p>
              : <p><strong>Important:</strong> the VPN/proxy check needs a <code>PROXYCHECK_KEY</code> secret on the worker. Without it the gate fails closed and blocks <strong>every</strong> visitor — including mobile + Turkish ones. Don’t enable this site until the key is set.</p>}
          </div>
        </div>
      </SectionCard>

      {/* reCAPTCHA */}
      <SectionCard
        active={tab === 'recaptcha'}
        icon={<Shield className="h-5 w-5" />}
        title="reCAPTCHA v3"
        description={lang === 'tr'
          ? 'Google reCAPTCHA v3 ile spam koruması. Görünmez doğrulama.'
          : 'Spam protection with Google reCAPTCHA v3. Invisible verification.'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium inline-flex items-center gap-2">
                {lang === 'tr' ? 'reCAPTCHA Aktif' : 'Enable reCAPTCHA'}
                <GlobalBadge settingKey="recaptcha_enabled" />
                <ResetToGlobalButton settingKey="recaptcha_enabled" />
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr' ? 'reCAPTCHA v3 korumasını etkinleştir' : 'Enable reCAPTCHA v3 protection'}
              </p>
            </div>
            <Switch
              checked={settings.recaptcha_enabled === 'true'}
              onCheckedChange={(checked) => updateSetting('recaptcha_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {settings.recaptcha_enabled === 'true' && (
            <>
              <Separator />
              <div>
                <Label className="inline-flex items-center gap-2">
                  Site Key
                  <GlobalBadge settingKey="recaptcha_site_key" />
                  <ResetToGlobalButton settingKey="recaptcha_site_key" />
                </Label>
                <Input
                  value={settings.recaptcha_site_key || ''}
                  onChange={(e) => updateSetting('recaptcha_site_key', e.target.value)}
                  placeholder="6Lc..."
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label className="inline-flex items-center gap-2">
                  Secret Key
                  <GlobalBadge settingKey="recaptcha_secret_key" />
                  <ResetToGlobalButton settingKey="recaptcha_secret_key" />
                </Label>
                <Input
                  type="password"
                  value={settings.recaptcha_secret_key || ''}
                  onChange={(e) => updateSetting('recaptcha_secret_key', e.target.value)}
                  placeholder="6Lc..."
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label className="inline-flex items-center gap-2">
                  {lang === 'tr' ? 'Skor Eşiği' : 'Score Threshold'}
                  <span className="text-xs text-muted-foreground">(0.0 - 1.0)</span>
                  <GlobalBadge settingKey="recaptcha_score_threshold" />
                  <ResetToGlobalButton settingKey="recaptcha_score_threshold" />
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.recaptcha_score_threshold || '0.5'}
                  onChange={(e) => updateSetting('recaptcha_score_threshold', e.target.value)}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr'
                    ? '0.5 önerilen değer. Düşük skor = şüpheli trafik.'
                    : '0.5 is recommended. Low score = suspicious traffic.'}
                </p>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  {lang === 'tr' ? 'Hangi formlarda kullanılsın?' : 'Which forms should use reCAPTCHA?'}
                </p>
                <div className="flex items-center justify-between">
                  <Label className="text-sm inline-flex items-center gap-2">
                    {lang === 'tr' ? 'İletişim Formu' : 'Contact Form'}
                    <GlobalBadge settingKey="recaptcha_on_contact" />
                    <ResetToGlobalButton settingKey="recaptcha_on_contact" />
                  </Label>
                  <Switch
                    checked={settings.recaptcha_on_contact !== 'false'}
                    onCheckedChange={(checked) => updateSetting('recaptcha_on_contact', checked ? 'true' : 'false')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm inline-flex items-center gap-2">
                    {lang === 'tr' ? 'Yorum Formu' : 'Comment Form'}
                    <GlobalBadge settingKey="recaptcha_on_comments" />
                    <ResetToGlobalButton settingKey="recaptcha_on_comments" />
                  </Label>
                  <Switch
                    checked={settings.recaptcha_on_comments !== 'false'}
                    onCheckedChange={(checked) => updateSetting('recaptcha_on_comments', checked ? 'true' : 'false')}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* Yorum Ayarları */}
      <SectionCard
        active={tab === 'comments'}
        icon={<MessageSquare className="h-5 w-5" />}
        title={lang === 'tr' ? 'Yorum Ayarları' : 'Comment Settings'}
        description={lang === 'tr'
          ? 'Yorum sistemini yapılandırın. Tüm sitede veya tek tek yazılarda kapatabilirsiniz.'
          : 'Configure the comment system. Disable site-wide or per-post.'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium inline-flex items-center gap-2">
                {lang === 'tr' ? 'Yorumlar Aktif' : 'Comments Enabled'}
                <GlobalBadge settingKey="comments_enabled" />
                <ResetToGlobalButton settingKey="comments_enabled" />
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Kapatırsanız tüm sitede yorum formu gizlenir'
                  : 'When disabled, comment forms are hidden site-wide'}
              </p>
            </div>
            <Switch
              checked={settings.comments_enabled !== 'false'}
              onCheckedChange={(checked) => updateSetting('comments_enabled', checked ? 'true' : 'false')}
            />
          </div>

          {settings.comments_enabled !== 'false' && (
            <>
              <Separator />
              <div>
                <Label className="inline-flex items-center gap-2">
                  {lang === 'tr' ? 'Varsayılan Yorum Durumu' : 'Default Comment Status'}
                  <GlobalBadge settingKey="default_comment_status" />
                  <ResetToGlobalButton settingKey="default_comment_status" />
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {lang === 'tr'
                    ? 'Yeni yazılar için varsayılan ayar. Her yazıda ayrıca değiştirilebilir.'
                    : 'Default setting for new posts. Can be changed per-post.'}
                </p>
                <Select
                  value={settings.default_comment_status || 'open'}
                  onValueChange={(v) => updateSetting('default_comment_status', v)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{lang === 'tr' ? 'Açık' : 'Open'}</SelectItem>
                    <SelectItem value="closed">{lang === 'tr' ? 'Kapalı' : 'Closed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium inline-flex items-center gap-2">
                    {lang === 'tr' ? 'Yorum Moderasyonu' : 'Comment Moderation'}
                    <GlobalBadge settingKey="comment_moderation" />
                    <ResetToGlobalButton settingKey="comment_moderation" />
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lang === 'tr'
                      ? 'Açıksa yorumlar onay bekler, kapalıysa doğrudan yayınlanır'
                      : 'When enabled, comments require approval before publishing'}
                  </p>
                </div>
                <Switch
                  checked={settings.comment_moderation === 'true'}
                  onCheckedChange={(checked) => updateSetting('comment_moderation', checked ? 'true' : 'false')}
                />
              </div>
            </>
          )}

          <Separator />
          <div>
            <Label>{lang === 'tr' ? 'Sayfa Başına Yazı' : 'Posts Per Page'}</Label>
            <Input
              type="number"
              value={settings.posts_per_page || '10'}
              onChange={(e) => updateSetting('posts_per_page', e.target.value)}
              className="w-24"
            />
          </div>
        </div>
      </SectionCard>
        </div>
      </div>
    </div>
  );
}
