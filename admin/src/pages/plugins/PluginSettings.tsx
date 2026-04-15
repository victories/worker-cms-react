import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Switch } from '@ui/switch';
import { Textarea } from '@ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Settings, Puzzle, Check } from 'lucide-react';

interface SchemaOption {
  value: string;
  label: string;
}

interface SettingsSchema {
  [key: string]: {
    type: 'boolean' | 'number' | 'string' | 'select' | 'multicheck';
    default: any;
    label: string;
    description?: string;
    options?: SchemaOption[];
  };
}

interface PluginSettingsResponse {
  success: boolean;
  data: {
    settings: Record<string, any>;
    schema: SettingsSchema;
  };
}

interface PluginListResponse {
  success: boolean;
  data: any[];
}

export function PluginSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useAuthStore();
  const { activeSite } = useSiteStore();

  const [plugin, setPlugin] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [schema, setSchema] = useState<SettingsSchema>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect hero-slider to its custom settings page
  useEffect(() => {
    if (plugin?.slug === 'hero-slider') {
      navigate('/plugins/hero-slider', { replace: true });
    }
  }, [plugin?.slug]);

  useEffect(() => {
    if (!id || !activeSite?.id) return;
    loadData();
  }, [id, activeSite?.id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load plugin info from plugin list
      const pluginsRes = await api.request<PluginListResponse>('/plugins');
      if (pluginsRes.success && pluginsRes.data) {
        const found = pluginsRes.data.find((p: any) => String(p.id) === String(id));
        if (found) {
          setPlugin(found);
        } else {
          setError(lang === 'tr' ? 'Eklenti bulunamadi' : 'Plugin not found');
          setLoading(false);
          return;
        }
      }

      // Load settings + schema
      const settingsRes = await api.request<PluginSettingsResponse>(`/plugins/${id}/settings`);
      if (settingsRes.success && settingsRes.data) {
        setSchema(settingsRes.data.schema || {});
        // Merge defaults from schema with actual settings
        const merged: Record<string, any> = {};
        const schemaData = settingsRes.data.schema || {};
        const settingsData = settingsRes.data.settings || {};
        for (const key of Object.keys(schemaData)) {
          merged[key] = settingsData[key] !== undefined
            ? settingsData[key]
            : schemaData[key].default;
        }
        setSettings(merged);
      } else {
        setError(lang === 'tr' ? 'Ayarlar yuklenemedi' : 'Failed to load settings');
      }
    } catch {
      setError(lang === 'tr' ? 'Ayarlar yuklenemedi' : 'Failed to load settings');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.request<{ success: boolean }>(`/plugins/${id}/settings`, {
        method: 'PUT',
        body: settings,
      });
      if (res.success) {
        setSuccess(lang === 'tr' ? 'Ayarlar kaydedildi' : 'Settings saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(lang === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings');
      }
    } catch {
      setError(lang === 'tr' ? 'Ayarlar kaydedilemedi' : 'Failed to save settings');
    }
    setSaving(false);
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const isTextarea = (key: string): boolean => {
    const lower = key.toLowerCase();
    return lower.includes('message') || lower.includes('css');
  };

  // Multicheck helpers
  const getMulticheckValues = (value: any): Set<string> => {
    if (!value) return new Set();
    if (typeof value === 'string') return new Set(value.split(',').map(v => v.trim()).filter(Boolean));
    return new Set();
  };

  const toggleMulticheckValue = (key: string, optionValue: string) => {
    const current = getMulticheckValues(settings[key]);
    if (current.has(optionValue)) {
      current.delete(optionValue);
    } else {
      current.add(optionValue);
    }
    updateSetting(key, Array.from(current).join(','));
  };

  const renderField = (key: string, fieldSchema: SettingsSchema[string]) => {
    const value = settings[key];

    switch (fieldSchema.type) {
      case 'boolean':
        return (
          <div key={key} className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{fieldSchema.label}</Label>
              {fieldSchema.description && (
                <p className="text-sm text-muted-foreground">{fieldSchema.description}</p>
              )}
            </div>
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => updateSetting(key, checked)}
            />
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-2 py-3">
            <Label htmlFor={`setting-${key}`}>{fieldSchema.label}</Label>
            <Input
              id={`setting-${key}`}
              type="number"
              value={value ?? ''}
              onChange={(e) => updateSetting(key, e.target.value === '' ? '' : Number(e.target.value))}
            />
            {fieldSchema.description && (
              <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={key} className="space-y-2 py-3">
            <Label htmlFor={`setting-${key}`}>{fieldSchema.label}</Label>
            <Select
              value={value ?? fieldSchema.default ?? ''}
              onValueChange={(v) => updateSetting(key, v)}
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(fieldSchema.options || []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldSchema.description && (
              <p className="text-xs text-muted-foreground mt-1">{fieldSchema.description}</p>
            )}
          </div>
        );

      case 'multicheck':
        const checkedValues = getMulticheckValues(value);
        return (
          <div key={key} className="space-y-3 py-3">
            <div>
              <Label>{fieldSchema.label}</Label>
              {fieldSchema.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{fieldSchema.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(fieldSchema.options || []).map((opt) => {
                const isChecked = checkedValues.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulticheckValue(key, opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                      isChecked
                        ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                        : 'border-input bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40'
                    }`}>
                      {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {checkedValues.size} {lang === 'tr' ? 'platform seçili' : 'platform(s) selected'}
            </p>
          </div>
        );

      case 'string':
      default:
        if (isTextarea(key)) {
          return (
            <div key={key} className="space-y-2 py-3">
              <Label htmlFor={`setting-${key}`}>{fieldSchema.label}</Label>
              <Textarea
                id={`setting-${key}`}
                value={value ?? ''}
                onChange={(e) => updateSetting(key, e.target.value)}
                className={key.toLowerCase().includes('css') ? 'font-mono text-sm min-h-[150px]' : 'min-h-[100px]'}
              />
              {fieldSchema.description && (
                <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
              )}
            </div>
          );
        }
        return (
          <div key={key} className="space-y-2 py-3">
            <Label htmlFor={`setting-${key}`}>{fieldSchema.label}</Label>
            <Input
              id={`setting-${key}`}
              type="text"
              value={value ?? ''}
              onChange={(e) => updateSetting(key, e.target.value)}
            />
            {fieldSchema.description && (
              <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
            )}
          </div>
        );
    }
  };

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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/plugins')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold">
                {plugin?.name || (lang === 'tr' ? 'Eklenti Ayarlari' : 'Plugin Settings')}
              </h1>
              {plugin && (
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">v{plugin.version}</Badge>
                  {plugin.is_active ? (
                    <Badge variant="success">{lang === 'tr' ? 'Aktif' : 'Active'}</Badge>
                  ) : (
                    <Badge variant="secondary">{lang === 'tr' ? 'Pasif' : 'Inactive'}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
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

      {/* Plugin Description */}
      {plugin?.description && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Puzzle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{plugin.description}</p>
                {plugin.author && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === 'tr' ? 'Gelistirici' : 'Author'}: {plugin.author}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Form */}
      {Object.keys(schema).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Settings className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {lang === 'tr'
                ? 'Bu eklenti icin yapilandirilabilir ayar bulunmuyor'
                : 'No configurable settings available for this plugin'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {lang === 'tr' ? 'Eklenti Ayarlari' : 'Plugin Settings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Object.entries(schema).map(([key, fieldSchema]) =>
                renderField(key, fieldSchema)
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Save Button */}
      {Object.keys(schema).length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving
              ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...')
              : t('action.save', lang)}
          </Button>
        </div>
      )}
    </div>
  );
}
