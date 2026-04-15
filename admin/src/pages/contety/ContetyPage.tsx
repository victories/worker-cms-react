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
import {
  Loader2, Save, Plug, RefreshCw, FileText, Send, Clock, History, Settings, Zap,
  Eye, EyeOff, ChevronLeft, ChevronRight, File,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@ui/dropdown-menu';

type TabKey = 'settings' | 'generate' | 'contents' | 'logs';

interface ContetyConfig {
  api_key?: string;
  is_enabled?: boolean;
  auto_import?: boolean;
  default_post_status?: string;
  default_model?: string;
  default_language?: string;
  default_category_id?: number;
}

interface ContetyGlobalConfig {
  api_key?: string;
}

interface LanguageOption {
  code: string;
  name: string;
}

interface TemplateOption {
  slug: string;
  name: string;
  description?: string;
}

interface ToneOfVoice {
  slug: string;
  name: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ContentItem {
  id: number | string;
  title?: string;
  template?: string;
  status: string;
  created_at?: string;
  post_id?: number;
  post_url?: string;
  folder_id?: number | null;
  folder_name?: string | null;
}

interface LogItem {
  id: number;
  created_at: string;
  action: string;
  content_id?: number | string;
  post_id?: number;
  credits_used?: number;
  status: string;
  message?: string;
}

const AI_MODELS = [
  { id: 'gpt4_1', name: 'GPT-4.1' },
  { id: 'gpt4_1_mini', name: 'GPT-4.1 Mini' },
  { id: 'gpt4_1_nano', name: 'GPT-4.1 Nano' },
  { id: 'gpt4o', name: 'GPT-4o' },
  { id: 'gpt4o_mini', name: 'GPT-4o Mini' },
  { id: 'o3', name: 'o3' },
  { id: 'o3_mini', name: 'o3-mini' },
  { id: 'o4_mini', name: 'o4-mini' },
  { id: 'claude_3_7_sonnet', name: 'Claude 3.7 Sonnet' },
  { id: 'claude_3_5_haiku', name: 'Claude 3.5 Haiku' },
  { id: 'gemini_2_5_pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini_2_0_flash', name: 'Gemini 2.0 Flash' },
  { id: 'deepseek_v3', name: 'DeepSeek V3' },
  { id: 'deepseek_r1', name: 'DeepSeek R1' },
  { id: 'llama4_scout', name: 'Llama 4 Scout' },
  { id: 'llama4_maverick', name: 'Llama 4 Maverick' },
];

const POST_STATUSES = [
  { id: 'draft', name: 'Taslak (Draft)' },
  { id: 'publish', name: 'Yayinda (Publish)' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'processing':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">İşleniyor</Badge>;
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 border-green-300">Tamamlandi</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 border-red-300">Basarisiz</Badge>;
    case 'imported':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Import Edildi</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ContetyPage() {
  const { lang, user } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<TabKey>('settings');
  const [loading, setLoading] = useState(true);

  // Settings state
  const [config, setConfig] = useState<ContetyConfig>({});
  const [globalConfig, setGlobalConfig] = useState<ContetyGlobalConfig>({});
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [globalApiKeyInput, setGlobalApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGlobalApiKey, setShowGlobalApiKey] = useState(false);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ account?: string; credits?: number } | null>(null);

  // Generate state
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [toneOfVoices, setToneOfVoices] = useState<ToneOfVoice[]>([]);
  const [genTemplate, setGenTemplate] = useState('');
  const [genFocusKeyword, setGenFocusKeyword] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [genSubheadings, setGenSubheadings] = useState('');
  const [genProductText, setGenProductText] = useState('');
  const [genContentCount, setGenContentCount] = useState(1);
  const [genModel, setGenModel] = useState('');
  const [genLanguage, setGenLanguage] = useState('');
  const [genTone, setGenTone] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ id?: string | number; message?: string } | null>(null);

  // Contents state
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [importingId, setImportingId] = useState<string | number | null>(null);
  const [hideImported, setHideImported] = useState(true);
  const [filterFolder, setFilterFolder] = useState<string>('all');

  // Logs state
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);

  // Load initial settings data
  useEffect(() => {
    loadSettings();
  }, []);

  // Load tab-specific data when switching tabs or filter changes
  useEffect(() => {
    if (activeTab === 'generate' && templates.length === 0) {
      loadGenerateData();
    }
    if (activeTab === 'contents') {
      loadContents();
    }
    if (activeTab === 'logs') {
      loadLogs(1);
    }
  }, [activeTab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        api.getContetyConfig(),
        api.getContetyLanguages(),
        api.getTaxonomies({ type: 'category' }),
      ];
      if (isSuperAdmin) {
        promises.push(api.getContetyGlobalConfig());
      }

      const results = await Promise.all(promises);
      const [configRes, langRes, catRes] = results;
      const globalRes = isSuperAdmin ? results[3] : null;

      if (configRes?.success && configRes.data) {
        setConfig(configRes.data);
      }
      if (langRes?.success && Array.isArray(langRes.data)) {
        setLanguages(langRes.data);
      }
      if (catRes?.success && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }
      if (globalRes?.success && globalRes.data) {
        setGlobalConfig(globalRes.data);
      }
    } catch {
      toast('Ayarlar yuklenemedi', 'error');
    }
    setLoading(false);
  };

  const loadGenerateData = async () => {
    try {
      const [tplRes, toneRes] = await Promise.all([
        api.getContetyTemplates(),
        api.getContetyToneOfVoices(),
      ]);
      console.log('[contety] tplRes:', JSON.stringify(tplRes));
      if (tplRes?.success && Array.isArray(tplRes.data)) {
        const mapped = tplRes.data.map((t: any) => ({
          slug: t.slug || t.code || String(t.id),
          name: t.name || t.name_tr || t.name_en || '',
          description: t.description || '',
        }));
        console.log('[contety] mapped templates:', JSON.stringify(mapped));
        setTemplates(mapped);
      } else {
        console.warn('[contety] templates response invalid:', tplRes);
      }
      if (toneRes?.success && Array.isArray(toneRes.data)) {
        setToneOfVoices(toneRes.data.map((t: any) => ({
          slug: t.slug || t.code || String(t.id),
          name: t.name || t.name_tr || t.name_en || '',
        })));
      }
    } catch {
      toast('Sablonlar yuklenemedi', 'error');
    }
  };

  const loadContents = async () => {
    setLoadingContents(true);
    try {
      const [pendingRes, contentsRes] = await Promise.all([
        api.getContetyPending(),
        api.getContetyContents({}),
      ]);
      const items: ContentItem[] = [];
      if (pendingRes?.success && Array.isArray(pendingRes.data)) {
        items.push(...pendingRes.data);
      }
      if (contentsRes?.success && Array.isArray(contentsRes.data)) {
        const pendingIds = new Set(items.map((i) => String(i.id)));
        for (const c of contentsRes.data) {
          if (!pendingIds.has(String(c.id))) {
            items.push(c);
          }
        }
      }
      setContents(items);
    } catch {
      toast('Icerikler yuklenemedi', 'error');
    }
    setLoadingContents(false);
  };

  const loadLogs = async (page: number) => {
    setLoadingLogs(true);
    try {
      const res = await api.getContetyLogs({ page: String(page), per_page: '20' }) as any;
      if (res?.success) {
        setLogs(Array.isArray(res.data) ? res.data : []);
        setLogsPage(page);
        setLogsTotalPages(res.meta?.total_pages || 1);
      }
    } catch {
      toast('Loglar yuklenemedi', 'error');
    }
    setLoadingLogs(false);
  };

  // Settings handlers
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testContetyConnection();
      if (res?.success && res.data) {
        setTestResult({
          account: typeof res.data.account === 'object' && res.data.account !== null
            ? (res.data.account.name || res.data.account.email || '')
            : (res.data.account || res.data.email || res.data.name || ''),
          credits: res.data.subscription
            ? (res.data.subscription.total_credits - res.data.subscription.used_credits)
            : (res.data.credits ?? res.data.credit_balance ?? res.data.balance),
        });
        toast('Baglanti basarili!', 'success');
      } else {
        toast(res?.error || 'Baglanti testi basarisiz', 'error');
      }
    } catch {
      toast('Baglanti testi basarisiz', 'error');
    }
    setTesting(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        is_enabled: config.is_enabled ? 1 : 0,
        auto_import: config.auto_import ? 1 : 0,
        default_post_status: config.default_post_status || 'draft',
        default_model: config.default_model || '',
        default_language: config.default_language || '',
        default_category_id: config.default_category_id || null,
      };
      if (apiKeyInput) {
        body.api_key = apiKeyInput;
      }

      const res = await api.updateContetyConfig(body) as any;
      if (res?.success) {
        toast('Ayarlar kaydedildi', 'success');
        setApiKeyInput('');
        await loadSettings();
      } else {
        toast(res?.error || 'Kaydetme basarisiz', 'error');
      }
    } catch {
      toast('Kaydetme basarisiz', 'error');
    }
    setSaving(false);
  };

  const handleSaveGlobalSettings = async () => {
    setSavingGlobal(true);
    try {
      const body: Record<string, unknown> = {};
      if (globalApiKeyInput) {
        body.api_key = globalApiKeyInput;
      }

      const res = await api.updateContetyGlobalConfig(body) as any;
      if (res?.success) {
        toast('Global ayarlar kaydedildi', 'success');
        setGlobalApiKeyInput('');
        await loadSettings();
      } else {
        toast(res?.error || 'Kaydetme basarisiz', 'error');
      }
    } catch {
      toast('Kaydetme basarisiz', 'error');
    }
    setSavingGlobal(false);
  };

  // Generate handler
  const handleGenerate = async () => {
    if (!genTemplate) {
      toast('Lutfen bir sablon secin', 'error');
      return;
    }
    setGenerating(true);
    setGeneratedResult(null);
    try {
      const body: Record<string, unknown> = {
        template: genTemplate,
      };

      if (genTemplate === 'wordpress-blog-post') {
        body.focus_keyword = genFocusKeyword;
        body.title = genTitle;
        if (genSubheadings.trim()) {
          body.subheadings = genSubheadings.split('\n').filter((s) => s.trim());
        }
      } else {
        body.product_text = genProductText;
        body.content_count = genContentCount;
      }

      if (genModel) body.model = genModel;
      if (genLanguage) body.language = genLanguage;
      if (genTone) body.tone_of_voice = genTone;

      const res = await api.generateContetyContent(body);
      if (res?.success) {
        setGeneratedResult({
          id: res.data?.id || res.data?.content_id,
          message: res.data?.message || 'Icerik olusturma basladi',
        });
        toast('Icerik olusturma baslatildi!', 'success');
        // Reset form
        setGenFocusKeyword('');
        setGenTitle('');
        setGenSubheadings('');
        setGenProductText('');
        setGenContentCount(1);
      } else {
        toast(res?.error || 'Icerik olusturulamadi', 'error');
      }
    } catch {
      toast('Icerik olusturulamadi', 'error');
    }
    setGenerating(false);
  };

  // Import handler
  const handleImport = async (id: string | number, postType: 'post' | 'page' = 'post') => {
    setImportingId(id);
    try {
      const res = await api.importContetyContent(Number(id), postType);
      if (res?.success) {
        toast(`Icerik ${postType === 'page' ? 'sayfa' : 'yazi'} olarak import edildi!`, 'success');
        await loadContents();
      } else {
        toast(res?.error || 'Import basarisiz', 'error');
      }
    } catch {
      toast('Import basarisiz', 'error');
    }
    setImportingId(null);
  };

  // Tab definitions
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'settings', label: 'Ayarlar', icon: <Settings className="h-4 w-4" /> },
    { key: 'generate', label: 'Icerik Olustur', icon: <Zap className="h-4 w-4" /> },
    { key: 'contents', label: 'Icerikler', icon: <FileText className="h-4 w-4" /> },
    { key: 'logs', label: 'Loglar', icon: <History className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Yukleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Contety Bot</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Ayarlar */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Ayarlari</CardTitle>
              <CardDescription>Contety API baglanti ve genel ayarlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* API Key */}
              <div>
                <Label>API Anahtari</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={config.api_key ? '••••••••••••••••' : 'Contety API anahtarinizi girin...'}
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {config.api_key && !apiKeyInput && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-xs font-mono">{config.api_key}</Badge>
                    <span className="text-xs text-muted-foreground">API anahtari kayitli</span>
                  </div>
                )}
              </div>

              {/* Connection Test */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4 mr-2" />
                  )}
                  Baglanti Testi
                </Button>
                {testResult && (
                  <div className="flex items-center gap-3 text-sm">
                    {testResult.account && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Hesap: {testResult.account}
                      </Badge>
                    )}
                    {testResult.credits !== undefined && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Kredi: {testResult.credits}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Contety Bot</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bot'u aktif veya pasif yapin
                  </p>
                </div>
                <Switch
                  checked={!!config.is_enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
                />
              </div>

              {/* Auto Import */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Otomatik Import</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tamamlanan icerikler otomatik olarak import edilsin
                  </p>
                </div>
                <Switch
                  checked={!!config.auto_import}
                  onCheckedChange={(checked) => setConfig({ ...config, auto_import: checked })}
                />
              </div>

              <Separator />

              {/* Default Post Status */}
              <div>
                <Label>Varsayilan Yazi Durumu</Label>
                <Select
                  value={config.default_post_status || 'draft'}
                  onValueChange={(v) => setConfig({ ...config, default_post_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Durum secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Default AI Model */}
              <div>
                <Label>Varsayilan AI Model</Label>
                <Select
                  value={config.default_model || ''}
                  onValueChange={(v) => setConfig({ ...config, default_model: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Model secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Default Language */}
              <div>
                <Label>Varsayilan Dil</Label>
                <Select
                  value={config.default_language || ''}
                  onValueChange={(v) => setConfig({ ...config, default_language: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dil secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Default Category */}
              <div>
                <Label>Varsayilan Kategori</Label>
                <Select
                  value={config.default_category_id ? String(config.default_category_id) : ''}
                  onValueChange={(v) => setConfig({ ...config, default_category_id: v ? Number(v) : undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Save Button */}
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            </CardContent>
          </Card>

          {/* Global Settings - only for super_admin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Global Ayarlar</CardTitle>
                <CardDescription>
                  Tum siteler icin gecerli olan global Contety API anahtari.
                  Site bazinda anahtar tanimlanmamissa bu anahtar kullanilir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Global API Anahtari</Label>
                  <div className="relative">
                    <Input
                      type={showGlobalApiKey ? 'text' : 'password'}
                      value={globalApiKeyInput}
                      onChange={(e) => setGlobalApiKeyInput(e.target.value)}
                      placeholder={globalConfig.api_key ? '••••••••••••••••' : 'Global API anahtari...'}
                      className="font-mono text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGlobalApiKey(!showGlobalApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGlobalApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {globalConfig.api_key && !globalApiKeyInput && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-xs font-mono">{globalConfig.api_key}</Badge>
                      <span className="text-xs text-muted-foreground">Global API anahtari kayitli</span>
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveGlobalSettings} disabled={savingGlobal}>
                  {savingGlobal ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Global Ayarlari Kaydet
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Icerik Olustur */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Icerik Olustur</CardTitle>
              <CardDescription>Contety ile AI destekli icerik uretimi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Template Select */}
              <div>
                <Label>Sablon</Label>
                <Select value={genTemplate} onValueChange={(v) => setGenTemplate(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sablon secin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.slug} value={tpl.slug}>
                        <div>
                          <span>{tpl.name}</span>
                          {tpl.description && (
                            <span className="text-xs text-muted-foreground ml-2">- {tpl.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template-specific fields */}
              {genTemplate === 'wordpress-blog-post' && (
                <>
                  <div>
                    <Label>Odak Anahtar Kelime</Label>
                    <Input
                      value={genFocusKeyword}
                      onChange={(e) => setGenFocusKeyword(e.target.value)}
                      placeholder="Ornegin: React ile web gelistirme"
                    />
                  </div>
                  <div>
                    <Label>Baslik</Label>
                    <Input
                      value={genTitle}
                      onChange={(e) => setGenTitle(e.target.value)}
                      placeholder="Icerik basligi..."
                    />
                  </div>
                  <div>
                    <Label>Alt Basliklar (her satira bir tane)</Label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={genSubheadings}
                      onChange={(e) => setGenSubheadings(e.target.value)}
                      placeholder={"React Nedir?\nReact Nasil Kurulur?\nReact ile Ilk Proje"}
                    />
                  </div>
                </>
              )}

              {genTemplate && genTemplate !== 'wordpress-blog-post' && (
                <>
                  <div>
                    <Label>Urun / Konu Metni</Label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={genProductText}
                      onChange={(e) => setGenProductText(e.target.value)}
                      placeholder="Icerik hakkinda detayli metin girin..."
                    />
                  </div>
                  <div>
                    <Label>Icerik Sayisi</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={genContentCount}
                      onChange={(e) => setGenContentCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </>
              )}

              {genTemplate && (
                <>
                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* AI Model Override */}
                    <div>
                      <Label>
                        AI Model
                        <span className="text-xs text-muted-foreground ml-1">(opsiyonel)</span>
                      </Label>
                      <Select value={genModel || '__default__'} onValueChange={(v) => setGenModel(v === '__default__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Varsayilan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Varsayilan</SelectItem>
                          {AI_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language Override */}
                    <div>
                      <Label>
                        Dil
                        <span className="text-xs text-muted-foreground ml-1">(opsiyonel)</span>
                      </Label>
                      <Select value={genLanguage || '__default__'} onValueChange={(v) => setGenLanguage(v === '__default__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Varsayilan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Varsayilan</SelectItem>
                          {languages.map((l) => (
                            <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tone of Voice */}
                    <div>
                      <Label>
                        Ses Tonu
                        <span className="text-xs text-muted-foreground ml-1">(opsiyonel)</span>
                      </Label>
                      <Select value={genTone || '__default__'} onValueChange={(v) => setGenTone(v === '__default__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Secin..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__default__">Yok</SelectItem>
                          {toneOfVoices.map((t) => (
                            <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <Button onClick={handleGenerate} disabled={generating}>
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Icerik Olustur
                    </Button>

                    {generatedResult && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <Clock className="h-3 w-3 mr-1" />
                          {generatedResult.message}
                        </Badge>
                        {generatedResult.id && (
                          <Badge variant="outline">ID: {generatedResult.id}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Icerikler */}
      {activeTab === 'contents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Icerikler</h2>
            <div className="flex items-center gap-4">
              {(() => {
                const folderOpts = Array.from(new Set(
                  contents.map((c) => c.folder_name).filter((n): n is string => !!n)
                )).sort();
                return folderOpts.length > 0 ? (
                  <Select value={filterFolder} onValueChange={setFilterFolder}>
                    <SelectTrigger className="w-[220px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tum Siteler</SelectItem>
                      {folderOpts.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                      <SelectItem value="__none__">Site Atanmamis</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null;
              })()}
              <div className="flex items-center gap-2">
                <Switch
                  checked={hideImported}
                  onCheckedChange={setHideImported}
                  id="hide-imported"
                />
                <Label htmlFor="hide-imported" className="text-sm cursor-pointer">
                  Import edilenleri gizle
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={loadContents} disabled={loadingContents}>
                {loadingContents ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Yenile
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingContents ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground text-sm">Yukleniyor...</span>
                </div>
              ) : (() => {
                // Extract unique folder names from loaded contents for the filter
                const folderNames = Array.from(new Set(
                  contents.map((c) => c.folder_name).filter((n): n is string => !!n)
                )).sort();
                const hasFolders = folderNames.length > 0;

                const filtered = contents.filter((item) => {
                  if (hideImported && item.status === 'imported') return false;
                  if (filterFolder === 'all') return true;
                  if (filterFolder === '__none__') return !item.folder_name;
                  return item.folder_name === filterFolder;
                });
                return filtered.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>{hideImported && contents.length > 0 ? 'Tum icerikler import edilmis' : 'Henuz icerik bulunmuyor'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">ID</th>
                        <th className="text-left p-3 font-medium">Baslik</th>
                        {hasFolders && <th className="text-left p-3 font-medium">Site</th>}
                        <th className="text-left p-3 font-medium">Sablon</th>
                        <th className="text-left p-3 font-medium">Durum</th>
                        <th className="text-left p-3 font-medium">Tarih</th>
                        <th className="text-left p-3 font-medium">Islem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{item.id}</td>
                          <td className="p-3 max-w-[200px] truncate">{item.title || '-'}</td>
                          {hasFolders && (
                            <td className="p-3">
                              {item.folder_name ? (
                                <Badge variant="secondary" className="text-xs">{item.folder_name}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          )}
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">{item.template || '-'}</Badge>
                          </td>
                          <td className="p-3">{statusBadge(item.status)}</td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {item.created_at ? new Date(item.created_at).toLocaleString('tr-TR') : '-'}
                          </td>
                          <td className="p-3">
                            {item.status === 'completed' && (
                              importingId === item.id ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Import ediliyor...
                                </span>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                      <Send className="h-3 w-3 mr-1" />
                                      Import Et
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleImport(item.id, 'post')}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Yazi olarak import et
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleImport(item.id, 'page')}>
                                      <File className="h-4 w-4 mr-2" />
                                      Sayfa olarak import et
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )
                            )}
                            {item.status === 'imported' && item.post_url && (
                              <a
                                href={item.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Yaziyi Gor
                              </a>
                            )}
                            {item.status === 'imported' && !item.post_url && item.post_id && (
                              <Badge variant="outline" className="text-xs">
                                Post #{item.post_id}
                              </Badge>
                            )}
                            {item.status === 'processing' && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Isleniyor...
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Loglar */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Loglar</h2>
            <Button variant="outline" size="sm" onClick={() => loadLogs(1)} disabled={loadingLogs}>
              {loadingLogs ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Yenile
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground text-sm">Yukleniyor...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Henuz log bulunmuyor</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Tarih</th>
                        <th className="text-left p-3 font-medium">Islem</th>
                        <th className="text-left p-3 font-medium">Icerik ID</th>
                        <th className="text-left p-3 font-medium">Post ID</th>
                        <th className="text-left p-3 font-medium">Kredi</th>
                        <th className="text-left p-3 font-medium">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '-'}
                          </td>
                          <td className="p-3">{log.action || '-'}</td>
                          <td className="p-3 font-mono text-xs">{log.content_id ?? '-'}</td>
                          <td className="p-3 font-mono text-xs">{log.post_id ?? '-'}</td>
                          <td className="p-3">
                            {log.credits_used !== undefined && log.credits_used !== null ? (
                              <Badge variant="outline" className="text-xs">{log.credits_used}</Badge>
                            ) : '-'}
                          </td>
                          <td className="p-3">{statusBadge(log.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {logsTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Sayfa {logsPage} / {logsTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={logsPage <= 1 || loadingLogs}
                      onClick={() => loadLogs(logsPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={logsPage >= logsTotalPages || loadingLogs}
                      onClick={() => loadLogs(logsPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
