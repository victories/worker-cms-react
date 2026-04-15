import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formatDateTime, truncate } from '@ui/lib/utils';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination, getPerPage } from '@/components/shared/Pagination';
import { useToast } from '@ui/toast-notification';
import {
  Plus, Pencil, Trash2, RefreshCw, ExternalLink, Clock, Loader2, Bot,
} from 'lucide-react';

type JobStatus = 'all' | 'pending' | 'running' | 'completed' | 'failed';

interface AiJob {
  id: number;
  site_id: number;
  prompt_id: number | null;
  provider_slug: string;
  model: string;
  prompt_text: string;
  system_prompt: string;
  scheduled_at: string;
  status: string;
  target_category_id: number | null;
  target_language: string;
  target_word_count: number;
  target_status: string;
  result_post_id: number | null;
  error_message: string | null;
  creator_name: string;
  created_at: string;
}

interface JobFormData {
  prompt_id: string;
  prompt_text: string;
  system_prompt: string;
  provider_slug: string;
  model: string;
  scheduled_at: string;
  target_category_id: string;
  target_language: string;
  target_word_count: string;
  target_status: string;
}

const EMPTY_FORM: JobFormData = {
  prompt_id: '',
  prompt_text: '',
  system_prompt: '',
  provider_slug: '',
  model: '',
  scheduled_at: '',
  target_category_id: '',
  target_language: 'tr',
  target_word_count: '1500',
  target_status: 'draft',
};

const STATUS_TABS: { value: JobStatus; labelTr: string; labelEn: string }[] = [
  { value: 'all', labelTr: 'Tümü', labelEn: 'All' },
  { value: 'pending', labelTr: 'Beklemede', labelEn: 'Pending' },
  { value: 'running', labelTr: 'Çalışıyor', labelEn: 'Running' },
  { value: 'completed', labelTr: 'Tamamlandı', labelEn: 'Completed' },
  { value: 'failed', labelTr: 'Başarısız', labelEn: 'Failed' },
];

const LANGUAGES = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'ar', label: 'العربية' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

