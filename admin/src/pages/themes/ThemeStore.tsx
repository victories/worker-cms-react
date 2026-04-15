// ThemeStore — the top-level Themes page in the admin. After Faz 6
// there is only one built-in theme (default-publisher) and the page
// is dominated by the palette grid, not theme cards. A user who
// wants deeper tweaks clicks through to ThemeCustomizer.
//
// Wire-level contract: saving a palette writes the full
// SiteThemeOverrides blob (`{ palette, mode, css? }`) back to
// `PUT /api/themes/:id/overrides`, merging with any existing `css`
// overrides so per-token customisations persist through palette
// swaps.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Badge } from '@ui/badge';
import {
  Palette as PaletteIcon, Check, Paintbrush, Loader2, Sparkles,
} from 'lucide-react';
import { useToast } from '@ui/toast-notification';
import { PaletteSelector, DEFAULT_PALETTE_SLUG, type ColorMode } from './PaletteSelector';
import type { CssVars } from '@themes/types';

interface Theme {
  // themes.id is a TEXT primary key in D1 (e.g. "default-publisher").
  id: string;
  slug: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  is_system?: boolean;
}

interface SiteThemeOverridesWire {
  palette?: string;
  mode?: ColorMode;
  css?: CssVars;
}

export function ThemeStore() {
  const { lang } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [activeOverrides, setActiveOverrides] = useState<SiteThemeOverridesWire>({});
  const [loading, setLoading] = useState(true);
  const [savingPalette, setSavingPalette] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [themesRes, activeRes] = await Promise.all([
        api.request<any>('/themes'),
        api.request<any>('/themes/active'),
      ]);
      if (themesRes.success) {
        const list: Theme[] = (themesRes.data || []).map((row: any) => ({
          id: String(row.id),
          slug: row.slug,
          name: row.name,
          description: row.description,
          author: row.author,
          version: row.version,
          is_system: !!row.is_system,
        }));
        setThemes(list);
      }
      if (activeRes.success && activeRes.data?.theme?.id) {
        setActiveThemeId(String(activeRes.data.theme.id));
        setActiveOverrides((activeRes.data.overrides || {}) as SiteThemeOverridesWire);
      } else {
        setActiveThemeId(null);
        setActiveOverrides({});
      }
    } catch {
      toast(lang === 'tr' ? 'Temalar yüklenemedi' : 'Failed to load themes', 'error');
    }
    setLoading(false);
  };

  // ── Palette / mode change (writes through to the active theme) ──────

  const persistOverrides = async (next: SiteThemeOverridesWire) => {
    if (!activeThemeId) return;
    setSavingPalette(true);
    // Optimistic update so the UI reflects the click immediately.
    setActiveOverrides(next);
    try {
      const res = await api.request<any>(`/themes/${activeThemeId}/overrides`, {
        method: 'PUT',
        body: { custom_overrides: next },
      });
      if (!res.success) {
        toast(res.error || (lang === 'tr' ? 'Kaydetme başarısız' : 'Failed to save'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Failed to save', 'error');
    }
    setSavingPalette(false);
  };

  const handlePaletteChange = (slug: string) => {
    persistOverrides({ ...activeOverrides, palette: slug });
  };

  const handleModeChange = (mode: ColorMode) => {
    persistOverrides({ ...activeOverrides, mode });
  };

  // ── Rendering ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTheme = themes.find((th) => th.id === activeThemeId) ?? themes[0];
  const selectedPalette =
    (activeOverrides.palette && activeOverrides.palette.length > 0)
      ? activeOverrides.palette
      : DEFAULT_PALETTE_SLUG;
  const colorMode: ColorMode = activeOverrides.mode === 'dark' ? 'dark' : 'light';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PaletteIcon className="h-6 w-6" />
            {t('themes', lang)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {lang === 'tr'
              ? 'Tek built-in tema üzerinde renk paleti ve moduyla oynayın.'
              : 'Tune your site by picking a palette and mode on the single built-in theme.'}
          </p>
        </div>
      </div>

      {/* No themes at all (shouldn't happen after seed, but guard anyway) */}
      {!activeTheme ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PaletteIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {lang === 'tr' ? 'Henüz tema yok' : 'No themes available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active theme hero card */}
          <Card className="border">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold truncate">{activeTheme.name}</h2>
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" />
                    {t('active', lang)}
                  </Badge>
                  {activeTheme.is_system && (
                    <Badge variant="outline" className="text-[10px]">
                      {lang === 'tr' ? 'Sistem' : 'System'}
                    </Badge>
                  )}
                  {activeTheme.version && (
                    <Badge variant="secondary" className="text-[10px]">v{activeTheme.version}</Badge>
                  )}
                </div>
                {activeTheme.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {activeTheme.description}
                  </p>
                )}
                {activeTheme.author && (
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Yazar' : 'Author'}: {activeTheme.author}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/themes/${activeTheme.id}/customize`)}
                className="gap-1.5 shrink-0"
              >
                <Paintbrush className="h-4 w-4" />
                {t('customize', lang)}
              </Button>
            </CardContent>
          </Card>

          {/* Palette picker section */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-semibold">
                  {lang === 'tr' ? 'Renk Paleti' : 'Choose Palette'}
                </h3>
                {savingPalette && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              <PaletteSelector
                selectedPalette={selectedPalette}
                colorMode={colorMode}
                onPaletteChange={handlePaletteChange}
                onModeChange={handleModeChange}
                lang={lang as 'tr' | 'en'}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
