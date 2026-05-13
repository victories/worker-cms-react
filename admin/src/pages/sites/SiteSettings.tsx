import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Switch } from '@ui/switch';
import { Textarea } from '@ui/textarea';
import { Globe, Plus, Trash2, Star, Shield, ShieldCheck, ChevronDown, RefreshCw, Cloud } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

export function SiteSettings() {
  const { id } = useParams();
  const { user, lang } = useAuthStore();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';
  const [site, setSite] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isManagement = site?.is_management === 1;

  useEffect(() => {
    loadSite();
  }, [id]);

  const loadSite = async () => {
    setLoading(true);
    const res = await api.request<any>(`/sites/${id}`);
    setLoading(false);
    if (res.success) {
      setSite(res.data.site || res.data);
      setDomains(res.data.domains || []);
    }
  };

  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    try {
      await api.request(`/sites/${id}`, {
        method: 'PUT',
        body: {
          name: site.name,
          description: site.description,
          status: site.status,
          is_management: site.is_management === 1,
        },
      });
      toast(lang === 'tr' ? 'Site ayarları kaydedildi' : 'Site settings saved', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const addDomain = async () => {
    if (!newDomain) return;
    try {
      await api.request(`/sites/${id}/domains`, {
        method: 'POST',
        body: { domain: newDomain },
      });
      toast(lang === 'tr' ? 'Domain eklendi' : 'Domain added', 'success');
      setNewDomain('');
      loadSite();
    } catch {
      toast(lang === 'tr' ? 'Domain eklenemedi' : 'Failed to add domain', 'error');
    }
  };

  const removeDomain = async (domainId: number) => {
    try {
      await api.request(`/sites/${id}/domains/${domainId}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Domain silindi' : 'Domain removed', 'success');
      loadSite();
    } catch {
      toast(lang === 'tr' ? 'Domain silinemedi' : 'Failed to remove domain', 'error');
    }
  };

  const setPrimary = async (domainId: number) => {
    try {
      await api.request(`/sites/${id}/domains/${domainId}/primary`, { method: 'PUT' });
      toast(lang === 'tr' ? 'Ana domain ayarlandı' : 'Primary domain set', 'success');
      loadSite();
    } catch {
      toast(lang === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    }
  };

  if (loading || !site) return <div className="p-4">{t('common.loading', lang)}</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">
        {lang === 'tr' ? 'Site Ayarları' : 'Site Settings'}: {site.name}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{lang === 'tr' ? 'Genel Bilgiler' : 'General Info'}</CardTitle>
          {isManagement && (
            <CardDescription className="flex items-center gap-1.5 text-amber-600">
              <Shield className="h-3.5 w-3.5" />
              {lang === 'tr'
                ? 'Bu yönetim sitesidir. Silinemez ve duraklatılamaz.'
                : 'This is the management site. It cannot be deleted or paused.'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{lang === 'tr' ? 'Site Adı' : 'Site Name'}</Label>
            <Input
              value={site.name || ''}
              onChange={(e) => setSite({ ...site, name: e.target.value })}
            />
          </div>
          <div>
            <Label>{lang === 'tr' ? 'Açıklama' : 'Description'}</Label>
            <Input
              value={site.description || ''}
              onChange={(e) => setSite({ ...site, description: e.target.value })}
            />
          </div>
          {isSuperAdmin && (
          <div className="flex items-center justify-between pt-2">
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {lang === 'tr' ? 'Yönetim Sitesi' : 'Management Site'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'tr'
                  ? 'Aktifleştirildiğinde bu site silinemez ve duraklatılamaz.'
                  : 'When enabled, this site cannot be deleted or paused.'}
              </p>
            </div>
            <Switch
              checked={site.is_management === 1}
              onCheckedChange={(checked) => setSite({ ...site, is_management: checked ? 1 : 0 })}
            />
          </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading', lang) : t('action.save', lang)}
          </Button>
        </CardContent>
      </Card>

      {/* ACME / SSL Validation — visible to anyone who owns this site */}
      {domains.length > 0 ? (
        <AcmeChallenges domains={domains} lang={lang} />
      ) : null}

      {/* Domain Management - super_admin only */}
      {isSuperAdmin && <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {lang === 'tr' ? 'Domain Yönetimi' : 'Domain Management'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {domains.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{d.domain}</span>
                  {d.is_primary === 1 && (
                    <Badge variant="success">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {!d.is_primary && (
                    <Button size="sm" variant="ghost" onClick={() => setPrimary(d.id)}>
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeDomain(d.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1"
            />
            <Button onClick={addDomain}>
              <Plus className="h-4 w-4 mr-1" />
              {t('action.create', lang)}
            </Button>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

// ── ACME / SSL HTTP-01 challenge management ──────────────────────────
//
// When Cloudflare's Custom Hostname feature can't auto-issue a cert (the
// usual cause: an apex domain CNAME'd to Cloudflare instead of using
// nameservers), it falls back to HTTP-01 validation and shows token
// pairs in the dashboard's "Pending Validation" panel. This component
// lets the site owner paste those pairs in; the worker then serves the
// response on `/.well-known/acme-challenge/<token>` until validation
// passes.

interface AcmeChallenge {
  id: number;
  site_id: number;
  domain: string;
  token: string;
  response: string;
  created_at: string;
}

function AcmeChallenges({ domains, lang }: { domains: any[]; lang: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>(domains[0]?.domain || '');
  const [tokenInput, setTokenInput] = useState('');
  const [responseInput, setResponseInput] = useState('');
  const [items, setItems] = useState<AcmeChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ total_saved: number; domains: any[] } | null>(null);
  const [dnsCheck, setDnsCheck] = useState<any | null>(null);
  const [recheckResult, setRecheckResult] = useState<any | null>(null);

  useEffect(() => {
    if (open && selectedDomain) loadChallenges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDomain]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const res = await api.request<{ success: boolean; data: AcmeChallenge[] }>(
        `/domains/acme?domain=${encodeURIComponent(selectedDomain)}`
      );
      setItems(res.success ? res.data || [] : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!selectedDomain || !tokenInput.trim() || !responseInput.trim()) {
      toast(
        lang === 'tr' ? 'Domain, token ve yanıt alanları zorunludur' : 'Domain, token and response are required',
        'error'
      );
      return;
    }
    setSaving(true);
    try {
      const res = await api.request<{ success: boolean; error?: string }>(
        '/domains/acme',
        {
          method: 'POST',
          body: {
            domain: selectedDomain,
            token: tokenInput.trim(),
            response: responseInput.trim(),
          },
        }
      );
      if (res.success) {
        toast(lang === 'tr' ? 'Doğrulama tokeni kaydedildi' : 'Challenge token saved', 'success');
        setTokenInput('');
        setResponseInput('');
        loadChallenges();
      } else {
        toast(res.error || (lang === 'tr' ? 'Kaydedilemedi' : 'Save failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Bağlantı hatası' : 'Connection error', 'error');
    }
    setSaving(false);
  };

  const remove = async (id: number) => {
    try {
      await api.request(`/domains/acme/${id}`, { method: 'DELETE' });
      toast(lang === 'tr' ? 'Token silindi' : 'Token removed', 'success');
      loadChallenges();
    } catch {
      toast(lang === 'tr' ? 'Silinemedi' : 'Delete failed', 'error');
    }
  };

  const checkDns = async () => {
    if (!selectedDomain) return;
    setSyncing(true);
    setDnsCheck(null);
    try {
      const res = await api.request<{ success: boolean; data?: any; error?: string }>(
        `/domains/acme/dns-check?domain=${encodeURIComponent(selectedDomain)}`
      );
      if (res.success && res.data) {
        setDnsCheck(res.data);
      } else {
        toast(res.error || (lang === 'tr' ? 'DNS sorgusu başarısız' : 'DNS lookup failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Bağlantı hatası' : 'Connection error', 'error');
    }
    setSyncing(false);
  };

  const recheckCloudflare = async () => {
    if (!selectedDomain) return;
    setSyncing(true);
    setRecheckResult(null);
    try {
      const res = await api.request<{ success: boolean; data?: any; error?: string }>(
        '/domains/acme/recheck',
        { method: 'POST', body: { domain: selectedDomain } }
      );
      if (res.success && res.data) {
        setRecheckResult(res.data);
        toast(
          lang === 'tr'
            ? `CF tekrar tetiklendi · hostname: ${res.data.hostname_status} · ssl: ${res.data.ssl_status}`
            : `CF re-triggered · hostname: ${res.data.hostname_status} · ssl: ${res.data.ssl_status}`,
          'success'
        );
      } else {
        toast(res.error || (lang === 'tr' ? 'Yeniden denetleme başarısız' : 'Recheck failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Bağlantı hatası' : 'Connection error', 'error');
    }
    setSyncing(false);
  };

  const switchMethod = async (method: 'http' | 'txt') => {
    if (!selectedDomain) return;
    setSyncing(true);
    try {
      const res = await api.request<{ success: boolean; error?: string }>(
        '/domains/acme/method',
        { method: 'POST', body: { domain: selectedDomain, method } }
      );
      if (res.success) {
        toast(
          lang === 'tr'
            ? `Doğrulama yöntemi ${method.toUpperCase()} olarak değiştirildi`
            : `Validation method switched to ${method.toUpperCase()}`,
          'success'
        );
        // Pull updated records right away.
        await syncFromCloudflare(false);
      } else {
        toast(res.error || (lang === 'tr' ? 'Yöntem değiştirilemedi' : 'Switch failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Bağlantı hatası' : 'Connection error', 'error');
    }
    setSyncing(false);
  };

  const syncFromCloudflare = async (allDomains: boolean) => {
    setSyncing(true);
    setSyncSummary(null);
    try {
      const res = await api.request<{
        success: boolean;
        error?: string;
        data?: { total_saved: number; domains: any[] };
      }>('/domains/acme/sync', {
        method: 'POST',
        body: allDomains ? {} : { domain: selectedDomain },
      });
      if (res.success && res.data) {
        setSyncSummary(res.data);
        toast(
          lang === 'tr'
            ? `Cloudflare'den ${res.data.total_saved} token çekildi`
            : `Pulled ${res.data.total_saved} tokens from Cloudflare`,
          'success'
        );
        loadChallenges();
      } else {
        toast(res.error || (lang === 'tr' ? 'Çekilemedi' : 'Sync failed'), 'error');
      }
    } catch {
      toast(lang === 'tr' ? 'Bağlantı hatası' : 'Connection error', 'error');
    }
    setSyncing(false);
  };

  const exampleUrl = `http://${selectedDomain || 'example.com'}/.well-known/acme-challenge/...`;

  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {lang === 'tr' ? 'SSL Doğrulama (ACME HTTP-01)' : 'SSL Validation (ACME HTTP-01)'}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </CardTitle>
        {!open && (
          <CardDescription className="text-xs mt-1">
            {lang === 'tr'
              ? "Apex domain CNAME ile Cloudflare'e bağlandığında SSL sertifikası üretmek için doğrulama tokeni girin."
              : "If your apex domain CNAMEs to Cloudflare, paste the validation tokens here so SSL certs can be issued."}
          </CardDescription>
        )}
      </CardHeader>
      {open ? (
        <CardContent className="space-y-4">
          <div className="text-xs text-muted-foreground border-l-2 border-amber-300 pl-3 py-2 bg-amber-50/50 dark:bg-amber-950/20 rounded">
            {lang === 'tr' ? (
              <>
                <p className="mb-1.5">
                  <strong>Cloudflare → Custom Hostnames</strong> panelinde "Pending Validation (HTTP)"
                  durumundaki domain için <em>Certificate validation request</em> ve <em>Certificate validation response</em> alanlarını kopyalayıp aşağıya yapıştırın.
                </p>
                <p className="text-muted-foreground/80">
                  Token URL'in tamamını yapıştırabilirsiniz (örn. <code>{exampleUrl}</code>) — sistem otomatik token kısmını çıkarır.
                </p>
              </>
            ) : (
              <>
                <p className="mb-1.5">
                  Open <strong>Cloudflare → Custom Hostnames</strong>, find the domain in "Pending Validation (HTTP)" state, and copy
                  the <em>Certificate validation request</em> and <em>response</em> values here.
                </p>
                <p className="text-muted-foreground/80">
                  Pasting the full URL is fine (e.g. <code>{exampleUrl}</code>) — the token will be extracted.
                </p>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {lang === 'tr' ? 'Domain' : 'Domain'}
            </Label>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {domains.map((d: any) => (
                <option key={d.id} value={d.domain}>{d.domain}</option>
              ))}
            </select>
          </div>

          {/* Auto-sync from Cloudflare */}
          <div className="rounded-md border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Cloud className="h-4 w-4 text-blue-500" />
              {lang === 'tr' ? "Cloudflare'den Otomatik Çek" : 'Auto-sync from Cloudflare'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lang === 'tr'
                ? "Custom Hostname için bekleyen doğrulama tokenlerini Cloudflare API'sinden çekip otomatik kaydet. Manuel kopyalamana gerek yok."
                : "Pull pending validation tokens for the Custom Hostname directly from the Cloudflare API. No manual copy-paste needed."}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => syncFromCloudflare(false)} disabled={syncing}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {lang === 'tr' ? `${selectedDomain} için çek` : `Sync ${selectedDomain}`}
              </Button>
              <Button size="sm" variant="outline" onClick={() => syncFromCloudflare(true)} disabled={syncing}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                {lang === 'tr' ? 'Tüm Domainler' : 'All Domains'}
              </Button>
            </div>
            {syncSummary ? (
              <div className="text-xs space-y-2 mt-2">
                <p className="font-medium">
                  {lang === 'tr'
                    ? `Toplam ${syncSummary.total_saved} HTTP tokeni kaydedildi`
                    : `${syncSummary.total_saved} HTTP tokens saved total`}
                </p>
                <ul className="space-y-2">
                  {syncSummary.domains.map((d: any) => (
                    <li key={d.domain} className="px-2 py-2 bg-muted rounded space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono truncate flex-1">{d.domain}</span>
                        <Badge variant={d.error ? 'destructive' : d.saved > 0 ? 'success' : 'secondary'}>
                          {d.error
                            ? d.error
                            : d.saved > 0
                              ? `+${d.saved} HTTP`
                              : `${d.cf_status} / ${d.ssl_status} (${d.method})`}
                        </Badge>
                      </div>
                      {d.txt_records?.length ? (
                        <div className="space-y-1 pl-1 border-l-2 border-blue-300">
                          <div className="text-[10px] uppercase tracking-wider text-blue-600 font-mono">
                            {lang === 'tr'
                              ? 'DNS TXT Kayıtları (registrar paneline ekle)'
                              : 'DNS TXT Records (add to your registrar)'}
                          </div>
                          {d.txt_records.map((tx: any, i: number) => (
                            <div key={i} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 px-2 py-1 bg-background rounded">
                              <span className="text-muted-foreground text-[10px] font-mono">name:</span>
                              <code className="font-mono break-all">{tx.name}</code>
                              <span className="text-muted-foreground text-[10px] font-mono">value:</span>
                              <code className="font-mono break-all">{tx.value}</code>
                              <span className="text-muted-foreground text-[10px] font-mono">type:</span>
                              <span className="text-[10px]">
                                TXT · {tx.purpose === 'ssl'
                                  ? (lang === 'tr' ? 'SSL doğrulama' : 'SSL validation')
                                  : (lang === 'tr' ? 'sahiplik doğrulama' : 'ownership verification')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Debug: DNS check + CF recheck */}
            <div className="pt-3 mt-3 border-t border-border/60 space-y-1.5">
              <div className="text-xs font-medium">
                {lang === 'tr' ? 'Sorun Giderme' : 'Troubleshooting'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lang === 'tr'
                  ? "TXT eklediniz ama CF hâlâ pending mi? Önce DNS Kontrol ile kayıtların gerçekten yayıldığını teyit edin, sonra CF'e tekrar denetletin."
                  : 'Added TXT but CF is still pending? Run DNS check to confirm propagation, then ask CF to re-validate.'}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={checkDns} disabled={syncing || !selectedDomain}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  {lang === 'tr' ? 'DNS Kontrol' : 'DNS Check'}
                </Button>
                <Button size="sm" variant="outline" onClick={recheckCloudflare} disabled={syncing || !selectedDomain}>
                  <Cloud className="h-3.5 w-3.5 mr-1.5" />
                  {lang === 'tr' ? "CF'e Tekrar Denetlet" : 'Ask CF to Re-validate'}
                </Button>
              </div>

              {dnsCheck ? (
                <div className="text-xs space-y-1 mt-2 px-2 py-2 bg-muted rounded">
                  <p className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                    {lang === 'tr' ? 'Public DNS Sonucu' : 'Public DNS Result'}
                  </p>

                  {/* Double-suffix typo warning: surfaces the most common
                      "I added the FQDN as host" mistake before users
                      stare at the table. */}
                  {dnsCheck.lookups?.some((l: any) => l.typo && l.found?.length) ? (
                    <div className="text-[11px] border-l-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded">
                      <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                        {lang === 'tr'
                          ? '⚠ Kayıtlar yanlış adda — DNS panelinde "Host" alanına FQDN yazılmış'
                          : '⚠ Records found at wrong name — full FQDN was used as Host'}
                      </p>
                      <p className="text-muted-foreground">
                        {lang === 'tr'
                          ? "DNS sağlayıcın \"Host/AD\" alanına yazdığın değerin sonuna otomatik domain ekliyor. Düzeltmek için kayıtları sil ve \"Host\" alanına SADECE alt parçayı yaz (örn. \"_acme-challenge\" yaz, \"_acme-challenge.hasangul.com\" değil)."
                          : 'Your DNS provider auto-appends the zone to the "Host" field. Fix it: delete the records and re-add them with just the subdomain part in "Host" (e.g. "_acme-challenge", not "_acme-challenge.example.com").'}
                      </p>
                    </div>
                  ) : null}

                  {dnsCheck.lookups?.length ? (
                    <ul className="space-y-1">
                      {dnsCheck.lookups.map((l: any, i: number) => (
                        <li key={i} className="grid grid-cols-[auto_1fr] gap-x-2 items-start">
                          <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                            {l.type}
                          </span>
                          <div className="min-w-0">
                            <code className={`font-mono break-all text-[11px] ${l.typo ? 'text-amber-600' : ''}`}>
                              {l.name}
                              {l.typo ? <span className="ml-1 text-[10px]">⚠</span> : null}
                            </code>
                            {l.found?.length > 0 ? (
                              <div className="mt-0.5 space-y-0.5">
                                {l.found.map((v: string, j: number) => (
                                  <div key={j} className={`font-mono text-[11px] break-all ${l.typo ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    ↳ {v}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              !l.typo ? (
                                <div className="text-[11px] text-amber-600">
                                  ↳ {lang === 'tr' ? 'kayıt yok' : 'no record'}
                                </div>
                              ) : null
                            )}
                            {l.error ? <div className="text-[11px] text-destructive">{l.error}</div> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {recheckResult ? (
                <div className="text-xs space-y-1 mt-2 px-2 py-2 bg-muted rounded">
                  <p className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">
                    {lang === 'tr' ? 'Cloudflare Yanıtı' : 'Cloudflare Response'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">hostname:</span>
                    <span className="font-mono">{recheckResult.hostname_status}</span>
                    <span className="text-muted-foreground">ssl:</span>
                    <span className="font-mono">{recheckResult.ssl_status}</span>
                    <span className="text-muted-foreground">method:</span>
                    <span className="font-mono">{recheckResult.method}</span>
                  </div>
                  {recheckResult.verification_errors?.length ? (
                    <div className="mt-1 text-[11px]">
                      <div className="text-destructive font-medium">
                        {lang === 'tr' ? 'Hostname doğrulama hataları:' : 'Verification errors:'}
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {recheckResult.verification_errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {recheckResult.ssl_validation_errors?.length ? (
                    <div className="mt-1 text-[11px]">
                      <div className="text-destructive font-medium">
                        {lang === 'tr' ? 'SSL doğrulama hataları:' : 'SSL validation errors:'}
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground">
                        {recheckResult.ssl_validation_errors.map((e: any, i: number) => (
                          <li key={i}>{typeof e === 'string' ? e : e.message || JSON.stringify(e)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Validation method switch */}
            <div className="pt-3 mt-3 border-t border-border/60 space-y-1.5">
              <div className="text-xs font-medium">
                {lang === 'tr' ? 'Doğrulama Yöntemi' : 'Validation Method'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lang === 'tr'
                  ? "HTTP: token'ı bu worker servis eder. TXT: kullanıcı registrar'ında DNS TXT kaydı ekler. Apex CNAME ile ulaşılamayan domainler için TXT genelde daha güvenilir."
                  : "HTTP: this worker serves the token. TXT: customer adds a DNS TXT record at their registrar. For apex domains unreachable via CNAME, TXT is usually more reliable."}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => switchMethod('http')} disabled={syncing || !selectedDomain}>
                  {lang === 'tr' ? "HTTP'ye geç" : 'Switch to HTTP'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => switchMethod('txt')} disabled={syncing || !selectedDomain}>
                  {lang === 'tr' ? "TXT'ye geç" : 'Switch to TXT'}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            {lang === 'tr' ? 'veya manuel olarak yapıştır' : 'or paste manually'}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {lang === 'tr' ? 'Validation request (URL veya sadece token)' : 'Validation request (URL or token)'}
            </Label>
            <Input
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder={exampleUrl}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {lang === 'tr' ? 'Validation response' : 'Validation response'}
            </Label>
            <Textarea
              value={responseInput}
              onChange={e => setResponseInput(e.target.value)}
              placeholder="S9pGfiC2wdpzsmnVsWWciw.8RhCkqD-KcHEWOnPKnN9k2rWDcVDt-FG4Iaod1UDPNI"
              className="font-mono text-xs"
              rows={2}
            />
          </div>

          <Button onClick={save} disabled={saving}>
            <Plus className="h-4 w-4 mr-1.5" />
            {saving
              ? (lang === 'tr' ? 'Kaydediliyor…' : 'Saving…')
              : (lang === 'tr' ? 'Token Ekle / Güncelle' : 'Add / Update Token')}
          </Button>

          <div className="pt-2">
            <Label className="text-xs font-medium">
              {lang === 'tr' ? 'Kayıtlı Tokenler' : 'Saved Tokens'}
            </Label>
            {loading ? (
              <p className="text-xs text-muted-foreground mt-2">
                {lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
              </p>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">
                {lang === 'tr'
                  ? 'Bu domain için kayıtlı token yok.'
                  : 'No tokens saved for this domain.'}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {items.map(it => (
                  <li
                    key={it.id}
                    className="flex items-start justify-between gap-2 p-3 bg-muted rounded text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="font-mono truncate">{it.token}</span>
                      </div>
                      <div className="text-muted-foreground font-mono break-all opacity-70">
                        {it.response}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">
                        /{'.'}well-known/acme-challenge/{it.token} → {new Date(it.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => remove(it.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
