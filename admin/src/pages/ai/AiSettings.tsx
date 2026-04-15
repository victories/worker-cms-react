import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Input } from '@ui/input';
import { Button } from '@ui/button';
import { Switch } from '@ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Separator } from '@ui/separator';
import { useToast } from '@ui/toast-notification';
import { Bot, Save, Plug, Trash2, Loader2, RefreshCw, Search, Globe, Monitor } from 'lucide-react';

interface ModelDefinition {
  id: string;
  name: string;
  contextWindow?: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

interface ProviderDefinition {
  slug: string;
  name: string;
  models: ModelDefinition[];
}

interface ProviderFormState {
  enabled: boolean;
  api_key: string;
  default_model: string;
  max_tokens: number;
  temperature: number;
  endpoint_url: string;
  resource_name: string;
  deployment_name: string;
}

interface SavedProvider {
  slug: string;
  enabled: boolean;
  api_key: string;
  default_model: string;
  max_tokens: number;
  temperature: number;
  endpoint_url: string;
  extra_config?: string;
  has_global_fallback?: boolean;
  using_global?: boolean;
}

function parseExtraConfig(raw?: string): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildFormState(saved?: SavedProvider): ProviderFormState {
  const extra = parseExtraConfig(saved?.extra_config);
  return {
    enabled: saved?.enabled ?? false,
    api_key: '',
    default_model: saved?.default_model ?? '',
    max_tokens: saved?.max_tokens ?? 4096,
    temperature: saved?.temperature ?? 0.7,
    endpoint_url: saved?.endpoint_url ?? '',
    resource_name: extra.resource_name ?? '',
    deployment_name: extra.deployment_name ?? '',
  };
}

// Reusable provider card form
function ProviderCard({
  def,
  form,
  saved,
  isGlobal,
  lang,
  savingSlug,
  testingSlug,
  deletingSlug,
  dynamicModels,
  loadingModels,
  modelSearch,
  onUpdateForm,
  onSave,
  onTest,
  onDelete,
  onFetchModels,
  onModelSearchChange,
}: {
  def: ProviderDefinition;
  form: ProviderFormState;
  saved?: SavedProvider;
  isGlobal: boolean;
  lang: string;
  savingSlug: string | null;
  testingSlug: string | null;
  deletingSlug: string | null;
  dynamicModels: Record<string, ModelDefinition[]>;
  loadingModels: string | null;
  modelSearch: Record<string, string>;
  onUpdateForm: (slug: string, field: keyof ProviderFormState, value: string | number | boolean) => void;
  onSave: (slug: string) => void;
  onTest: (slug: string) => void;
  onDelete: (slug: string) => void;
  onFetchModels: (slug: string) => void;
  onModelSearchChange: (slug: string, value: string) => void;
}) {
  const maskedKey = saved?.api_key || '';
  const isSaving = savingSlug === def.slug;
  const isTesting = testingSlug === def.slug;
  const isDeleting = deletingSlug === def.slug;
  const isDynamic = def.slug === 'aiml';

  return (
    <Card key={def.slug}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{def.name}</CardTitle>
            <Badge variant={form.enabled ? 'default' : 'secondary'}>
              {form.enabled ? t('ai.enabled', lang) : t('ai.disabled', lang)}
            </Badge>
            {!isGlobal && saved?.using_global && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Globe className="h-3 w-3 mr-1" />
                {t('ai.using_global_key', lang)}
              </Badge>
            )}
            {!isGlobal && saved?.has_global_fallback && !saved?.using_global && saved?.api_key && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                {t('ai.has_own_key', lang)}
              </Badge>
            )}
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(checked) => onUpdateForm(def.slug, 'enabled', checked)}
          />
        </div>
        <CardDescription>{def.slug}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Key */}
        <div>
          <Label>{t('ai.api_key', lang)}</Label>
          <div className="relative">
            <Input
              type="password"
              value={form.api_key}
              onChange={(e) => onUpdateForm(def.slug, 'api_key', e.target.value)}
              placeholder={maskedKey ? '••••••••••••••••' : 'sk-...'}
              className="font-mono text-sm"
            />
            {maskedKey && !form.api_key && (
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-xs font-mono">
                  {maskedKey}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {lang === 'tr' ? 'API anahtarı kayıtlı' : 'API key saved'}
                </span>
              </div>
            )}
            {!isGlobal && !maskedKey && !form.api_key && saved?.has_global_fallback && (
              <p className="text-xs text-blue-600 mt-1.5">
                {t('ai.site_provider_desc', lang)}
              </p>
            )}
          </div>
        </div>

        {/* Default Model */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>{t('ai.model', lang)}</Label>
            {isDynamic && (
              <div className="flex items-center gap-2">
                {dynamicModels[def.slug] && (
                  <Badge variant="outline" className="text-xs">
                    {dynamicModels[def.slug].length} {t('ai.models_found', lang)}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onFetchModels(def.slug)}
                  disabled={loadingModels === def.slug || (!saved?.api_key && !form.api_key)}
                >
                  {loadingModels === def.slug ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  {loadingModels === def.slug ? t('ai.fetching_models', lang) : t('ai.fetch_models', lang)}
                </Button>
              </div>
            )}
          </div>
          {(() => {
            const models = isDynamic ? (dynamicModels[def.slug] || []) : def.models;
            const search = (modelSearch[def.slug] || '').toLowerCase();
            const filteredModels = search ? models.filter((m) =>
              m.id.toLowerCase().includes(search) || m.name.toLowerCase().includes(search)
            ) : models;

            if (isDynamic && models.length === 0) {
              return (
                <div className="border rounded-md p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {saved?.api_key
                      ? (lang === 'tr' ? 'Modeller henüz yüklenmedi' : 'Models not loaded yet')
                      : t('ai.save_key_first', lang)
                    }
                  </p>
                  {(saved?.api_key || form.api_key) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onFetchModels(def.slug)}
                      disabled={loadingModels === def.slug}
                    >
                      {loadingModels === def.slug ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {loadingModels === def.slug ? t('ai.fetching_models', lang) : t('ai.fetch_models', lang)}
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <>
                {isDynamic && models.length > 10 && (
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={modelSearch[def.slug] || ''}
                      onChange={(e) => onModelSearchChange(def.slug, e.target.value)}
                      placeholder={t('ai.search_models', lang)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                )}
                <Select
                  value={form.default_model}
                  onValueChange={(v) => onUpdateForm(def.slug, 'default_model', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lang === 'tr' ? 'Model seçin...' : 'Select model...'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.contextWindow ? (
                            <span className="text-xs text-muted-foreground">
                              ({Math.round(m.contextWindow / 1000)}k ctx)
                            </span>
                          ) : null}
                        </div>
                      </SelectItem>
                    ))}
                    {filteredModels.length === 0 && (
                      <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                        {t('ai.no_models', lang)}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </>
            );
          })()}
        </div>

        {/* Max Tokens & Temperature */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('ai.max_tokens', lang)}</Label>
            <Input
              type="number"
              min={1}
              max={128000}
              value={form.max_tokens}
              onChange={(e) => onUpdateForm(def.slug, 'max_tokens', parseInt(e.target.value) || 4096)}
            />
          </div>
          <div>
            <Label>{t('ai.temperature', lang)}</Label>
            <Input
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={form.temperature}
              onChange={(e) => onUpdateForm(def.slug, 'temperature', parseFloat(e.target.value) || 0.7)}
            />
          </div>
        </div>

        {/* Azure-specific fields */}
        {def.slug === 'azure_openai' && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('ai.resource_name', lang)}</Label>
                <Input
                  value={form.resource_name}
                  onChange={(e) => onUpdateForm(def.slug, 'resource_name', e.target.value)}
                  placeholder="my-openai-resource"
                />
              </div>
              <div>
                <Label>{t('ai.deployment_name', lang)}</Label>
                <Input
                  value={form.deployment_name}
                  onChange={(e) => onUpdateForm(def.slug, 'deployment_name', e.target.value)}
                  placeholder="gpt-4o-deployment"
                />
              </div>
            </div>
          </>
        )}

        {/* Endpoint URL */}
        <div>
          <Label>
            {t('ai.endpoint_url', lang)}
            <span className="text-xs text-muted-foreground ml-2">
              ({lang === 'tr' ? 'opsiyonel' : 'optional'})
            </span>
          </Label>
          <Input
            value={form.endpoint_url}
            onChange={(e) => onUpdateForm(def.slug, 'endpoint_url', e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="font-mono text-sm"
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(def.slug)}
            disabled={isTesting || isSaving}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plug className="h-4 w-4 mr-2" />
            )}
            {t('ai.test_connection', lang)}
          </Button>

          <Button
            size="sm"
            onClick={() => onSave(def.slug)}
            disabled={isSaving || isTesting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('action.save', lang)}
          </Button>

          {saved && !saved.using_global && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive ml-auto"
              onClick={() => onDelete(def.slug)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('action.delete', lang)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AiSettings() {
  const { lang, user } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'site' | 'global'>(isSuperAdmin ? 'global' : 'site');
  const [definitions, setDefinitions] = useState<ProviderDefinition[]>([]);

  // Site-level state
  const [savedProviders, setSavedProviders] = useState<Record<string, SavedProvider>>({});
  const [forms, setForms] = useState<Record<string, ProviderFormState>>({});

  // Global-level state
  const [globalSavedProviders, setGlobalSavedProviders] = useState<Record<string, SavedProvider>>({});
  const [globalForms, setGlobalForms] = useState<Record<string, ProviderFormState>>({});

  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelDefinition[]>>({});
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        api.getAiProviderDefinitions(),
        api.getAiProviders(),
      ];
      if (isSuperAdmin) {
        promises.push(api.getGlobalAiProviders());
      }

      const results = await Promise.all(promises);
      const [defRes, provRes] = results;
      const globalProvRes = isSuperAdmin ? results[2] : null;

      const defs: ProviderDefinition[] = defRes?.success ? defRes.data : [];
      setDefinitions(defs);

      // Site providers
      const savedMap: Record<string, SavedProvider> = {};
      if (provRes?.success && Array.isArray(provRes.data)) {
        for (const p of provRes.data) {
          savedMap[p.slug] = p;
        }
      }
      setSavedProviders(savedMap);

      const formMap: Record<string, ProviderFormState> = {};
      for (const def of defs) {
        formMap[def.slug] = buildFormState(savedMap[def.slug]);
      }
      setForms(formMap);

      // Global providers
      if (globalProvRes?.success && Array.isArray(globalProvRes.data)) {
        const globalMap: Record<string, SavedProvider> = {};
        for (const p of globalProvRes.data) {
          globalMap[p.slug] = p;
        }
        setGlobalSavedProviders(globalMap);

        const globalFormMap: Record<string, ProviderFormState> = {};
        for (const def of defs) {
          globalFormMap[def.slug] = buildFormState(globalMap[def.slug]);
        }
        setGlobalForms(globalFormMap);
      }
    } catch {
      toast(lang === 'tr' ? 'Veriler yüklenemedi' : 'Failed to load data', 'error');
    }
    setLoading(false);
  };

  const updateForm = (slug: string, field: keyof ProviderFormState, value: string | number | boolean) => {
    if (activeTab === 'global') {
      setGlobalForms((prev) => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }));
    } else {
      setForms((prev) => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }));
    }
  };

  const handleSave = async (slug: string) => {
    const form = activeTab === 'global' ? globalForms[slug] : forms[slug];
    if (!form) return;

    setSavingSlug(slug);
    try {
      const body: Record<string, unknown> = {
        is_enabled: form.enabled ? 1 : 0,
        default_model: form.default_model,
        max_tokens: form.max_tokens,
        temperature: form.temperature,
        endpoint_url: form.endpoint_url || null,
      };

      if (form.api_key) {
        body.api_key = form.api_key;
      }

      if (slug === 'azure_openai') {
        body.extra_config = JSON.stringify({
          resource_name: form.resource_name,
          deployment_name: form.deployment_name,
        });
      }

      const res = activeTab === 'global'
        ? await api.updateGlobalAiProvider(slug, body) as { success?: boolean }
        : await api.updateAiProvider(slug, body) as { success?: boolean };

      if (res?.success) {
        toast(lang === 'tr' ? 'Sağlayıcı kaydedildi' : 'Provider saved', 'success');
        await loadData();
        const currentSaved = activeTab === 'global' ? globalSavedProviders[slug] : savedProviders[slug];
        if (slug === 'aiml' && (form.api_key || currentSaved?.api_key)) {
          handleFetchModels(slug);
        }
      } else {
        toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSavingSlug(null);
  };

  const handleTest = async (slug: string) => {
    setTestingSlug(slug);
    try {
      const res = activeTab === 'global'
        ? await api.testGlobalAiProvider(slug)
        : await api.testAiProvider(slug);
      if (res?.success && res.data?.success) {
        toast(t('ai.test_success', lang), 'success');
      } else {
        const errorMsg = res?.data?.error || t('ai.test_failed', lang);
        toast(`${t('ai.test_failed', lang)}: ${errorMsg}`, 'error');
      }
    } catch {
      toast(t('ai.test_failed', lang), 'error');
    }
    setTestingSlug(null);
  };

  const handleDelete = async (slug: string) => {
    setDeletingSlug(slug);
    try {
      const res = activeTab === 'global'
        ? await api.deleteGlobalAiProvider(slug) as { success?: boolean }
        : await api.deleteAiProvider(slug) as { success?: boolean };
      if (res?.success) {
        toast(lang === 'tr' ? 'Sağlayıcı silindi' : 'Provider deleted', 'success');
        await loadData();
      } else {
        toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeletingSlug(null);
  };

  const handleFetchModels = async (slug: string) => {
    setLoadingModels(slug);
    try {
      const res = activeTab === 'global'
        ? await api.getGlobalAiProviderModels(slug)
        : await api.getAiProviderModels(slug);
      if (res?.success && Array.isArray(res.data)) {
        setDynamicModels((prev) => ({ ...prev, [slug]: res.data }));
        toast(`${res.data.length} ${t('ai.models_found', lang)}`, 'success');
      } else {
        toast(res?.error || t('ai.no_models', lang), 'error');
      }
    } catch {
      toast(t('ai.no_models', lang), 'error');
    }
    setLoadingModels(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}
        </span>
      </div>
    );
  }

  const currentForms = activeTab === 'global' ? globalForms : forms;
  const currentSaved = activeTab === 'global' ? globalSavedProviders : savedProviders;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Bot className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('ai.providers', lang)}</h1>
      </div>

      {/* Tab Switcher - only for super_admin */}
      {isSuperAdmin && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-4 w-4" />
            {t('ai.global_providers', lang)}
          </button>
          <button
            onClick={() => setActiveTab('site')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'site'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="h-4 w-4" />
            {t('ai.site_providers', lang)}
          </button>
        </div>
      )}

      {/* Description */}
      {isSuperAdmin && (
        <p className="text-sm text-muted-foreground">
          {activeTab === 'global' ? t('ai.global_provider_desc', lang) : t('ai.site_provider_desc', lang)}
        </p>
      )}

      {definitions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>{lang === 'tr' ? 'Tanımlı sağlayıcı bulunamadı' : 'No provider definitions found'}</p>
          </CardContent>
        </Card>
      )}

      {definitions.map((def) => {
        const form = currentForms[def.slug];
        if (!form) return null;
        const saved = currentSaved[def.slug];

        return (
          <ProviderCard
            key={`${activeTab}-${def.slug}`}
            def={def}
            form={form}
            saved={saved}
            isGlobal={activeTab === 'global'}
            lang={lang}
            savingSlug={savingSlug}
            testingSlug={testingSlug}
            deletingSlug={deletingSlug}
            dynamicModels={dynamicModels}
            loadingModels={loadingModels}
            modelSearch={modelSearch}
            onUpdateForm={updateForm}
            onSave={handleSave}
            onTest={handleTest}
            onDelete={handleDelete}
            onFetchModels={handleFetchModels}
            onModelSearchChange={(slug, value) => setModelSearch((prev) => ({ ...prev, [slug]: value }))}
          />
        );
      })}
    </div>
  );
}
