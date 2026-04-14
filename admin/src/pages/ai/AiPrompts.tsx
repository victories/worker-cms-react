import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast-notification';
import { FileText, Plus, Pencil, Trash2, AlertTriangle, Sparkles, Copy, Loader2, RefreshCw, Search, ImageIcon, Globe, Monitor } from 'lucide-react';

interface AiPrompt {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  variables: string;
  default_provider_slug: string;
  default_model: string;
  default_word_count: number;
  default_language: string;
  default_tone: string;
  is_active: number | boolean;
  image_enabled: number | boolean;
  image_model: string;
  image_style: string;
  image_count: number;
  image_layout: string; // JSON string from DB
  created_at: string;
  scope?: 'site' | 'global';
}

interface ModelDefinition {
  id: string;
  name: string;
  contextWindow?: number;
}

interface ProviderDefinition {
  slug: string;
  name: string;
  models: ModelDefinition[];
}

interface ImageLayoutItem {
  position: string;
  size: string;
}

interface PromptFormData {
  name: string;
  description: string;
  system_prompt: string;
  user_prompt: string;
  default_provider_slug: string;
  default_model: string;
  default_word_count: number;
  default_language: string;
  default_tone: string;
  is_active: boolean;
  image_enabled: boolean;
  image_model: string;
  image_style: string;
  image_count: number;
  image_layout: ImageLayoutItem[];
}

