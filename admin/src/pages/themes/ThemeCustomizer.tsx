import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast-notification';
import {
  Paintbrush, ArrowLeft, Save, RotateCcw, Loader2,
  ChevronDown, ChevronUp, Palette, Type, Layout, Code2, Sparkles, Megaphone,
} from 'lucide-react';
import { PaletteSelector, type ColorMode } from './PaletteSelector';

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
  'Raleway', 'Source Sans Pro', 'PT Sans', 'Fira Sans', 'IBM Plex Sans', 'DM Sans',
  'Outfit', 'Plus Jakarta Sans',
  'Merriweather', 'Playfair Display', 'Lora', 'Crimson Text', 'Source Serif Pro',
  'Libre Baskerville', 'Cormorant Garamond',
  'JetBrains Mono', 'Fira Code',
];

interface CssVariables {
  primary_color?: string;
  secondary_color?: string;
  bg_color?: string;
  surface_color?: string;
  text_color?: string;
  text_secondary_color?: string;
  border_color?: string;
  header_bg_color?: string;
  header_text_color?: string;
  footer_bg_color?: string;
  footer_text_color?: string;
  link_color?: string;
  link_hover_color?: string;
  font_family?: string;
  heading_font_family?: string;
}

interface LayoutConfig {
  header_style?: string;
  nav_style?: string;
  sidebar_position?: string;
  sidebar_enabled?: boolean;
  footer_style?: string;
  post_card_style?: string;
  post_card_columns?: number;
  content_max_width?: string;
  show_featured_image?: boolean;
  show_author?: boolean;
  show_date?: boolean;
  show_excerpt?: boolean;
  /** Raw HTML or [shortcode] rendered at the top full-width ad slot.
   *  Empty / undefined → slot is hidden on the public site. */
  ad_top_code?: string;
  /** Raw HTML or [shortcode] rendered at the mid full-width ad slot. */
  ad_mid_code?: string;
}

interface CustomOverrides {
  css_variables?: CssVariables;
  layout_config?: LayoutConfig;
  custom_css?: string;
  palette_slug?: string;
  color_mode?: ColorMode;
}

interface ThemeData {
  // themes.id is TEXT primary key in D1 (e.g. "theme-publisher"),
  // never a number — the previous number typing silently broke the
  // active-theme check used to hydrate overrides.
  id: string;
  name: string;
  slug: string;
  colors?: Record<string, string>;
  layout_config?: Record<string, any>;
  custom_overrides?: CustomOverrides;
}

