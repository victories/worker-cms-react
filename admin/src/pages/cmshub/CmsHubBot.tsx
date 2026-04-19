import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Input } from '@ui/input';
import { Button } from '@ui/button';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Separator } from '@ui/separator';
import { useToast } from '@ui/toast-notification';
import { Bot, KeyRound, Trash2, RefreshCw, ExternalLink, AlertCircle, CheckCircle2, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type Org = { id: string; name: string; slug: string; credit_balance: number };

type ConfigState = {
  loading: boolean;
  has_key: boolean;
  key_hint?: string;
  valid?: boolean;
  error?: string;
  organization?: Org | null;
};

type Site = {
  id: string;
  name: string;
  site_url: string;
  platform: string;
  seo_plugin: string | null;
  default_status: string | null;
  connection_status: string | null;
};

type Content = {
  id: string;
  title: string;
  slug: string | null;
  focus_keyword: string | null;
  status: string;
  site_id: string | null;
  ai_model: string | null;
  ai_credits_consumed: number | null;
  published_at: number | null;
  remote_post_url: string | null;
  created_at: number;
  updated_at: number;
};

function formatTs(ts: number | null): string {
  if (!ts) return '-';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return new Date(ms).toLocaleString();
}

// cms-hub stores balances as micro-dollars (1 USD = 1,000,000). Render as
// "$11.433791" — 6 fractional digits.
function formatCredits(micro: number | null | undefined): string {
  const n = micro ?? 0;
  return `$${(n / 1_000_000).toFixed(6)}`;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    published: { label: 'published', className: 'border-green-500 text-green-700' },
    draft: { label: 'draft', className: 'border-gray-400 text-gray-600' },
    generating: { label: 'generating', className: 'border-amber-500 text-amber-700' },
    dispatching: { label: 'dispatching', className: 'border-blue-500 text-blue-700' },
    failed: { label: 'failed', className: 'border-red-500 text-red-700' },
    pending: { label: 'pending', className: 'border-purple-500 text-purple-700' },
  };
  const cfg = map[status] ?? { label: status, className: 'border-muted text-muted-foreground' };
  return <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>;
}

