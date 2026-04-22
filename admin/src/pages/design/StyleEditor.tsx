import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useSiteStore } from '@/stores/siteStore';
import { useToast } from '@ui/toast-notification';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import { Save, RotateCcw, Sun, Moon, Loader2, Shuffle } from 'lucide-react';
import { HslColorPicker } from '@/components/design/HslColorPicker';
import { SidebarRow } from '@/components/design/SidebarRow';
import { PresetGrid, type PresetEntry } from '@/components/design/PresetGrid';
import { StylePresetGrid } from '@/components/design/StylePresetGrid';
import { STYLE_PRESETS, type StylePreset } from '@/components/design/style-presets';
import { GoogleFontPicker, POPULAR_FONTS } from '@/components/design/GoogleFontPicker';
import { PreviewFrame, type PreviewDevice } from '@/components/design/PreviewFrame';

type CssVars = Record<string, string>;

interface StyleTokens {
  light: CssVars;
  dark: CssVars;
  fonts: { sans: string; heading: string; mono: string };
  google_fonts: string[];
}

interface ActiveDesign {
  styleTokens: StyleTokens;
  layoutConfig: any;
  customCss: string;
  presetSlug: string | null;
  updatedAt: string;
  isDefault: boolean;
}

type SectionKey = 'style' | 'base' | 'accent' | 'status' | 'borders' | 'heading' | 'body' | 'radius';

// Which tokens live under each expandable section.
const BASE_TOKENS = ['--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground'];
const ACCENT_TOKENS = ['--primary', '--primary-foreground', '--secondary', '--secondary-foreground', '--accent', '--accent-foreground'];
const STATUS_TOKENS = ['--destructive', '--destructive-foreground', '--muted', '--muted-foreground'];
const BORDER_TOKENS = ['--border', '--input', '--ring'];

function previewSiteUrl(activeSite: any): string {
  const primary = activeSite?.domains?.find((d: any) => d.is_primary)?.domain;
  const fallback = activeSite?.domains?.[0]?.domain;
  const host = primary || fallback;
  if (host) return `https://${host}/`;
  if (typeof window !== 'undefined') return window.location.origin + '/';
  return '/';
}

/** Tiny color swatch used as the row indicator. */
function ColorDot({ hsl, className = 'h-4 w-4' }: { hsl: string | undefined; className?: string }) {
  return (
    <span
      className={`rounded-full border border-border ${className}`}
      style={{ background: hsl ? `hsl(${hsl})` : 'transparent' }}
    />
  );
}