const LANGUAGES = [
  { value: 'tr', label: 'Turkce' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
  { value: 'es', label: 'Espanol' },
  { value: 'ar', label: 'Arabic' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'academic', label: 'Academic' },
  { value: 'creative', label: 'Creative' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'formal', label: 'Formal' },
];

const emptyForm: PromptFormData = {
  name: '',
  description: '',
  system_prompt: '',
  user_prompt: '',
  default_provider_slug: '',
  default_model: '',
  default_word_count: 1000,
  default_language: 'tr',
  default_tone: 'professional',
  is_active: true,
  image_enabled: false,
  image_model: '',
  image_style: 'photographic',
  image_count: 0,
  image_layout: [],
};

const isDynamicProvider = (slug: string) => slug === 'aiml';

export function AiPrompts() {
  const { lang, user } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'site' | 'global'>('site');
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [globalPrompts, setGlobalPrompts] = useState<AiPrompt[]>([]);
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingScope, setEditingScope] = useState<'site' | 'global'>('site');
  const [form, setForm] = useState<PromptFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<AiPrompt | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Dynamic models for providers like AIML
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelDefinition[]>>({});
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  // Image models
  const [imageModels, setImageModels] = useState<{ id: string; name: string }[]>([]);
  const [loadingImageModels, setLoadingImageModels] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        api.getAiPrompts(),
        api.getAiProviderDefinitions(),
      ];
      if (isSuperAdmin) {
        promises.push(api.getGlobalAiPrompts());
      }

      const results = await Promise.all(promises);
      const [promptsRes, providersRes] = results;
      const globalPromptsRes = isSuperAdmin ? results[2] : null;

      if (promptsRes.success) {
        // Separate site and global prompts from the merged response
        const all = promptsRes.data || [];
        setPrompts(all.filter((p: AiPrompt) => p.scope === 'site' || !p.scope));
      }
      if (providersRes.success) {
        setProviders(providersRes.data || []);
      }
      if (globalPromptsRes?.success) {
        setGlobalPrompts((globalPromptsRes.data || []).map((p: AiPrompt) => ({ ...p, scope: 'global' as const })));
      }
    } catch {
      toast(lang === 'tr' ? 'Veriler yuklenemedi' : 'Failed to load data', 'error');
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setEditingScope(activeTab);
    setForm({ ...emptyForm });
    setModelSearch('');
    setDialogOpen(true);
  };

  const openEditDialog = (prompt: AiPrompt) => {
    setEditingId(prompt.id);
    setEditingScope(prompt.scope || 'site');
    let editLayout: ImageLayoutItem[] = [];
    try { editLayout = prompt.image_layout ? JSON.parse(prompt.image_layout) : []; } catch { /* ignore */ }
    setForm({
      name: prompt.name || '',
      description: prompt.description || '',
      system_prompt: prompt.system_prompt || '',
      user_prompt: prompt.user_prompt || '',
      default_provider_slug: prompt.default_provider_slug || '',
      default_model: prompt.default_model || '',
      default_word_count: prompt.default_word_count || 1000,
      default_language: prompt.default_language || 'tr',
      default_tone: prompt.default_tone || 'professional',
      is_active: !!prompt.is_active,
      image_enabled: !!prompt.image_enabled,
      image_model: prompt.image_model || '',
      image_style: prompt.image_style || 'photographic',
      image_count: prompt.image_count || 0,
      image_layout: editLayout,
    });
    setModelSearch('');
    // Auto-fetch models if provider is dynamic and we don't have them
    if (prompt.default_provider_slug && isDynamicProvider(prompt.default_provider_slug) && !dynamicModels[prompt.default_provider_slug]) {
      fetchModelsForProvider(prompt.default_provider_slug);
    }
    // Auto-fetch image models if image is enabled
    if (prompt.image_enabled && imageModels.length === 0) {
      fetchImageModels();
    }
    setDialogOpen(true);
  };

  const openDuplicateDialog = (prompt: AiPrompt) => {
    setEditingId(null);
    setEditingScope(prompt.scope === 'global' ? 'site' : (activeTab || 'site'));
    let dupLayout: ImageLayoutItem[] = [];
    try { dupLayout = prompt.image_layout ? JSON.parse(prompt.image_layout) : []; } catch { /* ignore */ }
    setForm({
      name: `${prompt.name} (${lang === 'tr' ? 'Kopya' : 'Copy'})`,
      description: prompt.description || '',
      system_prompt: prompt.system_prompt || '',
      user_prompt: prompt.user_prompt || '',
      default_provider_slug: prompt.default_provider_slug || '',
      default_model: prompt.default_model || '',
      default_word_count: prompt.default_word_count || 1000,
      default_language: prompt.default_language || 'tr',
      default_tone: prompt.default_tone || 'professional',
      is_active: !!prompt.is_active,
      image_enabled: !!prompt.image_enabled,
      image_model: prompt.image_model || '',
      image_style: prompt.image_style || 'photographic',
      image_count: prompt.image_count || 0,
      image_layout: dupLayout,
    });
    setModelSearch('');
    if (prompt.default_provider_slug && isDynamicProvider(prompt.default_provider_slug) && !dynamicModels[prompt.default_provider_slug]) {
      fetchModelsForProvider(prompt.default_provider_slug);
    }
    if (prompt.image_enabled && imageModels.length === 0) {
      fetchImageModels();
    }
    setDialogOpen(true);
  };

  const fetchModelsForProvider = async (slug: string, force = false) => {
    if (!force && dynamicModels[slug]?.length) return; // Already fetched
    setLoadingModels(true);
    setModelFetchError(null);
    try {
      const res = await api.getAiProviderModels(slug);
      if (res?.success && Array.isArray(res.data)) {
        setDynamicModels((prev) => ({ ...prev, [slug]: res.data }));
        if (res.data.length === 0) {
          setModelFetchError(lang === 'tr' ? 'Model bulunamadi. API anahtarinizi kontrol edin.' : 'No models found. Check your API key.');
        }
      } else {
        setModelFetchError((res as any)?.error || (lang === 'tr' ? 'Modeller yuklenemedi' : 'Failed to load models'));
      }
    } catch {
      setModelFetchError(lang === 'tr' ? 'Modeller yuklenemedi. Baglanti hatasi.' : 'Failed to load models. Connection error.');
    }
    setLoadingModels(false);
  };

  const fetchImageModels = async () => {
    setLoadingImageModels(true);
    try {
      const res = await api.getAiProviderImageModels('aiml');
      if (res?.success && Array.isArray(res.data)) {
        setImageModels(res.data);
      }
    } catch { /* ignore */ }
    setLoadingImageModels(false);
  };

  const handleProviderChange = (slug: string) => {
    setForm((prev) => ({ ...prev, default_provider_slug: slug, default_model: '' }));
    setModelSearch('');
    setModelFetchError(null);
    if (isDynamicProvider(slug)) {
      fetchModelsForProvider(slug);
    }
  };

  const handleFetchModels = async () => {
    const slug = form.default_provider_slug;
    if (!slug) return;
    setLoadingModels(true);
    setModelFetchError(null);
    try {
      const res = await api.getAiProviderModels(slug);
      if (res?.success && Array.isArray(res.data)) {
        setDynamicModels((prev) => ({ ...prev, [slug]: res.data }));
        if (res.data.length > 0) {
          toast(`${res.data.length} ${t('ai.models_found', lang)}`, 'success');
        } else {
          setModelFetchError(lang === 'tr' ? 'Model bulunamadi. API anahtarinizi kontrol edin.' : 'No models found. Check your API key.');
        }
      } else {
        const errMsg = (res as any)?.error || (lang === 'tr' ? 'Modeller yuklenemedi' : 'Failed to load models');
        setModelFetchError(errMsg);
        toast(errMsg, 'error');
      }
    } catch {
      const errMsg = lang === 'tr' ? 'Baglanti hatasi' : 'Connection error';
      setModelFetchError(errMsg);
      toast(errMsg, 'error');
    }
    setLoadingModels(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        is_active: form.is_active ? 1 : 0,
        image_enabled: form.image_enabled ? 1 : 0,
        image_layout: JSON.stringify(form.image_layout),
      };

      let res: any;
      if (editingScope === 'global' && isSuperAdmin) {
        if (editingId) {
          res = await api.updateGlobalAiPrompt(editingId, payload);
        } else {
          res = await api.createGlobalAiPrompt(payload);
        }
      } else {
        if (editingId) {
          res = await api.updateAiPrompt(editingId, payload);
        } else {
          res = await api.createAiPrompt(payload);
        }
      }

      if (res.success) {
        toast(
          editingId
            ? (lang === 'tr' ? 'Sablon guncellendi' : 'Template updated')
            : (lang === 'tr' ? 'Sablon olusturuldu' : 'Template created'),
          'success'
        );
        setDialogOpen(false);
        loadData();
      } else {
        toast(lang === 'tr' ? 'Islem basarisiz' : 'Operation failed', 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Islem basarisiz' : 'Operation failed', 'error');
    }
    setSaving(false);
  };

  const openDeleteConfirm = (prompt: AiPrompt) => {
    setDeleteTarget(prompt);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const isGlobalPrompt = deleteTarget.scope === 'global';
      const res = (isGlobalPrompt && isSuperAdmin)
        ? await api.deleteGlobalAiPrompt(deleteTarget.id) as any
        : await api.deleteAiPrompt(deleteTarget.id) as any;
      if (res.success) {
        toast(lang === 'tr' ? 'Sablon silindi' : 'Template deleted', 'success');
        setShowDeleteDialog(false);
        setDeleteTarget(null);
        loadData();
      } else {
        toast(lang === 'tr' ? 'Silinemedi' : 'Failed to delete', 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Silinemedi' : 'Failed to delete', 'error');
    }
    setDeleting(false);
  };

  const getProviderName = (slug: string): string => {
    const provider = providers.find((p) => p.slug === slug);
    return provider?.name || slug || '-';
  };

  const getToneLabel = (value: string): string => {
    const tone = TONES.find((t) => t.value === value);
    return tone?.label || value || '-';
  };

  const getLanguageLabel = (value: string): string => {
    const language = LANGUAGES.find((l) => l.value === value);
    return language?.label || value || '-';
  };

  // Get models for the currently selected provider in the form
  const getModelsForSelectedProvider = (): ModelDefinition[] => {
    const slug = form.default_provider_slug;
    if (!slug) return [];
    if (isDynamicProvider(slug)) {
      return dynamicModels[slug] || [];
    }
    const provider = providers.find((p) => p.slug === slug);
    return provider?.models || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          {lang === 'tr' ? 'Yukleniyor...' : 'Loading...'}
        </span>
      </div>
    );
  }

  const models = getModelsForSelectedProvider();
  const searchLower = modelSearch.toLowerCase();
  const filteredModels = searchLower
    ? models.filter((m) => m.id.toLowerCase().includes(searchLower) || m.name.toLowerCase().includes(searchLower))
    : models;

  // Determine which prompts to display based on active tab
  const displayPrompts = activeTab === 'global' ? globalPrompts : prompts;
  // For site tab, also include global prompts at the end (read-only, for non-super_admin)
  const siteDisplayPrompts = activeTab === 'site'
    ? [...prompts, ...globalPrompts.filter(gp => gp.is_active)]
    : displayPrompts;
  const currentPrompts = activeTab === 'global' ? displayPrompts : siteDisplayPrompts;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {t('ai.prompt_template', lang)}
          </h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {lang === 'tr' ? 'Yeni Sablon' : 'New Template'}
        </Button>
      </div>

      {/* Tab Switcher - for super_admin */}
      {isSuperAdmin && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('site')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'site'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor className="h-4 w-4" />
            {t('ai.site_prompts', lang)}
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="h-4 w-4" />
            {t('ai.global_prompts', lang)}
          </button>
        </div>
      )}

      {/* Prompt List */}
      {currentPrompts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {lang === 'tr' ? 'Henuz prompt sablonu yok' : 'No prompt templates yet'}
              </p>
              <p className="text-sm mt-1">
                {lang === 'tr'
                  ? 'AI icerik uretimi icin bir prompt sablonu olusturun'
                  : 'Create a prompt template for AI content generation'}
              </p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {lang === 'tr' ? 'Ilk Sablonu Olustur' : 'Create First Template'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentPrompts.map((prompt) => {
            const isGlobalPrompt = prompt.scope === 'global';
            const canEdit = isGlobalPrompt ? isSuperAdmin : true;
            const canDelete = isGlobalPrompt ? isSuperAdmin : true;

            return (
            <Card
              key={`${prompt.scope || 'site'}-${prompt.id}`}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${isGlobalPrompt && activeTab === 'site' ? 'border-blue-200 bg-blue-50/30' : ''}`}
              onClick={() => canEdit ? openEditDialog(prompt) : openDuplicateDialog(prompt)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {prompt.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {isGlobalPrompt && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Globe className="h-3 w-3 mr-1" />
                        {t('ai.global', lang)}
                      </Badge>
                    )}
                    {(prompt as any).image_enabled ? (
                      <Badge variant="outline" className="text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {(prompt as any).image_count || 0}
                      </Badge>
                    ) : null}
                    <Badge variant={prompt.is_active ? 'default' : 'secondary'}>
                      {prompt.is_active
                        ? t('ai.enabled', lang)
                        : t('ai.disabled', lang)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {prompt.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {prompt.description}
                  </p>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{t('ai.provider', lang)}:</span>{' '}
                    <span className="font-medium">{getProviderName(prompt.default_provider_slug)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('ai.model', lang)}:</span>{' '}
                    <span className="font-medium">{prompt.default_model || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('ai.tone', lang)}:</span>{' '}
                    <span className="font-medium">{getToneLabel(prompt.default_tone)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('ai.language', lang)}:</span>{' '}
                    <span className="font-medium">{getLanguageLabel(prompt.default_language)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDuplicateDialog(prompt);
                    }}
                    title={isGlobalPrompt && activeTab === 'site' ? t('ai.copy_to_site', lang) : (lang === 'tr' ? 'Kopyala' : 'Duplicate')}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {isGlobalPrompt && activeTab === 'site' ? t('ai.copy_to_site', lang) : (lang === 'tr' ? 'Kopyala' : 'Copy')}
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(prompt);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {t('action.edit', lang)}
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(prompt);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t('action.delete', lang)}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? `${t('action.edit', lang)} - ${t('ai.prompt_template', lang)}`
                : `${t('action.create', lang)} - ${t('ai.prompt_template', lang)}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label>{t('ai.prompt_name', lang)} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={lang === 'tr' ? 'orn. Blog Yazisi Uretici' : 'e.g. Blog Post Generator'}
              />
            </div>

            {/* Description */}
            <div>
              <Label>
                {lang === 'tr' ? 'Aciklama' : 'Description'}
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={lang === 'tr' ? 'Sablonun ne ise yaradigini kisaca aciklayin' : 'Briefly describe what this template does'}
                rows={2}
              />
            </div>

            <Separator />

            {/* System Prompt */}
            <div>
              <Label>{t('ai.system_prompt', lang)}</Label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                placeholder={lang === 'tr'
                  ? 'AI modeline verilecek sistem talimatini yazin...'
                  : 'Write the system instruction for the AI model...'}
                rows={4}
              />
            </div>

            {/* User Prompt */}
            <div>
              <Label>{t('ai.user_prompt', lang)}</Label>
              <Textarea
                value={form.user_prompt}
                onChange={(e) => setForm({ ...form, user_prompt: e.target.value })}
                placeholder={lang === 'tr'
                  ? 'Kullanici promptunu yazin. Degiskenler: {{title}}, {{language}}, {{word_count}}, {{keywords}}, {{tone}}, {{category}}, {{topic}}'
                  : 'Write the user prompt. Variables: {{title}}, {{language}}, {{word_count}}, {{keywords}}, {{tone}}, {{category}}, {{topic}}'}
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'tr'
                  ? 'Kullanilabilir degiskenler: {{title}}, {{language}}, {{word_count}}, {{keywords}}, {{tone}}, {{category}}, {{topic}}'
                  : 'Available variables: {{title}}, {{language}}, {{word_count}}, {{keywords}}, {{tone}}, {{category}}, {{topic}}'}
              </p>
            </div>

            <Separator />

            {/* Provider */}
            <div>
              <Label>{t('ai.provider', lang)}</Label>
              <Select
                value={form.default_provider_slug}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang === 'tr' ? 'Saglayici secin' : 'Select provider'} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection - only show when provider is selected */}
            {form.default_provider_slug && (
              <div>
                <div className="flex items-center justify-between">
                  <Label>{t('ai.model', lang)}</Label>
                  {isDynamicProvider(form.default_provider_slug) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={handleFetchModels}
                      disabled={loadingModels}
                    >
                      {loadingModels ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      {t('ai.fetch_models', lang)}
                    </Button>
                  )}
                </div>

                {loadingModels ? (
                  <div className="border rounded-md p-3 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {lang === 'tr' ? 'Modeller yukleniyor...' : 'Loading models...'}
                    </span>
                  </div>
                ) : models.length > 0 ? (
                  <>
                    {models.length > 10 && (
                      <div className="relative mb-1.5">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          placeholder={t('ai.search_models', lang)}
                          className="pl-8 h-8 text-xs"
                        />
                      </div>
                    )}
                    <Select
                      value={form.default_model}
                      onValueChange={(v) => setForm({ ...form, default_model: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={lang === 'tr' ? 'Model secin...' : 'Select model...'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {filteredModels.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex items-center gap-2">
                              <span>{m.name}</span>
                              {m.contextWindow ? (
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round(m.contextWindow / 1000)}k)
                                </span>
                              ) : null}
                            </div>
                          </SelectItem>
                        ))}
                        {filteredModels.length === 0 && (
                          <div className="px-2 py-3 text-xs text-center text-muted-foreground">
                            {t('ai.no_models', lang)}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {models.length} {lang === 'tr' ? 'model mevcut' : 'models available'}
                    </p>
                  </>
                ) : isDynamicProvider(form.default_provider_slug) ? (
                  <div className="border rounded-md p-3 text-center space-y-2">
                    {modelFetchError ? (
                      <p className="text-xs text-destructive">{modelFetchError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {lang === 'tr' ? 'Modelleri yuklemek icin butona basin' : 'Click button to load models'}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFetchModels}
                      disabled={loadingModels}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {t('ai.fetch_models', lang)}
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-md p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      {lang === 'tr' ? 'Bu saglayici icin model tanimlanmamis' : 'No models defined for this provider'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Word Count & Language & Tone */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t('ai.word_count', lang)}</Label>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  value={form.default_word_count}
                  onChange={(e) => setForm({ ...form, default_word_count: parseInt(e.target.value) || 1000 })}
                />
              </div>

              <div>
                <Label>{t('ai.language', lang)}</Label>
                <Select
                  value={form.default_language}
                  onValueChange={(val) => setForm({ ...form, default_language: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('ai.tone', lang)}</Label>
                <Select
                  value={form.default_tone}
                  onValueChange={(val) => setForm({ ...form, default_tone: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Generation Settings */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="image_enabled"
                  checked={form.image_enabled}
                  onCheckedChange={(checked) => {
                    setForm((f) => ({
                      ...f,
                      image_enabled: checked,
                      image_count: checked && f.image_count === 0 ? 2 : f.image_count,
                      image_layout: checked && f.image_layout.length === 0
                        ? [
                            { position: 'cover', size: '800x450' },
                            { position: 'left', size: '400x300' },
                          ]
                        : f.image_layout,
                    }));
                    if (checked && imageModels.length === 0) {
                      fetchImageModels();
                    }
                  }}
                />
                <Label htmlFor="image_enabled" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="h-4 w-4" />
                  {t('ai.add_images', lang)}
                </Label>
              </div>

              {form.image_enabled && (
                <div className="space-y-4 pl-1">
                  {/* Image Model */}
                  <div>
                    <Label>{t('ai.image_model', lang)}</Label>
                    {loadingImageModels ? (
                      <div className="border rounded-md p-3 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {t('ai.fetching_image_models', lang)}
                        </span>
                      </div>
                    ) : imageModels.length > 0 ? (
                      <Select
                        value={form.image_model}
                        onValueChange={(v) => setForm((f) => ({ ...f, image_model: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={lang === 'tr' ? 'Model secin...' : 'Select model...'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {imageModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button variant="outline" size="sm" onClick={fetchImageModels} disabled={loadingImageModels}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {t('ai.fetch_image_models', lang)}
                      </Button>
                    )}
                  </div>

                  {/* Image Style & Count */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('ai.image_style', lang)}</Label>
                      <Select
                        value={form.image_style}
                        onValueChange={(v) => setForm((f) => ({ ...f, image_style: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photographic">{t('ai.style_photographic', lang)}</SelectItem>
                          <SelectItem value="digital_art">{t('ai.style_digital_art', lang)}</SelectItem>
                          <SelectItem value="illustration">{t('ai.style_illustration', lang)}</SelectItem>
                          <SelectItem value="3d_render">{t('ai.style_3d_render', lang)}</SelectItem>
                          <SelectItem value="anime">{t('ai.style_anime', lang)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t('ai.image_count', lang)}</Label>
                      <Select
                        value={String(form.image_count)}
                        onValueChange={(v) => {
                          const count = parseInt(v);
                          setForm((f) => {
                            const newLayout = [...f.image_layout];
                            while (newLayout.length < count) {
                              newLayout.push(
                                newLayout.length === 0
                                  ? { position: 'cover', size: '800x450' }
                                  : { position: 'left', size: '400x300' }
                              );
                            }
                            while (newLayout.length > count) newLayout.pop();
                            return { ...f, image_count: count, image_layout: newLayout };
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Per-Image Layout Controls */}
                  {form.image_layout.length > 0 && (
                    <div>
                      <Label className="mb-2 block">{t('ai.image_layout', lang)}</Label>
                      <div className="space-y-2">
                        {form.image_layout.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 rounded-md border p-2">
                            <span className="text-sm font-medium w-20 shrink-0">
                              {lang === 'tr' ? `Resim ${idx + 1}:` : `Image ${idx + 1}:`}
                            </span>
                            <Select
                              value={item.position}
                              onValueChange={(pos) => {
                                setForm((f) => {
                                  const newLayout = [...f.image_layout];
                                  const size = (pos === 'cover' || pos === 'full') ? '800x450' : '400x300';
                                  newLayout[idx] = { position: pos, size };
                                  return { ...f, image_layout: newLayout };
                                });
                              }}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cover">{t('ai.position_cover', lang)}</SelectItem>
                                <SelectItem value="full">{t('ai.position_full', lang)}</SelectItem>
                                <SelectItem value="left">{t('ai.position_left', lang)}</SelectItem>
                                <SelectItem value="right">{t('ai.position_right', lang)}</SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">{item.size}</span>
                          </div>
                        ))}
                      </div>

                      {/* Preset Layout Buttons */}
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setForm((f) => {
                              const layout = f.image_layout.map((_, i) => {
                                if (i === 0) return { position: 'cover', size: '800x450' };
                                return { position: i % 2 === 1 ? 'left' : 'right', size: '400x300' };
                              });
                              return { ...f, image_layout: layout };
                            });
                          }}
                        >
                          {t('ai.layout_blog_classic', lang)}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setForm((f) => {
                              const layout = f.image_layout.map((_, i) => ({
                                position: i === 0 ? 'cover' : 'full',
                                size: '800x450',
                              }));
                              return { ...f, image_layout: layout };
                            });
                          }}
                        >
                          {t('ai.layout_magazine', lang)}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setForm((f) => {
                              const layout = f.image_layout.map(() => ({
                                position: 'full' as string,
                                size: '800x450',
                              }));
                              return { ...f, image_layout: layout };
                            });
                          }}
                        >
                          {t('ai.layout_gallery', lang)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">
                  {lang === 'tr' ? 'Aktif' : 'Active'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {lang === 'tr'
                    ? 'Bu sablonu icerik uretiminde kullanilabilir hale getir'
                    : 'Make this template available for content generation'}
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('action.cancel', lang)}
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving
                ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...')
                : t('action.save', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('action.delete', lang)} - {t('ai.prompt_template', lang)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p>
                  {lang === 'tr'
                    ? 'Bu prompt sablonunu silmek istediginize emin misiniz?'
                    : 'Are you sure you want to delete this prompt template?'}
                </p>
                <p className="text-muted-foreground mt-1">
                  {lang === 'tr'
                    ? 'Bu islem geri alinamaz.'
                    : 'This action cannot be undone.'}
                </p>
              </div>
            </div>
            {deleteTarget && (
              <div className="p-3 rounded-md bg-muted">
                <p className="font-medium text-sm">{deleteTarget.name}</p>
                {deleteTarget.description && (
                  <p className="text-xs text-muted-foreground mt-1">{deleteTarget.description}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('action.cancel', lang)}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting
                ? (lang === 'tr' ? 'Siliniyor...' : 'Deleting...')
                : t('action.delete', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