// ── Color Field ──────────────────────────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded border cursor-pointer flex-shrink-0"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 h-9 text-xs font-mono"
        />
      </div>
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        type="button"
        className="flex items-center justify-between w-full px-6 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4" />
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-6">{children}</CardContent>}
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ThemeCustomizer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useAuthStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeData | null>(null);

  // Editable overrides state
  const [cssVars, setCssVars] = useState<CssVariables>({});
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({});
  const [customCss, setCustomCss] = useState('');
  // Palette selection (only used when the theme declares palette_variants —
  // currently: Publisher). Default palette is 'lavender'.
  const [paletteSlug, setPaletteSlug] = useState<string>('lavender');
  const [colorMode, setColorMode] = useState<ColorMode>('light');

  // Only themes that declare palette_variants get the palette selector.
  // Currently this is the Publisher theme. We identify it by slug so the
  // admin does not need to know about palette_variants server-side.
  const themeSupportsPalettes = theme?.slug === 'publisher';

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadTheme();
  }, [id]);

  const loadTheme = async () => {
    setLoading(true);
    try {
      const [themeRes, activeRes] = await Promise.all([
        api.request<any>(`/themes/${id}`),
        api.request<any>('/themes/active'),
      ]);

      if (themeRes.success && themeRes.data) {
        // Parse css_variables JSON into a flat colors map so getColor()
        // can resolve placeholders without reaching into the raw string.
        const row = themeRes.data;
        let parsedColors: Record<string, string> | undefined;
        if (typeof row.css_variables === 'string') {
          try { parsedColors = JSON.parse(row.css_variables); } catch {}
        } else if (row.css_variables && typeof row.css_variables === 'object') {
          parsedColors = row.css_variables;
        }
        setTheme({ ...row, colors: parsedColors || row.colors });
      }

      // GET /themes/active returns { theme: { id, ... }, overrides: {...} }.
      // The old code read `data.id` (undefined) and `data.custom_overrides`
      // (also undefined), so saved overrides were never hydrated on refresh.
      // Result: palette / color mode / ad code state appeared to "reset"
      // every time the customizer page reloaded. Fixed here by reading
      // the wrapped shape and comparing IDs as strings.
      let activeOverrides: CustomOverrides | null = null;
      if (
        activeRes.success &&
        activeRes.data?.theme?.id &&
        String(activeRes.data.theme.id) === String(id)
      ) {
        activeOverrides = (activeRes.data.overrides || null) as CustomOverrides | null;
      }

      const overrides: CustomOverrides = activeOverrides || {};

      setCssVars(overrides.css_variables || {});
      setLayoutConfig(overrides.layout_config || {});
      setCustomCss(overrides.custom_css || '');
      if (typeof overrides.palette_slug === 'string') {
        setPaletteSlug(overrides.palette_slug);
      }
      if (overrides.color_mode === 'dark' || overrides.color_mode === 'light') {
        setColorMode(overrides.color_mode);
      }
    } catch {
      toast(lang === 'tr' ? 'Tema yüklenemedi' : 'Failed to load theme', 'error');
    }
    setLoading(false);
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const overrides: CustomOverrides = {
        css_variables: cssVars,
        layout_config: layoutConfig,
        custom_css: customCss,
      };
      // Only include palette fields when the theme actually supports them,
      // so we don't pollute custom_overrides for themes that ignore them.
      if (themeSupportsPalettes) {
        overrides.palette_slug = paletteSlug;
        overrides.color_mode = colorMode;
      }
      const body = { custom_overrides: overrides };
      const res = await api.request<any>(`/themes/${id}/overrides`, {
        method: 'PUT',
        body,
      });
      if (res.success) {
        toast(lang === 'tr' ? 'Özelleştirmeler kaydedildi' : 'Customizations saved', 'success');
      } else {
        toast(res.error || (lang === 'tr' ? 'Kaydetme başarısız' : 'Failed to save'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Failed to save', 'error');
    }
    setSaving(false);
  };

  // ── Reset ────────────────────────────────────────────────────────────────

  const handleReset = async () => {
    if (!confirm(lang === 'tr' ? 'Tüm özelleştirmeleri sıfırlamak istiyor musunuz?' : 'Reset all customizations to defaults?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await api.request<any>(`/themes/${id}/overrides`, {
        method: 'PUT',
        body: { custom_overrides: {} },
      });
      if (res.success) {
        setCssVars({});
        setLayoutConfig({});
        setCustomCss('');
        setPaletteSlug('lavender');
        setColorMode('light');
        toast(lang === 'tr' ? 'Özelleştirmeler sıfırlandı' : 'Customizations reset', 'success');
      }
    } catch {
      toast(lang === 'tr' ? 'Sıfırlama başarısız' : 'Failed to reset', 'error');
    }
    setSaving(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const updateCssVar = (key: keyof CssVariables, value: string) => {
    setCssVars((prev) => ({ ...prev, [key]: value }));
  };

  const updateLayout = <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => {
    setLayoutConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Resolve a color: override -> theme base -> fallback
  const getColor = (key: keyof CssVariables, fallback: string): string => {
    return cssVars[key] || (theme?.colors as any)?.[key] || fallback;
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/themes')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {lang === 'tr' ? 'Temalara Dön' : 'Back to Themes'}
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {lang === 'tr' ? 'Tema bulunamadı' : 'Theme not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/themes')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {lang === 'tr' ? 'Temalara Dön' : 'Back to Themes'}
          </Button>
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            <h1 className="text-xl font-bold">
              {lang === 'tr' ? 'Tema:' : 'Theme:'} {theme.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            {t('reset', lang)}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('save', lang)}
          </Button>
        </div>
      </div>

      {/* ── Palette (Publisher-only) ─────────────────────────────────────── */}
      {themeSupportsPalettes && (
        <Section
          title={lang === 'tr' ? 'Renk Paleti ve Mod' : 'Palette & Mode'}
          icon={Sparkles}
          defaultOpen={true}
        >
          <PaletteSelector
            selectedPalette={paletteSlug}
            colorMode={colorMode}
            onPaletteChange={setPaletteSlug}
            onModeChange={setColorMode}
            lang={lang as 'tr' | 'en'}
          />
        </Section>
      )}

      {/* ── Colors ──────────────────────────────────────────────────────── */}
      <Section title={lang === 'tr' ? 'Renkler' : 'Colors'} icon={Palette}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ColorField label={lang === 'tr' ? 'Ana Renk' : 'Primary'} value={getColor('primary_color', '#2563eb')} onChange={(v) => updateCssVar('primary_color', v)} />
          <ColorField label={lang === 'tr' ? 'İkincil Renk' : 'Secondary'} value={getColor('secondary_color', '#10b981')} onChange={(v) => updateCssVar('secondary_color', v)} />
          <ColorField label={lang === 'tr' ? 'Arka Plan' : 'Background'} value={getColor('bg_color', '#f8fafc')} onChange={(v) => updateCssVar('bg_color', v)} />
          <ColorField label={lang === 'tr' ? 'Yüzey' : 'Surface'} value={getColor('surface_color', '#ffffff')} onChange={(v) => updateCssVar('surface_color', v)} />
          <ColorField label={lang === 'tr' ? 'Metin' : 'Text'} value={getColor('text_color', '#1e293b')} onChange={(v) => updateCssVar('text_color', v)} />
          <ColorField label={lang === 'tr' ? 'İkincil Metin' : 'Text Secondary'} value={getColor('text_secondary_color', '#64748b')} onChange={(v) => updateCssVar('text_secondary_color', v)} />
          <ColorField label={lang === 'tr' ? 'Kenarlık' : 'Border'} value={getColor('border_color', '#e2e8f0')} onChange={(v) => updateCssVar('border_color', v)} />
          <ColorField label={lang === 'tr' ? 'Bağlantı' : 'Link'} value={getColor('link_color', '#2563eb')} onChange={(v) => updateCssVar('link_color', v)} />
          <ColorField label={lang === 'tr' ? 'Bağlantı Hover' : 'Link Hover'} value={getColor('link_hover_color', '#1d4ed8')} onChange={(v) => updateCssVar('link_hover_color', v)} />
        </div>
      </Section>

      {/* ── Header & Footer Colors ──────────────────────────────────────── */}
      <Section title={lang === 'tr' ? 'Üstbilgi ve Altbilgi' : 'Header & Footer'} icon={Layout} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ColorField label={lang === 'tr' ? 'Üstbilgi Arka Plan' : 'Header BG'} value={getColor('header_bg_color', '#ffffff')} onChange={(v) => updateCssVar('header_bg_color', v)} />
          <ColorField label={lang === 'tr' ? 'Üstbilgi Metin' : 'Header Text'} value={getColor('header_text_color', '#0f172a')} onChange={(v) => updateCssVar('header_text_color', v)} />
          <ColorField label={lang === 'tr' ? 'Altbilgi Arka Plan' : 'Footer BG'} value={getColor('footer_bg_color', '#0f172a')} onChange={(v) => updateCssVar('footer_bg_color', v)} />
          <ColorField label={lang === 'tr' ? 'Altbilgi Metin' : 'Footer Text'} value={getColor('footer_text_color', '#94a3b8')} onChange={(v) => updateCssVar('footer_text_color', v)} />
        </div>
      </Section>

      {/* ── Typography ──────────────────────────────────────────────────── */}
      <Section title={lang === 'tr' ? 'Tipografi' : 'Typography'} icon={Type} defaultOpen={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{lang === 'tr' ? 'Gövde Yazı Tipi' : 'Body Font'}</Label>
            <Select value={cssVars.font_family || ''} onValueChange={(v) => updateCssVar('font_family', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={theme.colors?.font_family || 'Inter'} />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{lang === 'tr' ? 'Başlık Yazı Tipi' : 'Heading Font'}</Label>
            <Select value={cssVars.heading_font_family || ''} onValueChange={(v) => updateCssVar('heading_font_family', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={theme.colors?.heading_font_family || 'Inter'} />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* ── Layout Options ──────────────────────────────────────────────── */}
      <Section title={lang === 'tr' ? 'Yerleşim Seçenekleri' : 'Layout Options'} icon={Layout} defaultOpen={false}>
        <div className="space-y-6">
          {/* Selects row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Header Style */}
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'tr' ? 'Üstbilgi Stili' : 'Header Style'}</Label>
              <Select value={layoutConfig.header_style || ''} onValueChange={(v) => updateLayout('header_style', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="centered">Centered</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nav Style */}
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'tr' ? 'Navigasyon Stili' : 'Nav Style'}</Label>
              <Select value={layoutConfig.nav_style || ''} onValueChange={(v) => updateLayout('nav_style', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="gooey">Gooey</SelectItem>
                  <SelectItem value="flowing">Flowing</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sidebar */}
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'tr' ? 'Kenar Çubuğu' : 'Sidebar'}</Label>
              <Select value={layoutConfig.sidebar_position || ''} onValueChange={(v) => {
                updateLayout('sidebar_position', v);
                updateLayout('sidebar_enabled', v !== 'none');
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="right" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">{lang === 'tr' ? 'Sol' : 'Left'}</SelectItem>
                  <SelectItem value="right">{lang === 'tr' ? 'Sağ' : 'Right'}</SelectItem>
                  <SelectItem value="none">{lang === 'tr' ? 'Yok' : 'None'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Footer Style */}
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'tr' ? 'Altbilgi Stili' : 'Footer Style'}</Label>
              <Select value={layoutConfig.footer_style || ''} onValueChange={(v) => updateLayout('footer_style', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="three-column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="three-column">Three Column</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Post Card Style */}
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'tr' ? 'Kart Stili' : 'Post Card Style'}</Label>
              <Select value={layoutConfig.post_card_style || ''} onValueChange={(v) => updateLayout('post_card_style', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="card" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Post Card Columns */}
            <div className="space-y-1.5">
              <Label className="text-xs">{lang === 'tr' ? 'Kart Sütunları' : 'Post Card Columns'}</Label>
              <Select
                value={layoutConfig.post_card_columns != null ? String(layoutConfig.post_card_columns) : ''}
                onValueChange={(v) => updateLayout('post_card_columns', Number(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="2" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Max Width */}
          <div className="max-w-xs space-y-1.5">
            <Label className="text-xs">{lang === 'tr' ? 'Maks. İçerik Genişliği' : 'Content Max Width'}</Label>
            <Input
              value={layoutConfig.content_max_width || ''}
              onChange={(e) => updateLayout('content_max_width', e.target.value)}
              placeholder="1200px"
              className="h-9 text-sm"
            />
          </div>

          {/* Boolean toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['show_featured_image', lang === 'tr' ? 'Öne Çıkan Görseli Göster' : 'Show Featured Image'],
              ['show_author', lang === 'tr' ? 'Yazarı Göster' : 'Show Author'],
              ['show_date', lang === 'tr' ? 'Tarihi Göster' : 'Show Date'],
              ['show_excerpt', lang === 'tr' ? 'Özeti Göster' : 'Show Excerpt'],
            ] as [keyof LayoutConfig, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <Label className="text-sm cursor-pointer" htmlFor={key}>{label}</Label>
                <Switch
                  id={key}
                  checked={layoutConfig[key] !== false}
                  onCheckedChange={(checked) => updateLayout(key, checked as any)}
                />
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Ad Areas ────────────────────────────────────────────────────── */}
      <Section
        title={lang === 'tr' ? 'Reklam Alanları' : 'Ad Areas'}
        icon={Megaphone}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {lang === 'tr'
              ? 'HTML kodu veya [kısa-kod] girebilirsiniz. Boş bırakılırsa bu reklam alanı sitede gizlenir.'
              : 'Paste HTML or use a [shortcode]. If left empty, the slot is hidden on the public site.'}
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {lang === 'tr' ? 'Üst Reklam Alanı (Header üstü, tam sıra)' : 'Top Ad Slot (Above header, full width)'}
            </Label>
            <Textarea
              value={layoutConfig.ad_top_code || ''}
              onChange={(e) => updateLayout('ad_top_code', e.target.value)}
              placeholder={lang === 'tr'
                ? '<script async src="..."></script> veya [reklam-header]'
                : '<script async src="..."></script> or [ad-header]'}
              rows={6}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {lang === 'tr' ? 'Orta Reklam Alanı (İçerik ile footer arası)' : 'Mid Ad Slot (Between content and footer)'}
            </Label>
            <Textarea
              value={layoutConfig.ad_mid_code || ''}
              onChange={(e) => updateLayout('ad_mid_code', e.target.value)}
              placeholder={lang === 'tr'
                ? '<ins class="adsbygoogle" ...></ins> veya [reklam-icerik]'
                : '<ins class="adsbygoogle" ...></ins> or [ad-content]'}
              rows={6}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </Section>

      {/* ── Custom CSS ──────────────────────────────────────────────────── */}
      <Section title={lang === 'tr' ? 'Özel CSS' : 'Custom CSS'} icon={Code2} defaultOpen={false}>
        <Textarea
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          placeholder={lang === 'tr' ? '/* Özel CSS kurallarınızı buraya yazın */' : '/* Add your custom CSS rules here */'}
          rows={10}
          className="font-mono text-sm"
        />
      </Section>
    </div>
  );
}