export function AiJobs() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // List state
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');
  const [perPage, setPerPageState] = useState(getPerPage);
  const page = Number(searchParams.get('page') || '1');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<AiJob | null>(null);
  const [form, setForm] = useState<JobFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Reference data
  const [prompts, setPrompts] = useState<any[]>([]);
  const [providerDefinitions, setProviderDefinitions] = useState<any[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Computed: available models for selected provider
  const availableModels = (() => {
    if (!form.provider_slug) return [];
    const def = providerDefinitions.find((d: any) => d.slug === form.provider_slug);
    return def?.models || [];
  })();

  // Load reference data once
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Load jobs when filters change
  useEffect(() => {
    loadJobs();
  }, [page, perPage, statusFilter]);

  const loadReferenceData = async () => {
    const [promptsRes, defsRes, providersRes, catsRes] = await Promise.all([
      api.getAiPrompts(),
      api.getAiProviderDefinitions(),
      api.getAiProviders(),
      api.getTaxonomies({ type: 'category' }),
    ]);
    if (promptsRes.success) setPrompts(promptsRes.data);
    if (defsRes.success) setProviderDefinitions(defsRes.data);
    if (providersRes.success) setEnabledProviders(providersRes.data.filter((p: any) => p.is_enabled));
    if (catsRes.success) setCategories(catsRes.data);
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
    };
    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }
    const res = await api.getAiJobs(params);
    if (res.success) {
      setJobs(res.data);
      setMeta(res.meta);
    }
    setLoading(false);
  }, [page, perPage, statusFilter]);

  // Form helpers
  const updateForm = (field: keyof JobFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateDialog = () => {
    setEditingJob(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (job: AiJob) => {
    setEditingJob(job);
    setForm({
      prompt_id: job.prompt_id ? String(job.prompt_id) : '',
      prompt_text: job.prompt_text || '',
      system_prompt: job.system_prompt || '',
      provider_slug: job.provider_slug || '',
      model: job.model || '',
      scheduled_at: job.scheduled_at ? toDatetimeLocal(job.scheduled_at) : '',
      target_category_id: job.target_category_id ? String(job.target_category_id) : '',
      target_language: job.target_language || 'tr',
      target_word_count: job.target_word_count ? String(job.target_word_count) : '1500',
      target_status: job.target_status || 'draft',
    });
    setDialogOpen(true);
  };

  const handlePromptTemplateSelect = (promptId: string) => {
    updateForm('prompt_id', promptId);
    if (promptId) {
      const prompt = prompts.find((p: any) => String(p.id) === promptId);
      if (prompt) {
        updateForm('prompt_text', prompt.user_prompt || '');
        if (prompt.system_prompt) {
          updateForm('system_prompt', prompt.system_prompt);
        }
      }
    }
  };

  const handleProviderChange = (slug: string) => {
    updateForm('provider_slug', slug);
    updateForm('model', '');
  };

  const handleSave = async () => {
    if (!form.prompt_text.trim()) {
      toast(lang === 'tr' ? 'Prompt metni gereklidir' : 'Prompt text is required', 'error');
      return;
    }
    if (!form.provider_slug) {
      toast(lang === 'tr' ? 'Sağlayıcı seçiniz' : 'Please select a provider', 'error');
      return;
    }
    if (!form.model) {
      toast(lang === 'tr' ? 'Model seçiniz' : 'Please select a model', 'error');
      return;
    }
    if (!form.scheduled_at) {
      toast(lang === 'tr' ? 'Zamanlama gereklidir' : 'Schedule time is required', 'error');
      return;
    }

    setSaving(true);
    const payload: any = {
      prompt_text: form.prompt_text,
      system_prompt: form.system_prompt || null,
      provider_slug: form.provider_slug,
      model: form.model,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      target_category_id: form.target_category_id ? Number(form.target_category_id) : null,
      target_language: form.target_language,
      target_word_count: Number(form.target_word_count) || 1500,
      target_status: form.target_status,
    };
    if (form.prompt_id) {
      payload.prompt_id = Number(form.prompt_id);
    }

    try {
      let res: any;
      if (editingJob) {
        res = await api.updateAiJob(editingJob.id, payload);
      } else {
        res = await api.createAiJob(payload);
      }

      if (res.success) {
        toast(
          editingJob
            ? (lang === 'tr' ? 'Görev güncellendi' : 'Job updated')
            : (lang === 'tr' ? 'Görev oluşturuldu' : 'Job created'),
          'success'
        );
        setDialogOpen(false);
        loadJobs();
      } else {
        toast((res as any).error || (lang === 'tr' ? 'Bir hata oluştu' : 'An error occurred'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Bir hata oluştu' : 'An error occurred', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      const res: any = await api.deleteAiJob(deleteId);
      if (res.success) {
        toast(lang === 'tr' ? 'Görev silindi' : 'Job deleted', 'success');
        loadJobs();
      } else {
        toast((res as any).error || (lang === 'tr' ? 'Silme başarısız' : 'Delete failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Silme başarısız' : 'Delete failed', 'error');
    }
    setDeleteId(null);
  };

  const handleRetry = async (id: number) => {
    try {
      const res: any = await api.retryAiJob(id);
      if (res.success) {
        toast(lang === 'tr' ? 'Görev tekrar kuyruğa alındı' : 'Job requeued', 'success');
        loadJobs();
      } else {
        toast((res as any).error || (lang === 'tr' ? 'Tekrar deneme başarısız' : 'Retry failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Tekrar deneme başarısız' : 'Retry failed', 'error');
    }
  };

  // Status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">{t('status.pending', lang)}</Badge>;
      case 'running':
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {lang === 'tr' ? 'Çalışıyor' : 'Running'}
          </Badge>
        );
      case 'completed':
        return <Badge variant="success">{lang === 'tr' ? 'Tamamlandı' : 'Completed'}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{lang === 'tr' ? 'Başarısız' : 'Failed'}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">
            {lang === 'tr' ? 'Zamanlı Üretim' : 'Scheduled Generation'}
          </h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {lang === 'tr' ? 'Yeni Görev' : 'New Job'}
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setSearchParams({ page: '1' });
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {lang === 'tr' ? tab.labelTr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{lang === 'tr' ? 'Henüz zamanlı görev yok' : 'No scheduled jobs yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">
                      {lang === 'tr' ? 'Prompt' : 'Prompt'}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">{t('ai.provider', lang)}</th>
                    <th className="text-left py-3 px-2 font-medium">{t('ai.model', lang)}</th>
                    <th className="text-left py-3 px-2 font-medium">{t('ai.scheduled_at', lang)}</th>
                    <th className="text-left py-3 px-2 font-medium">
                      {lang === 'tr' ? 'Durum' : 'Status'}
                    </th>
                    <th className="text-left py-3 px-2 font-medium">
                      {lang === 'tr' ? 'Oluşturan' : 'Creator'}
                    </th>
                    <th className="text-right py-3 px-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-2 max-w-[280px]">
                        <span className="block truncate" title={job.prompt_text}>
                          {truncate(job.prompt_text || '-', 60)}
                        </span>
                        {job.error_message && job.status === 'failed' && (
                          <span className="block text-xs text-destructive mt-0.5 truncate" title={job.error_message}>
                            {truncate(job.error_message, 80)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {job.provider_slug}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap font-mono text-xs">
                        {job.model}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(job.scheduled_at, lang)}
                        </div>
                      </td>
                      <td className="py-3 px-2">{renderStatusBadge(job.status)}</td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {job.creator_name || '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          {/* Edit: only pending */}
                          {job.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(job)}
                              title={lang === 'tr' ? 'Düzenle' : 'Edit'}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Retry: only failed */}
                          {job.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetry(job.id)}
                              title={t('ai.retry', lang)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}

                          {/* View Post: if result_post_id */}
                          {job.result_post_id && (
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                to={`/posts/${job.result_post_id}`}
                                title={lang === 'tr' ? 'Yazıyı Gör' : 'View Post'}
                              >
                                <ExternalLink className="h-4 w-4 text-primary" />
                              </Link>
                            </Button>
                          )}

                          {/* Delete: not running */}
                          {job.status !== 'running' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(job.id)}
                              title={t('action.delete', lang)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.total_pages}
              total={meta.total}
              perPage={perPage}
              onPageChange={(p) => setSearchParams({ page: String(p) })}
              onPerPageChange={(pp) => {
                setPerPageState(pp);
                setSearchParams({ page: '1' });
              }}
              lang={lang}
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingJob
                ? (lang === 'tr' ? 'Görevi Düzenle' : 'Edit Job')
                : (lang === 'tr' ? 'Yeni Görev' : 'New Job')}
            </DialogTitle>
            <DialogDescription>
              {lang === 'tr'
                ? 'Zamanlı AI içerik üretim görevi oluşturun.'
                : 'Create a scheduled AI content generation job.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Prompt template selector */}
            <div className="space-y-2">
              <Label>{t('ai.prompt_template', lang)}</Label>
              <Select
                value={form.prompt_id}
                onValueChange={handlePromptTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={lang === 'tr' ? 'Şablon seçin (opsiyonel)' : 'Select template (optional)'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {lang === 'tr' ? 'Şablon kullanma' : 'No template'}
                  </SelectItem>
                  {prompts.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prompt text */}
            <div className="space-y-2">
              <Label>{t('ai.user_prompt', lang)} *</Label>
              <Textarea
                value={form.prompt_text}
                onChange={(e) => updateForm('prompt_text', e.target.value)}
                rows={4}
                placeholder={lang === 'tr' ? 'Üretilecek içerik hakkında prompt yazın...' : 'Write a prompt about the content to generate...'}
              />
            </div>

            {/* System prompt */}
            <div className="space-y-2">
              <Label>{t('ai.system_prompt', lang)}</Label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => updateForm('system_prompt', e.target.value)}
                rows={2}
                placeholder={lang === 'tr' ? 'Sistem promptu (opsiyonel)' : 'System prompt (optional)'}
              />
            </div>

            {/* Provider + Model row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('ai.provider', lang)} *</Label>
                <Select
                  value={form.provider_slug}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={lang === 'tr' ? 'Sağlayıcı seçin' : 'Select provider'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledProviders.map((p: any) => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {p.display_name || p.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('ai.model', lang)} *</Label>
                <Select
                  value={form.model}
                  onValueChange={(v) => updateForm('model', v)}
                  disabled={!form.provider_slug}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={lang === 'tr' ? 'Model seçin' : 'Select model'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m: any) => (
                      <SelectItem key={typeof m === 'string' ? m : m.id} value={typeof m === 'string' ? m : m.id}>
                        {typeof m === 'string' ? m : m.name || m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule time */}
            <div className="space-y-2">
              <Label>{t('ai.scheduled_at', lang)} *</Label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => updateForm('scheduled_at', e.target.value)}
              />
            </div>

            {/* Target category + Language row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('ai.target_category', lang)}</Label>
                <Select
                  value={form.target_category_id}
                  onValueChange={(v) => updateForm('target_category_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={lang === 'tr' ? 'Kategori seçin' : 'Select category'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {lang === 'tr' ? 'Kategori yok' : 'No category'}
                    </SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('ai.language', lang)}</Label>
                <Select
                  value={form.target_language}
                  onValueChange={(v) => updateForm('target_language', v)}
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
            </div>

            {/* Word count + Post status row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('ai.word_count', lang)}</Label>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  value={form.target_word_count}
                  onChange={(e) => updateForm('target_word_count', e.target.value)}
                  placeholder="1500"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('ai.target_status', lang)}</Label>
                <Select
                  value={form.target_status}
                  onValueChange={(v) => updateForm('target_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('status.draft', lang)}</SelectItem>
                    <SelectItem value="publish">{t('status.published', lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('action.cancel', lang)}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingJob ? t('action.save', lang) : t('action.create', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title={lang === 'tr' ? 'Görevi Sil' : 'Delete Job'}
        description={lang === 'tr' ? 'Bu görev kalıcı olarak silinecek. Devam etmek istiyor musunuz?' : 'This job will be permanently deleted. Do you want to continue?'}
        confirmLabel={t('action.delete', lang)}
        cancelLabel={t('action.cancel', lang)}
        variant="destructive"
      />
    </div>
  );
}

/**
 * Convert an ISO date string to a datetime-local input value (YYYY-MM-DDTHH:mm).
 */
function toDatetimeLocal(isoString: string): string {
  try {
    const date = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return '';
  }
}
