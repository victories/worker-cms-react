import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useSiteStore } from '@/stores/siteStore';
import { useToast } from '@ui/toast-notification';
import { Button } from '@ui/button';
import { Skeleton } from '@ui/skeleton';
import { Save, RotateCcw, Sun, Moon, Loader2 } from 'lucide-react';
import { HslColorPicker } from '@/components/design/HslColorPicker';
import { TokenSection } from '@/components/design/TokenSection';
import { PresetGrid, type PresetEntry } from '@/components/design/PresetGrid';
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

const TOKEN_GROUPS: { title: string; description?: string; tokens: string[] }[] = [
  {
    title: 'Background & Surface',
    description: 'Sayfa zemini, kart ve popover arka planları.',
    tokens: ['--background', '--foreground', '--card', '--card-foreground', '--popover', '--popover-foreground'],
  },
  {
    title: 'Brand Colors',
    description: 'Birincil + ikincil + accent vurgu renkleri.',
    tokens: [
      '--primary', '--primary-foreground',
      '--secondary', '--secondary-foreground',
      '--accent', '--accent-foreground',
    ],
  },
  {
    title: 'Status & Muted',
    description: 'Hata renkleri ve devre dışı / pasif yüzeyler.',
    tokens: ['--destructive', '--destructive-foreground', '--muted', '--muted-foreground'],
  },
  {
    title: 'Borders & Focus',
    description: 'Çerçeve, input ve focus halkası.',
    tokens: ['--border', '--input', '--ring'],
  },
];

function previewSiteUrl(activeSite: any): string {
  const primary = activeSite?.domains?.find((d: any) => d.is_primary)?.domain;
  const fallback = activeSite?.domains?.[0]?.domain;
  const host = primary || fallback;
  if (host) return `https://${host}/`;
  // Local dev fallback — same origin as admin
  if (typeof window !== 'undefined') return window.location.origin + '/';
  return '/';
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

  // Initial load: design + presets in parallel.
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
    setTokens({
      ...tokens,
      [mode]: { ...tokens[mode], [key]: value },
    });
  }

  function setFont(slot: 'sans' | 'heading' | 'mono', font: string) {
    if (!tokens) return;
    // Update the family AND keep google_fonts in sync (one specifier per slot).
    const familyKey = font.trim();
    const next = { ...tokens.fonts, [slot]: familyKey };
    const otherFamilies = Object.values(next).filter((f) => f && f !== familyKey);
    const allFamilies = [familyKey, ...otherFamilies].filter(Boolean);
    const google = allFamilies
      .filter((f, i, arr) => arr.indexOf(f) === i)
      .map((f) => `${f}:400,500,600,700`);
    setTokens({ ...tokens, fonts: next, google_fonts: google });
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
  const currentTokens = tokens?.[mode] ?? {};

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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t('design.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('design.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={resetToPreset} disabled={saving}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t('design.reset')}
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
            {t('design.save')}
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* Left: presets */}
        <div className="col-span-3 overflow-y-auto border-r border-border bg-muted/20 p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            {t('design.presets')}
          </h2>
          <PresetGrid presets={presets} activeSlug={presetSlug} onPick={applyPreset} />
        </div>

        {/* Middle: token editor */}
        <div className="col-span-4 overflow-y-auto border-r border-border p-3">
          <div className="mb-3 flex items-center gap-1 rounded border border-border p-1">
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
            {TOKEN_GROUPS.map((group) => (
              <TokenSection key={group.title} title={group.title} description={group.description}>
                {group.tokens.map((tk) => (
                  <HslColorPicker
                    key={tk}
                    tokenName={tk.replace(/^--/, '')}
                    value={currentTokens[tk] ?? ''}
                    onChange={(v) => setColorToken(tk, v)}
                  />
                ))}
              </TokenSection>
            ))}

            <TokenSection title={t('design.typography')} description={t('design.typography_hint')}>
              <GoogleFontPicker
                label={t('design.font_sans')}
                value={tokens.fonts.sans}
                options={POPULAR_FONTS.sans}
                onChange={(f) => setFont('sans', f)}
              />
              <GoogleFontPicker
                label={t('design.font_heading')}
                value={tokens.fonts.heading}
                options={POPULAR_FONTS.heading}
                onChange={(f) => setFont('heading', f)}
              />
              <GoogleFontPicker
                label={t('design.font_mono')}
                value={tokens.fonts.mono}
                options={POPULAR_FONTS.mono}
                onChange={(f) => setFont('mono', f)}
              />
            </TokenSection>

            <TokenSection title={t('design.radius')} description={t('design.radius_hint')}>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={parseFloat((tokens.light['--radius'] ?? '0.5rem').replace('rem', '')) || 0.5}
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
            </TokenSection>
          </div>
        </div>

        {/* Right: preview */}
        <div className="col-span-5 overflow-hidden">
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
