// ThemeCustomizer — per-site theme fine-tuning. After Faz 6 the shape of
// `site_themes.custom_overrides` is the server-side `SiteThemeOverrides`
// type exactly:
//
//   { palette?: string, mode?: 'light' | 'dark', css?: CssVars }
//
// where `css` is a map of shadcn HSL tokens keyed by full name
// (`--primary`, `--background`, ...). Legacy override keys from the
// Faz 5 build (`css_variables`, `layout_config`, `custom_css`,
// `palette_slug`, `color_mode`) are no longer written — the server
// ignores them in buildActiveTheme and Faz 8 will wipe the remaining
// admin types.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { useToast } from '@ui/toast-notification';
import {
  Paintbrush, ArrowLeft, Save, RotateCcw, Loader2,
  ChevronDown, ChevronUp, Palette, Sparkles,
} from 'lucide-react';
import { PaletteSelector, DEFAULT_PALETTE_SLUG, type ColorMode } from './PaletteSelector';
import { PALETTES } from '@themes/palettes';
import type { CssVars } from '@themes/types';
import { formatHsl, hexToHsl, hslToHex, parseHsl } from './color-utils';

// ── Types ────────────────────────────────────────────────────────────────

interface SiteThemeOverridesWire {
  palette?: string;
  mode?: ColorMode;
  css?: CssVars;
}

interface ThemeData {
  // themes.id is TEXT primary key in D1 (e.g. "default-publisher"),
  // never a number.
  id: string;
  name: string;
  slug: string;
  /** Raw theme base tokens (parsed from the `css_variables` JSON column). */
  baseCss: CssVars;
}

// The 8 shadcn tokens surfaced in the admin color editor, in the order
// declared by the plan (Faz 6 §2). Each token appears once with a
// localized label and sensible hex fallback used only if the palette
// lookup fails.
interface ShadcnTokenSpec {
  key: string;
  labelEn: string;
  labelTr: string;
}

const SHADCN_TOKENS: ShadcnTokenSpec[] = [
  { key: '--primary',     labelEn: 'Primary',     labelTr: 'Ana Renk' },
  { key: '--secondary',   labelEn: 'Secondary',   labelTr: 'İkincil' },
  { key: '--background',  labelEn: 'Background',  labelTr: 'Arka Plan' },
  { key: '--foreground',  labelEn: 'Foreground',  labelTr: 'Ön Plan' },
  { key: '--muted',       labelEn: 'Muted',       labelTr: 'Silik' },
  { key: '--accent',      labelEn: 'Accent',      labelTr: 'Aksan' },
  { key: '--border',      labelEn: 'Border',      labelTr: 'Kenarlık' },
  { key: '--destructive', labelEn: 'Destructive', labelTr: 'Uyarı' },
];

// ── Collapsible Section ──────────────────────────────────────────────────

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
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-6">{children}</CardContent>}
    </Card>
  );
}

// ── Token field (HSL-aware color picker) ─────────────────────────────────
//
// The underlying value is a bare HSL triple string (`"221 83% 53%"`)
// because that is what shadcn/Tailwind expects to interpolate into
// `hsl(var(--primary))`. The `<input type="color">` on the other hand
// only speaks hex, so we convert on the edge. The text input accepts
// HSL triples directly for power users who want to paste values from
// the shadcn themes generator.

