import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent } from '@ui/card';
import { Badge } from '@ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import { Palette, Check, Paintbrush, Copy, Trash2, MoreVertical, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

interface Theme {
  // themes.id is a TEXT primary key in D1 (e.g. "theme-publisher"),
  // so we type it as string. Previous number typing silently broke
  // the active-theme highlight on the Themes page.
  id: string;
  slug: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  is_system?: boolean;
  colors?: {
    primary?: string;
    secondary?: string;
    bg?: string;
    surface?: string;
    header_bg?: string;
    accent?: string;
    text?: string;
  };
}

// Minimal mini-layout preview that uses the theme's actual CSS variable
// values. Replaces the previous generic blue→indigo→navy gradient that
// looked identical for every theme (because theme.colors was always
// undefined — the API returns css_variables as a JSON string and the
// frontend never parsed it).
function ThemeColorPreview({ colors }: { colors?: Theme['colors'] }) {
  const c = colors || {};
  const primary = c.primary || '#3b82f6';
  const secondary = c.secondary || '#6366f1';
  const bg = c.bg || '#f8fafc';
  const surface = c.surface || '#ffffff';
  const headerBg = c.header_bg || '#1e293b';
  const text = c.text || '#0f172a';
  const borderCol = 'rgba(0,0,0,0.08)';

  return (
    <div
      className="h-32 rounded-t-xl relative overflow-hidden"
      style={{ backgroundColor: bg, borderBottom: `1px solid ${borderCol}` }}
    >
      {/* Header strip */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderCol}` }}
      >
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: primary }} />
          <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: surface, opacity: 0.9 }} />
        </div>
        <div className="flex gap-1">
          <div className="h-1.5 w-5 rounded-full" style={{ backgroundColor: surface, opacity: 0.6 }} />
          <div className="h-1.5 w-5 rounded-full" style={{ backgroundColor: surface, opacity: 0.6 }} />
          <div className="h-1.5 w-3 rounded-full" style={{ backgroundColor: primary }} />
        </div>
      </div>
      {/* Mini 2-col content area */}
      <div className="flex gap-2 px-3 pt-2.5">
        <div className="flex-1 space-y-1.5">
          {/* Card */}
          <div
            className="rounded-md p-1.5 space-y-1"
            style={{ backgroundColor: surface, border: `1px solid ${borderCol}` }}
          >
            <div className="h-1 w-10 rounded-full" style={{ backgroundColor: primary }} />
            <div className="h-1.5 w-full rounded" style={{ backgroundColor: text, opacity: 0.8 }} />
            <div className="h-1 w-4/5 rounded" style={{ backgroundColor: text, opacity: 0.35 }} />
          </div>
          <div
            className="rounded-md p-1.5 space-y-1"
            style={{ backgroundColor: surface, border: `1px solid ${borderCol}` }}
          >
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: secondary }} />
            <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: text, opacity: 0.8 }} />
          </div>
        </div>
        {/* Sidebar */}
        <div className="w-10 space-y-1">
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: primary }} />
          <div className="h-1.5 w-full rounded" style={{ backgroundColor: secondary }} />
          <div
            className="h-6 w-full rounded"
            style={{ backgroundColor: surface, border: `1px solid ${borderCol}` }}
          />
        </div>
      </div>
      {/* Accent swatch strip (bottom-left, 5 dots) */}
      <div className="absolute bottom-2 left-3 flex gap-1">
        {[bg, surface, secondary, primary, headerBg].map((color, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color, border: `1px solid ${borderCol}` }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

// Parse the raw css_variables JSON string that the /api/themes endpoint
// returns and project it onto the flat Theme['colors'] shape used by the
// preview component.
function parseThemeColors(raw: any): Theme['colors'] {
  let src: any = {};
  if (typeof raw?.css_variables === 'string') {
    try { src = JSON.parse(raw.css_variables); } catch { src = {}; }
  } else if (raw?.css_variables && typeof raw.css_variables === 'object') {
    src = raw.css_variables;
  }
  return {
    primary: src.primary_color,
    secondary: src.secondary_color,
    bg: src.bg_color,
    surface: src.surface_color,
    header_bg: src.header_bg_color,
    accent: src.link_color,
    text: src.text_color,
  };
}

export function ThemeStore() {
  const { lang } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [themes, setThemes] = useState<Theme[]>([]);
  // themes.id is TEXT (e.g. "theme-publisher"), so every id-typed state
  // must be string | null. A previous `number | null` typing caused the
  // isActive comparison to always be false.
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
        // Parse css_variables JSON and attach a flat `colors` object so
        // ThemeColorPreview can render the real theme colors instead of
        // the generic blue→indigo fallback.
        const list = (themesRes.data || []).map((row: any) => ({
          ...row,
          colors: parseThemeColors(row),
        }));
        setThemes(list);
      }
      // GET /themes/active wraps the row as { theme, overrides }.
      // Previously we read `data.id` directly, which was always undefined
      // and left the active-theme highlight permanently off.
      if (activeRes.success && activeRes.data?.theme?.id) {
        setActiveThemeId(String(activeRes.data.theme.id));
      } else {
        setActiveThemeId(null);
      }
    } catch {
      toast(lang === 'tr' ? 'Temalar yüklenemedi' : 'Failed to load themes', 'error');
    }
    setLoading(false);
  };

  const activateTheme = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await api.request<any>(`/themes/${id}/activate`, { method: 'POST' });
      if (res.success) {
        setActiveThemeId(id);
        toast(lang === 'tr' ? 'Tema aktifleştirildi' : 'Theme activated', 'success');
      } else {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    setActionLoading(null);
  };

  const cloneTheme = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await api.request<any>(`/themes/${id}/clone`, { method: 'POST' });
      if (res.success) {
        toast(lang === 'tr' ? 'Tema klonlandı' : 'Theme cloned', 'success');
        loadData();
      } else {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    setActionLoading(null);
  };

  const deleteTheme = async (id: string) => {
    if (!confirm(lang === 'tr' ? 'Bu temayı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this theme?')) {
      return;
    }
    setActionLoading(id);
    try {
      const res = await api.request<any>(`/themes/${id}`, { method: 'DELETE' });
      if (res.success) {
        toast(lang === 'tr' ? 'Tema silindi' : 'Theme deleted', 'success');
        loadData();
      } else {
        toast(res.error || (lang === 'tr' ? 'İşlem başarısız' : 'Operation failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            {t('themes', lang)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {lang === 'tr' ? 'Site temalarınızı yönetin' : 'Browse and manage your site themes'}
          </p>
        </div>
        <Button onClick={() => navigate('/themes/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('create_theme', lang)}
        </Button>
      </div>

      {/* Theme Grid */}
      {themes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {lang === 'tr' ? 'Henüz tema yok' : 'No themes available'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const isActive = theme.id === activeThemeId;
            const isLoading = actionLoading === theme.id;

            return (
              <Card
                key={theme.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-shadow hover:shadow-lg"
              >
                {/* Color Preview */}
                <ThemeColorPreview colors={theme.colors} />

                <CardContent className="p-4 space-y-3">
                  {/* Name + Version */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate">{theme.name}</h3>
                      {theme.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {theme.description}
                        </p>
                      )}
                    </div>
                    {/* More actions dropdown for non-system themes */}
                    {!theme.is_system && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => cloneTheme(theme.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            {t('clone', lang)}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteTheme(theme.id)}
                            className="text-destructive focus:text-destructive"
                            disabled={isActive}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete', lang)}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Author + Version */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {theme.author && <span>{theme.author}</span>}
                    {theme.version && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        v{theme.version}
                      </Badge>
                    )}
                    {theme.is_system && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {lang === 'tr' ? 'Sistem' : 'System'}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isActive ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="h-3 w-3" />
                        {t('active', lang)}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateTheme(theme.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        {t('activate', lang)}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/themes/${theme.id}/customize`)}
                      className="gap-1"
                    >
                      <Paintbrush className="h-3 w-3" />
                      {t('customize', lang)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