export function StyleEditor() {
  const { activeSite } = useSiteStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState<StyleTokens | null>(null);
  const [original, setOriginal] = useState<StyleTokens | null>(null);
  const [presetSlug, setPresetSlug] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [defaultPreset, setDefaultPreset] = useState<string>('neutral');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);

  useEffect(() => {
    if (!activeSite) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getDesign(), api.getDesignPresets()])
      .then(([designRes, presetsRes]: any) => {
        if (cancelled) return;
        const design: ActiveDesign = designRes.data;
        setTokens(design.styleTokens);
        setOriginal(design.styleTokens);
        setPresetSlug(design.presetSlug);
        setPresets(presetsRes.data.presets);
        setDefaultPreset(presetsRes.data.default);
      })
      .catch((e) => {
        toast(`${t('design.load_failed')}: ${String(e)}`, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSite?.id]);

  const dirty = useMemo(() => {
    if (!tokens || !original) return false;
    return JSON.stringify(tokens) !== JSON.stringify(original);
  }, [tokens, original]);

  const activePreset = useMemo(
    () => presets.find((p) => p.slug === presetSlug) ?? null,
    [presets, presetSlug],
  );

  // Which Style bundle (Nova / Mono / Editorial / …) matches the
  // current tokens? Derived — we don't persist the style slug, so a
  // user who hand-tweaks fonts after picking Nova sees the row
  // reflect that the bundle is "mixed" (null) instead of stuck on Nova.
  const activeStyleSlug = useMemo(() => {
    if (!tokens || !presetSlug) return null;
    const match = STYLE_PRESETS.find(
      (s) =>
        s.paletteSlug === presetSlug &&
        (tokens.light['--radius'] ?? '0.5rem') === s.radius &&
        tokens.fonts.sans === s.fonts.sans &&
        tokens.fonts.heading === s.fonts.heading &&
        tokens.fonts.mono === s.fonts.mono,
    );
    return match?.slug ?? null;
  }, [tokens, presetSlug]);

  function applyStylePreset(style: StylePreset, palette: PresetEntry) {
    if (!tokens) return;
    // One-shot apply: palette + radius + fonts — mirrors shadcn's
    // Style picker that swaps everything at once.
    const nextFonts = { ...style.fonts };
    const families = [style.fonts.heading, style.fonts.sans, style.fonts.mono].filter(Boolean);
    const google = families
      .filter((f, i, arr) => arr.indexOf(f) === i)
      .map((f) => `${f}:400,500,600,700`);
    setTokens({
      light: { ...palette.light, '--radius': style.radius },
      dark: { ...palette.dark, '--radius': style.radius },
      fonts: nextFonts,
      google_fonts: google,
    });
    setPresetSlug(palette.slug);
  }

  function applyPreset(p: PresetEntry) {
    if (!tokens) return;
    setTokens({
      light: { ...p.light },
      dark: { ...p.dark },
      fonts: { ...tokens.fonts },
      google_fonts: [...tokens.google_fonts],
    });
    setPresetSlug(p.slug);
  }

  function setColorToken(key: string, value: string) {
    if (!tokens) return;
    setTokens({ ...tokens, [mode]: { ...tokens[mode], [key]: value } });
  }

  function setFont(slot: 'sans' | 'heading' | 'mono', font: string) {
    if (!tokens) return;
    const familyKey = font.trim();
    const next = { ...tokens.fonts, [slot]: familyKey };
    const otherFamilies = Object.values(next).filter((f) => f && f !== familyKey);
    const allFamilies = [familyKey, ...otherFamilies].filter(Boolean);
    const google = allFamilies
      .filter((f, i, arr) => arr.indexOf(f) === i)
      .map((f) => `${f}:400,500,600,700`);
    setTokens({ ...tokens, fonts: next, google_fonts: google });
  }

  function shuffle() {
    if (presets.length === 0) return;
    const pool = presets.filter((p) => p.slug !== presetSlug);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? presets[0];
    applyPreset(pick);
  }

  async function save() {
    if (!tokens) return;
    setSaving(true);
    try {
      const res: any = await api.saveDesign({ styleTokens: tokens, presetSlug });
      setOriginal(res.data.styleTokens);
      toast(t('design.saved'), 'success');
    } catch (e) {
      toast(`${t('design.save_failed')}: ${String(e)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function resetToPreset() {
    if (!confirm(t('design.confirm_reset'))) return;
    setSaving(true);
    try {
      const res: any = await api.resetDesign(presetSlug ?? defaultPreset);
      setTokens(res.data.styleTokens);
      setOriginal(res.data.styleTokens);
      setPresetSlug(res.data.presetSlug);
      toast(t('design.reset_done'), 'success');
    } catch (e) {
      toast(`${t('design.save_failed')}: ${String(e)}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  const siteUrl = activeSite ? previewSiteUrl(activeSite) : '';

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }
  if (!tokens) {
    return <div className="p-6 text-sm text-muted-foreground">{t('design.no_data')}</div>;
  }

  const currentTokens = tokens[mode];
  const radiusRem =
    parseFloat((tokens.light['--radius'] ?? '0.5rem').replace('rem', '')) || 0.5;

  const toggle = (k: SectionKey) => setActiveSection((cur) => (cur === k ? null : k));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('design.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('design.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={shuffle} disabled={saving}>
            <Shuffle className="mr-1 h-3.5 w-3.5" /> Shuffle
          </Button>
          <Button size="sm" variant="outline" onClick={resetToPreset} disabled={saving}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t('design.reset')}
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            {t('design.save')}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/20 p-3">
          {/* Light / Dark toggle */}
          <div className="mb-3 flex items-center gap-1 rounded-md border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setMode('light')}
              className={
                mode === 'light'
                  ? 'flex-1 rounded bg-background px-2 py-1 text-xs font-medium shadow-sm flex items-center justify-center gap-1'
                  : 'flex-1 rounded px-2 py-1 text-xs text-muted-foreground flex items-center justify-center gap-1'
              }
            >
              <Sun className="h-3 w-3" /> Light
            </button>
            <button
              type="button"
              onClick={() => setMode('dark')}
              className={
                mode === 'dark'
                  ? 'flex-1 rounded bg-background px-2 py-1 text-xs font-medium shadow-sm flex items-center justify-center gap-1'
                  : 'flex-1 rounded px-2 py-1 text-xs text-muted-foreground flex items-center justify-center gap-1'
              }
            >
              <Moon className="h-3 w-3" /> Dark
            </button>
          </div>

          <div className="space-y-2">
            <SidebarRow
              label="Stil"
              value={
                activeStyleSlug
                  ? STYLE_PRESETS.find((s) => s.slug === activeStyleSlug)?.name ?? 'Özel'
                  : 'Özel'
              }
              active={activeSection === 'style'}
              indicator={
                activePreset ? (
                  <span className="flex items-center gap-0.5">
                    <ColorDot hsl={activePreset.light['--primary']} className="h-3 w-3" />
                    <ColorDot hsl={activePreset.light['--accent']} className="h-3 w-3" />
                    <ColorDot hsl={activePreset.light['--background']} className="h-3 w-3" />
                  </span>
                ) : null
              }
              onClick={() => toggle('style')}
            />
            {activeSection === 'style' && (
              <div className="space-y-3 rounded-md border border-border bg-background p-2">
                <StylePresetGrid
                  palettes={presets}
                  activeSlug={activeStyleSlug}
                  onPick={applyStylePreset}
                />
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Sadece paleti değiştir
                  </summary>
                  <div className="mt-2">
                    <PresetGrid presets={presets} activeSlug={presetSlug} onPick={applyPreset} />
                  </div>
                </details>
              </div>
            )}

            <SidebarRow
              label="Ana Renk"
              value="Zemin & yüzey"
              active={activeSection === 'base'}
              indicator={<ColorDot hsl={currentTokens['--background']} />}
              onClick={() => toggle('base')}
            />
            {activeSection === 'base' && (
              <SectionBody>
                {BASE_TOKENS.map((tk) => (
                  <HslColorPicker
                    key={tk}
                    tokenName={tk.replace(/^--/, '')}
                    value={currentTokens[tk] ?? ''}
                    onChange={(v) => setColorToken(tk, v)}
                  />
                ))}
              </SectionBody>
            )}

            <SidebarRow
              label="Vurgu"
              value="Birincil + accent"
              active={activeSection === 'accent'}
              indicator={<ColorDot hsl={currentTokens['--primary']} />}
              onClick={() => toggle('accent')}
            />
            {activeSection === 'accent' && (
              <SectionBody>
                {ACCENT_TOKENS.map((tk) => (
                  <HslColorPicker
                    key={tk}
                    tokenName={tk.replace(/^--/, '')}
                    value={currentTokens[tk] ?? ''}
                    onChange={(v) => setColorToken(tk, v)}
                  />
                ))}
              </SectionBody>
            )}

            <SidebarRow
              label="Durum"
              value="Hata & pasif"
              active={activeSection === 'status'}
              indicator={<ColorDot hsl={currentTokens['--destructive']} />}
              onClick={() => toggle('status')}
            />
            {activeSection === 'status' && (
              <SectionBody>
                {STATUS_TOKENS.map((tk) => (
                  <HslColorPicker
                    key={tk}
                    tokenName={tk.replace(/^--/, '')}
                    value={currentTokens[tk] ?? ''}
                    onChange={(v) => setColorToken(tk, v)}
                  />
                ))}
              </SectionBody>
            )}

            <SidebarRow
              label="Çerçeve"
              value="Border & focus"
              active={activeSection === 'borders'}
              indicator={<ColorDot hsl={currentTokens['--border']} />}
              onClick={() => toggle('borders')}
            />
            {activeSection === 'borders' && (
              <SectionBody>
                {BORDER_TOKENS.map((tk) => (
                  <HslColorPicker
                    key={tk}
                    tokenName={tk.replace(/^--/, '')}
                    value={currentTokens[tk] ?? ''}
                    onChange={(v) => setColorToken(tk, v)}
                  />
                ))}
              </SectionBody>
            )}

            <SidebarRow
              label="Başlık"
              value={tokens.fonts.heading || 'Inter'}
              active={activeSection === 'heading'}
              indicator={<span className="text-xs font-semibold">Aa</span>}
              onClick={() => toggle('heading')}
            />
            {activeSection === 'heading' && (
              <SectionBody>
                <GoogleFontPicker
                  label={t('design.font_heading')}
                  value={tokens.fonts.heading}
                  options={POPULAR_FONTS.heading}
                  onChange={(f) => setFont('heading', f)}
                />
              </SectionBody>
            )}

            <SidebarRow
              label="Yazı"
              value={tokens.fonts.sans || 'Inter'}
              active={activeSection === 'body'}
              indicator={<span className="text-xs">Aa</span>}
              onClick={() => toggle('body')}
            />
            {activeSection === 'body' && (
              <SectionBody>
                <GoogleFontPicker
                  label={t('design.font_sans')}
                  value={tokens.fonts.sans}
                  options={POPULAR_FONTS.sans}
                  onChange={(f) => setFont('sans', f)}
                />
                <GoogleFontPicker
                  label={t('design.font_mono')}
                  value={tokens.fonts.mono}
                  options={POPULAR_FONTS.mono}
                  onChange={(f) => setFont('mono', f)}
                />
              </SectionBody>
            )}

            <SidebarRow
              label="Köşe"
              value={`${radiusRem.toFixed(2)}rem`}
              active={activeSection === 'radius'}
              indicator={
                <span
                  className="h-4 w-4 border border-border"
                  style={{ borderRadius: `${radiusRem / 1.5}rem` }}
                />
              }
              onClick={() => toggle('radius')}
            />
            {activeSection === 'radius' && (
              <SectionBody>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={radiusRem}
                  onChange={(e) => {
                    const r = `${e.target.value}rem`;
                    setTokens({
                      ...tokens,
                      light: { ...tokens.light, '--radius': r },
                      dark: { ...tokens.dark, '--radius': r },
                    });
                  }}
                  className="w-full"
                />
                <div className="text-center font-mono text-xs text-muted-foreground">
                  {tokens.light['--radius'] ?? '0.5rem'}
                </div>
              </SectionBody>
            )}
          </div>
        </aside>

        {/* Preview */}
        <div className="flex-1 overflow-hidden">
          {siteUrl ? (
            <PreviewFrame
              siteUrl={siteUrl}
              styleTokens={tokens}
              colorMode={mode}
              device={device}
              onDeviceChange={setDevice}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t('design.no_domain')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-3">
      {children}
    </div>
  );
}