function TokenField({
  label,
  value,
  onChange,
  onClear,
  isOverridden,
}: {
  label: string;
  value: string;
  onChange: (hslTriple: string) => void;
  onClear: () => void;
  isOverridden: boolean;
}) {
  const parsed = useMemo(() => parseHsl(value), [value]);
  const hex = parsed ? hslToHex(parsed) : '#000000';

  const handleHexChange = (nextHex: string) => {
    const next = hexToHsl(nextHex);
    if (next) onChange(formatHsl(next));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {isOverridden && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
            title="Reset to theme default"
          >
            reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => handleHexChange(e.target.value)}
          className="w-9 h-9 rounded border cursor-pointer flex-shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="221 83% 53%"
          className="flex-1 h-9 text-xs font-mono"
        />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export function ThemeCustomizer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useAuthStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeData | null>(null);

  // Editable overrides state — shape matches SiteThemeOverrides exactly.
  const [paletteSlug, setPaletteSlug] = useState<string>(DEFAULT_PALETTE_SLUG);
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [cssOverrides, setCssOverrides] = useState<CssVars>({});

  // Only the built-in publisher theme declares palette variants in its
  // manifest. Identify it by slug so the admin does not need to parse
  // `layout_config` JSON just to decide whether to render the selector.
  const themeSupportsPalettes = theme?.slug === 'default-publisher';

  // ── Load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTheme = async () => {
    setLoading(true);
    try {
      const [themeRes, activeRes] = await Promise.all([
        api.request<any>(`/themes/${id}`),
        api.request<any>('/themes/active'),
      ]);

      if (themeRes.success && themeRes.data) {
        const row = themeRes.data;
        let baseCss: CssVars = {};
        if (typeof row.css_variables === 'string') {
          try { baseCss = JSON.parse(row.css_variables); } catch { baseCss = {}; }
        } else if (row.css_variables && typeof row.css_variables === 'object') {
          baseCss = row.css_variables as CssVars;
        }
        setTheme({
          id: String(row.id),
          name: row.name,
          slug: row.slug,
          baseCss,
        });
      }

      // GET /themes/active returns { theme, overrides }. Hydrate only
      // when the active theme matches the one we're editing — otherwise
      // we keep the defaults so a freshly opened unrelated theme never
      // shows another site's overrides.
      let overrides: SiteThemeOverridesWire = {};
      if (
        activeRes.success &&
        activeRes.data?.theme?.id &&
        String(activeRes.data.theme.id) === String(id)
      ) {
        overrides = (activeRes.data.overrides || {}) as SiteThemeOverridesWire;
      }

      setPaletteSlug(
        typeof overrides.palette === 'string' && PALETTES[overrides.palette]
          ? overrides.palette
          : DEFAULT_PALETTE_SLUG
      );
      setColorMode(overrides.mode === 'dark' ? 'dark' : 'light');
      setCssOverrides(overrides.css ?? {});
    } catch {
      toast(lang === 'tr' ? 'Tema yüklenemedi' : 'Failed to load theme', 'error');
    }
    setLoading(false);
  };

  // ── Save ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build overrides payload in SiteThemeOverrides shape. Only emit
      // the keys that actually carry a value — empty `css` or non-
      // customised palette/mode are omitted so the DB stays tidy.
      const overrides: SiteThemeOverridesWire = {};
      if (themeSupportsPalettes) {
        overrides.palette = paletteSlug;
        overrides.mode = colorMode;
      }
      const trimmedCss: CssVars = {};
      for (const [key, value] of Object.entries(cssOverrides)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          trimmedCss[key] = value.trim();
        }
      }
      if (Object.keys(trimmedCss).length > 0) {
        overrides.css = trimmedCss;
      }

      const res = await api.request<any>(`/themes/${id}/overrides`, {
        method: 'PUT',
        body: { custom_overrides: overrides },
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

  // ── Reset ────────────────────────────────────────────────────────────

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
        setPaletteSlug(DEFAULT_PALETTE_SLUG);
        setColorMode('light');
        setCssOverrides({});
        toast(lang === 'tr' ? 'Özelleştirmeler sıfırlandı' : 'Customizations reset', 'success');
      }
    } catch {
      toast(lang === 'tr' ? 'Sıfırlama başarısız' : 'Failed to reset', 'error');
    }
    setSaving(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────────

  const setToken = (key: string, value: string) => {
    setCssOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const clearToken = (key: string) => {
    setCssOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Resolve the value shown in a token field: user override > palette
  // value for the active mode > theme base css > empty string.
  const resolveTokenValue = (key: string): string => {
    if (cssOverrides[key]) return cssOverrides[key]!;
    if (themeSupportsPalettes) {
      const pal = PALETTES[paletteSlug];
      if (pal) {
        const layer = colorMode === 'dark' ? pal.dark : pal.light;
        if (layer[key]) return layer[key]!;
      }
    }
    return theme?.baseCss[key] ?? '';
  };

  // ── Loading state ────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────

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

      {/* ── Palette (palette-aware themes only) ─────────────────────── */}
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

      {/* ── Token overrides ─────────────────────────────────────────── */}
      <Section
        title={lang === 'tr' ? 'Token Özelleştirme' : 'Token Overrides'}
        icon={Palette}
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground mb-4">
          {lang === 'tr'
            ? 'Seçili palette üzerine ince ayar yapın. Boş bırakılan alanlar palette varsayılanını kullanır.'
            : 'Fine-tune individual tokens on top of the selected palette. Empty fields fall back to the palette default.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SHADCN_TOKENS.map(({ key, labelEn, labelTr }) => (
            <TokenField
              key={key}
              label={lang === 'tr' ? labelTr : labelEn}
              value={resolveTokenValue(key)}
              onChange={(v) => setToken(key, v)}
              onClear={() => clearToken(key)}
              isOverridden={Boolean(cssOverrides[key])}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