export function CmsHubBot() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const tr = lang === 'tr';

  const [cfg, setCfg] = useState<ConfigState>({ loading: true, has_key: false });
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'sites' | 'content'>('sites');

  const [sites, setSites] = useState<Site[] | null>(null);
  const [content, setContent] = useState<Content[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  async function loadConfig() {
    setCfg((c) => ({ ...c, loading: true }));
    try {
      const res = await api.getCmsHubConfig();
      setCfg({ loading: false, ...res.data });
    } catch (err: any) {
      setCfg({ loading: false, has_key: false, error: err?.message ?? 'load failed' });
    }
  }

  async function loadList(which: 'sites' | 'content') {
    setListLoading(true);
    setListError(null);
    try {
      if (which === 'sites') {
        const res = await api.getCmsHubSites();
        if (!res.success) throw new Error(res.error ?? 'load failed');
        setSites(res.data?.sites ?? []);
      } else {
        const res = await api.getCmsHubContent();
        if (!res.success) throw new Error(res.error ?? 'load failed');
        setContent(res.data?.content ?? []);
      }
    } catch (err: any) {
      setListError(err?.message ?? 'load failed');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { loadConfig(); }, []);

  // After we know we have a valid key, auto-load the active tab's data
  useEffect(() => {
    if (cfg.has_key && cfg.valid) {
      loadList(tab);
    }
  }, [cfg.has_key, cfg.valid, tab]);

  async function handleSave() {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      toast(tr ? 'API anahtarı gerekli' : 'API key required', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await api.saveCmsHubConfig(trimmed);
      if (!res.success) {
        toast(res.error ?? (tr ? 'Doğrulama başarısız' : 'Verification failed'), 'error');
      } else {
        toast(tr ? 'Bağlandı' : 'Connected', 'success');
        setKeyInput('');
        await loadConfig();
      }
    } catch (err: any) {
      toast(err?.message ?? 'error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(tr ? 'API anahtarını silmek istediğinden emin misin?' : 'Delete API key?')) return;
    try {
      await api.deleteCmsHubConfig();
      setSites(null);
      setContent(null);
      await loadConfig();
      toast(tr ? 'Anahtar silindi' : 'Key deleted', 'success');
    } catch (err: any) {
      toast(err?.message ?? 'error', 'error');
    }
  }

  // ---- Render ----

  if (cfg.loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {tr ? 'Yükleniyor...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">WorkerCms AI Bot</h1>
          <p className="text-sm text-muted-foreground">
            {tr
              ? 'cms-hub (bot.workercms.com) içeriklerini ve sitelerini buradan görüntüle.'
              : 'Browse content and sites from cms-hub (bot.workercms.com).'}
          </p>
        </div>
      </div>

      {!cfg.has_key && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {tr ? 'API Anahtarı Bağla' : 'Connect API Key'}
            </CardTitle>
            <CardDescription>
              {tr
                ? "bot.workercms.com → API Anahtarları sayfasından bir anahtar oluştur, 'cms_live_' ile başlayan değeri buraya yapıştır."
                : "Create a key in bot.workercms.com → API Keys, then paste the 'cms_live_' value below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="api_key">{tr ? 'API Anahtarı' : 'API Key'}</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="cms_live_..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (tr ? 'Doğrulanıyor...' : 'Verifying...') : (tr ? 'Kaydet ve Test Et' : 'Save & Test')}
            </Button>
          </CardContent>
        </Card>
      )}

      {cfg.has_key && cfg.valid === false && (
        <Card className="border-red-300 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              {tr ? 'Bağlantı Hatası' : 'Connection Error'}
            </CardTitle>
            <CardDescription className="text-red-700">
              {tr ? 'Kayıtlı anahtar:' : 'Stored key:'} <code className="font-mono">{cfg.key_hint}</code>
              <br />
              {tr ? 'Hata:' : 'Error:'} {cfg.error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              {tr ? 'Anahtarı Sıfırla' : 'Reset Key'}
            </Button>
          </CardContent>
        </Card>
      )}

      {cfg.has_key && cfg.valid && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">{cfg.organization?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{cfg.key_hint}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1 font-mono">
                    <Coins className="h-3 w-3" />
                    {formatCredits(cfg.organization?.credit_balance)}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={loadConfig}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    {tr ? 'Anahtarı Sıfırla' : 'Reset Key'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 border-b">
            <button
              type="button"
              onClick={() => setTab('sites')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === 'sites' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tr ? 'Siteler' : 'Sites'} {sites && <span className="text-muted-foreground">({sites.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setTab('content')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === 'content' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tr ? 'İçerikler' : 'Content'} {content && <span className="text-muted-foreground">({content.length})</span>}
            </button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => loadList(tab)} disabled={listLoading}>
              <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {listError && (
            <Card className="border-red-300 bg-red-50/50">
              <CardContent className="pt-6 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {listError}
              </CardContent>
            </Card>
          )}

          {tab === 'sites' && (
            <Card>
              <CardContent className="p-0">
                {!sites || listLoading ? (
                  <div className="p-6 text-sm text-muted-foreground">{tr ? 'Yükleniyor...' : 'Loading...'}</div>
                ) : sites.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">{tr ? 'Henüz site eklenmemiş.' : 'No sites yet.'}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3">{tr ? 'Ad' : 'Name'}</th>
                        <th className="p-3">URL</th>
                        <th className="p-3">{tr ? 'Platform' : 'Platform'}</th>
                        <th className="p-3">SEO</th>
                        <th className="p-3">{tr ? 'Bağlantı' : 'Connection'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sites.map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3">
                            <a href={s.site_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              {s.site_url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </td>
                          <td className="p-3 text-muted-foreground">{s.platform}</td>
                          <td className="p-3 text-muted-foreground">{s.seo_plugin ?? '-'}</td>
                          <td className="p-3">
                            {s.connection_status === 'ok' ? (
                              <Badge variant="outline" className="border-green-500 text-green-700 text-[10px]">ok</Badge>
                            ) : s.connection_status ? (
                              <Badge variant="outline" className="border-red-400 text-red-700 text-[10px]">{s.connection_status}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {tab === 'content' && (
            <Card>
              <CardContent className="p-0">
                {!content || listLoading ? (
                  <div className="p-6 text-sm text-muted-foreground">{tr ? 'Yükleniyor...' : 'Loading...'}</div>
                ) : content.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">{tr ? 'Henüz içerik yok.' : 'No content yet.'}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3">{tr ? 'Başlık' : 'Title'}</th>
                        <th className="p-3">{tr ? 'Durum' : 'Status'}</th>
                        <th className="p-3">{tr ? 'Model' : 'Model'}</th>
                        <th className="p-3">{tr ? 'Kredi' : 'Credits'}</th>
                        <th className="p-3">{tr ? 'Güncelleme' : 'Updated'}</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-3">
                            <div className="font-medium">{row.title || <span className="text-muted-foreground italic">(boş)</span>}</div>
                            {row.focus_keyword && (
                              <div className="text-xs text-muted-foreground">↳ {row.focus_keyword}</div>
                            )}
                          </td>
                          <td className="p-3">{statusBadge(row.status)}</td>
                          <td className="p-3 text-xs text-muted-foreground font-mono">{row.ai_model ?? '-'}</td>
                          <td className="p-3 text-xs text-muted-foreground">{row.ai_credits_consumed ?? 0}</td>
                          <td className="p-3 text-xs text-muted-foreground">{formatTs(row.updated_at)}</td>
                          <td className="p-3">
                            {row.remote_post_url && (
                              <a href={row.remote_post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                {tr ? 'Yayın' : 'Open'}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        {tr ? 'Kaynak: ' : 'Source: '}
        <a href="https://bot.workercms.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          bot.workercms.com
        </a>
      </p>
    </div>
  );
}
