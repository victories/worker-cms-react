import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Separator } from '@ui/separator';
import { Switch } from '@ui/switch';
import { Save, Globe, Shield, MessageSquare, Mail, BarChart3, Clock, Type, Blocks, PenTool, Layers, Edit3, KeyRound, ExternalLink, Copy, Check, Eye, EyeOff, ChevronDown, FileText, Send, RotateCcw, X, Code, CreditCard } from 'lucide-react';
import { useToast } from '@ui/toast-notification';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Kopyala"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AccordionCard({ icon, title, description, children, defaultOpen = false, forceOpen = false }: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  // When true the card renders as a plain always-open panel (no chevron,
  // no collapse) — used by the tabbed layout where one card shows at a time.
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (forceOpen) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            <span className="flex-1">{title}</span>
          </CardTitle>
          {description && (
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left"
      >
        <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            <span className="flex-1">{title}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </CardTitle>
          {description && !open && (
            <CardDescription className="text-xs mt-1 line-clamp-1">{description}</CardDescription>
          )}
        </CardHeader>
      </button>
      {open && (
        <>
          {description && (
            <div className="px-6 pb-2">
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          )}
          <CardContent>{children}</CardContent>
        </>
      )}
    </Card>
  );
}

function CloudflareSettingsCard({ lang, settings, updateSetting, forceOpen = false }: {
  lang: string;
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  forceOpen?: boolean;
}) {
  const tr = lang === 'tr';
  const configured = !!(settings.cf_api_key && settings.cf_email);

  return (
    <AccordionCard
      forceOpen={forceOpen}
      icon={<svg viewBox="0 0 48 48" className="h-5 w-5">
            <path fill="#F38020" d="M32.67 24.94l-.98-3.36a1.1 1.1 0 00-1.07-.78H14.35a.37.37 0 01-.35-.25.36.36 0 01.12-.41l1.98-1.36a2.2 2.2 0 001.35-1.64l.73-2.53c.7-2.4-.46-4.93-2.71-5.86a3.67 3.67 0 00-4.83 2.19l-.56 1.94-.2-.66A3.67 3.67 0 006.4 14.6a3.67 3.67 0 00-2.19 4.69l3.1 10.7a.46.46 0 00.44.32h23.83a.55.55 0 00.53-.41l.56-1.94a3.67 3.67 0 000-3.02z"/>
            <path fill="#FAAE40" d="M38.08 20.8H33.5a.55.55 0 00-.53.41l-.56 1.94a3.67 3.67 0 000 3.02l.98 3.36a1.1 1.1 0 001.07.78h5.97a.37.37 0 00.35-.25.36.36 0 00-.12-.41l-1.98-1.36a1.1 1.1 0 01-.43-.67l-1.7-5.87a.55.55 0 00-.47-.95z"/>
          </svg>}
      title={tr ? 'Cloudflare Entegrasyonu' : 'Cloudflare Integration'}
      description={tr
        ? 'Domain ekleme ve yönetimi için Cloudflare API ayarları.'
        : 'Cloudflare API settings for domain management.'}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
          <div className={`w-2.5 h-2.5 rounded-full ${configured ? 'bg-green-500' : 'bg-orange-400'}`} />
          <span className="text-sm">
            {configured
              ? (tr ? '✅ Cloudflare API yapılandırıldı' : '✅ Cloudflare API configured')
              : (tr ? '⚠️ Cloudflare API ayarları eksik' : '⚠️ Cloudflare API settings missing')}
          </span>
        </div>

        <div>
          <Label className="text-xs">{tr ? 'Cloudflare E-posta' : 'Cloudflare Email'}</Label>
          <Input
            type="email"
            value={settings.cf_email || ''}
            onChange={(e) => updateSetting('cf_email', e.target.value)}
            placeholder="you@example.com"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {tr ? 'Cloudflare hesabınıza giriş yaptığınız e-posta adresi' : 'The email address you use to log in to Cloudflare'}
          </p>
        </div>

        <div>
          <Label className="text-xs">Global API Key</Label>
          <SecretInput
            value={settings.cf_api_key || ''}
            onChange={(v) => updateSetting('cf_api_key', v)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {tr
              ? 'Cloudflare Dashboard → My Profile → API Tokens → Global API Key → View'
              : 'Cloudflare Dashboard → My Profile → API Tokens → Global API Key → View'}
          </p>
        </div>

        <div>
          <Label className="text-xs">Account ID ({tr ? 'Opsiyonel' : 'Optional'})</Label>
          <Input
            value={settings.cf_account_id || ''}
            onChange={(e) => updateSetting('cf_account_id', e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {tr
              ? 'Cloudflare Dashboard → herhangi bir site → Overview → sağ altta "Account ID". Boş bırakılırsa otomatik algılanır.'
              : 'Cloudflare Dashboard → any site → Overview → bottom-right "Account ID". Auto-detected if left empty.'}
          </p>
        </div>
      </div>
    </AccordionCard>
  );
}

function OAuthSettingsCard({ lang, settings, updateSetting, forceOpen = false }: {
  lang: string;
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  forceOpen?: boolean;
}) {
  const tr = lang === 'tr';
  const googleEnabled = !!(settings.google_client_id && settings.google_client_secret);
  const githubEnabled = !!(settings.github_client_id && settings.github_client_secret);
  const adminDomain = window.location.host;
  const protocol = adminDomain.includes('localhost') ? 'http' : 'https';
  const googleCallbackUrl = `${protocol}://${adminDomain}/api/auth/google/callback`;
  const githubCallbackUrl = `${protocol}://${adminDomain}/api/auth/github/callback`;

  const [openGuide, setOpenGuide] = useState<'google' | 'github' | null>(null);

  return (
    <AccordionCard
      forceOpen={forceOpen}
      icon={<KeyRound className="h-5 w-5" />}
      title={tr ? 'OAuth / Sosyal Giriş' : 'OAuth / Social Login'}
      description={tr
        ? 'Google ve GitHub ile giriş/kayıt için OAuth ayarları.'
        : 'OAuth settings for Google and GitHub login/signup.'}
    >
      <div className="space-y-6">
        {/* Google OAuth */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-sm">Google OAuth</h4>
                <p className="text-xs text-muted-foreground">
                  {googleEnabled
                    ? (tr ? '✅ Yapılandırıldı' : '✅ Configured')
                    : (tr ? '⚠️ Yapılandırılmadı' : '⚠️ Not configured')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenGuide(openGuide === 'google' ? null : 'google')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {tr ? 'Kurulum Rehberi' : 'Setup Guide'}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Google Setup Guide */}
          {openGuide === 'google' && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
              <h5 className="font-semibold text-sm">{tr ? '📋 Google OAuth Kurulum Adımları' : '📋 Google OAuth Setup Steps'}</h5>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="text-primary hover:underline">
                    Google Cloud Console → APIs & Services → Credentials
                  </a> {tr ? 'sayfasına gidin' : 'page'}
                </li>
                <li>{tr ? '"Create Credentials" → "OAuth client ID" tıklayın' : 'Click "Create Credentials" → "OAuth client ID"'}</li>
                <li>{tr ? 'Application type olarak "Web application" seçin' : 'Select "Web application" as application type'}</li>
                <li>{tr ? 'Bir isim verin (örn: "WorkerCms Login")' : 'Give it a name (e.g., "WorkerCms Login")'}</li>
                <li>
                  {tr ? '"Authorized redirect URIs" kısmına şu URL\'i ekleyin:' : 'Add this URL to "Authorized redirect URIs":'}
                  <div className="flex items-center gap-2 mt-1 bg-background rounded px-3 py-1.5 border font-mono text-xs">
                    <span className="truncate">{googleCallbackUrl}</span>
                    <CopyButton text={googleCallbackUrl} />
                  </div>
                </li>
                <li>{tr ? '"Create" tıklayın. Açılan pencereden Client ID ve Client Secret\'ı kopyalayın' : 'Click "Create". Copy Client ID and Client Secret from the popup'}</li>
                <li>{tr ? 'Aşağıdaki alanlara yapıştırın ve "Kaydet" butonuna tıklayın' : 'Paste them in the fields below and click "Save"'}</li>
              </ol>
              <div className="pt-1">
                <p className="text-xs text-muted-foreground">
                  {tr
                    ? '⚡ Not: İlk kez oluşturuyorsanız "OAuth consent screen" ayarlarını da yapmanız gerekebilir. "External" user type seçip, app name ve email bilgilerini girin.'
                    : '⚡ Note: If creating for the first time, you may need to configure the "OAuth consent screen" as well. Choose "External" user type and enter app name and email.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Google Client ID</Label>
              <Input
                value={settings.google_client_id || ''}
                onChange={(e) => updateSetting('google_client_id', e.target.value)}
                placeholder="123456789-xxxxxxxxxx.apps.googleusercontent.com"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Google Client Secret</Label>
              <SecretInput
                value={settings.google_client_secret || ''}
                onChange={(v) => updateSetting('google_client_secret', v)}
                placeholder="GOCSPX-xxxxxxxxxx"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* GitHub OAuth */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white dark:text-zinc-900" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-sm">GitHub OAuth</h4>
                <p className="text-xs text-muted-foreground">
                  {githubEnabled
                    ? (tr ? '✅ Yapılandırıldı' : '✅ Configured')
                    : (tr ? '⚠️ Yapılandırılmadı' : '⚠️ Not configured')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpenGuide(openGuide === 'github' ? null : 'github')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {tr ? 'Kurulum Rehberi' : 'Setup Guide'}
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* GitHub Setup Guide */}
          {openGuide === 'github' && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
              <h5 className="font-semibold text-sm">{tr ? '📋 GitHub OAuth Kurulum Adımları' : '📋 GitHub OAuth Setup Steps'}</h5>
              <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                <li>
                  <a href="https://github.com/settings/developers" target="_blank" rel="noopener" className="text-primary hover:underline">
                    GitHub → Settings → Developer settings → OAuth Apps
                  </a> {tr ? 'sayfasına gidin' : 'page'}
                </li>
                <li>{tr ? '"New OAuth App" butonuna tıklayın' : 'Click "New OAuth App" button'}</li>
                <li>
                  {tr ? 'Bilgileri şu şekilde doldurun:' : 'Fill in the details:'}
                  <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
                    <li><strong>Application name:</strong> WorkerCms</li>
                    <li>
                      <strong>Homepage URL:</strong>
                      <span className="font-mono text-xs ml-1">{protocol}://{adminDomain}</span>
                      <CopyButton text={`${protocol}://${adminDomain}`} />
                    </li>
                    <li>
                      <strong>Authorization callback URL:</strong>
                      <div className="flex items-center gap-2 mt-1 bg-background rounded px-3 py-1.5 border font-mono text-xs">
                        <span className="truncate">{githubCallbackUrl}</span>
                        <CopyButton text={githubCallbackUrl} />
                      </div>
                    </li>
                  </ul>
                </li>
                <li>{tr ? '"Register application" tıklayın' : 'Click "Register application"'}</li>
                <li>{tr ? 'Client ID\'yi kopyalayın' : 'Copy the Client ID'}</li>
                <li>{tr ? '"Generate a new client secret" tıklayın ve secret\'ı kopyalayın' : 'Click "Generate a new client secret" and copy the secret'}</li>
                <li>{tr ? 'Aşağıdaki alanlara yapıştırın ve "Kaydet" butonuna tıklayın' : 'Paste them in the fields below and click "Save"'}</li>
              </ol>
              <div className="pt-1">
                <p className="text-xs text-muted-foreground">
                  {tr
                    ? '⚡ Not: GitHub client secret sadece oluşturulduğunda gösterilir. Kaybederseniz yeni bir tane oluşturmanız gerekir.'
                    : '⚡ Note: GitHub client secret is only shown when created. If you lose it, you need to generate a new one.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <Label className="text-xs">GitHub Client ID</Label>
              <Input
                value={settings.github_client_id || ''}
                onChange={(e) => updateSetting('github_client_id', e.target.value)}
                placeholder="Ov23lixxxxxxxxxx"
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">GitHub Client Secret</Label>
              <SecretInput
                value={settings.github_client_secret || ''}
                onChange={(v) => updateSetting('github_client_secret', v)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </div>
        </div>

        {/* Callback URLs summary */}
        <Separator />
        <div className="space-y-2">
          <Label className="text-xs font-medium">{tr ? 'Callback URL\'leri (Referans)' : 'Callback URLs (Reference)'}</Label>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
              <div>
                <span className="text-xs text-muted-foreground">Google: </span>
                <span className="text-xs font-mono">{googleCallbackUrl}</span>
              </div>
              <CopyButton text={googleCallbackUrl} />
            </div>
            <div className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
              <div>
                <span className="text-xs text-muted-foreground">GitHub: </span>
                <span className="text-xs font-mono">{githubCallbackUrl}</span>
              </div>
              <CopyButton text={githubCallbackUrl} />
            </div>
          </div>
        </div>
      </div>
    </AccordionCard>
  );
}

// ─── Email Template Editor Modal ─────────────────────────────

interface EmailEventMeta {
  type: string;
  settingKey: string;
  labelTr: string;
  labelEn: string;
  descTr: string;
  descEn: string;
  accentColor: string;
  variables: string[];
}

function EmailTemplateEditor({ event, lang, onClose }: {
  event: EmailEventMeta;
  lang: string;
  onClose: () => void;
}) {
  const tr = lang === 'tr';
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [defaultBody, setDefaultBody] = useState('');
  const [isCustomized, setIsCustomized] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, [event.type]);

  const loadTemplate = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.getEmailTemplate(event.type) as any;
      if (res.success && res.data) {
        setDefaultSubject(res.data.defaultTemplate.subject);
        setDefaultBody(res.data.defaultTemplate.body);
        setSubject(res.data.customTemplate.subject || '');
        setBody(res.data.customTemplate.body || '');
        setIsCustomized(res.data.isCustomized);
      } else {
        setLoadError(res?.error || (tr ? 'Şablon yüklenemedi' : 'Failed to load template'));
      }
    } catch (err: any) {
      setLoadError(err?.message || (tr ? 'Şablon yüklenirken hata oluştu' : 'Error loading template'));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateEmailTemplate(event.type, { subject, body });
      toast(tr ? 'Şablon kaydedildi' : 'Template saved', 'success');
      setIsCustomized(!!(subject || body));
    } catch {
      toast(tr ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await api.resetEmailTemplate(event.type);
      setSubject('');
      setBody('');
      setIsCustomized(false);
      toast(tr ? 'Varsayılana döndürüldü' : 'Reset to default', 'success');
    } catch {
      toast(tr ? 'Sıfırlama başarısız' : 'Reset failed', 'error');
    }
    setSaving(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast(tr ? 'E-posta adresi girin' : 'Enter email address', 'error');
      return;
    }
    setSendingTest(true);
    try {
      const res = await api.sendTestEmail(event.type, testEmail) as any;
      if (res.success) {
        toast(tr ? 'Test e-postası gönderildi!' : 'Test email sent!', 'success');
      } else {
        toast(res.error || 'Failed', 'error');
      }
    } catch (e: any) {
      toast(e.message || 'Failed', 'error');
    }
    setSendingTest(false);
  };

  const activeSubject = subject || defaultSubject;
  const activeBody = body || defaultBody;

  // Build preview HTML
  const previewHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;background:#f5f5f5;">
  <div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:24px;border-top:3px solid ${event.accentColor};">
    ${activeBody}
  </div>
  <p style="text-align:center;margin:16px 0 0;font-size:0.75em;color:#aaa;">Worker CMS — Modern Multi-Site CMS</p>
</body></html>`;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-background rounded-lg p-8" onClick={e => e.stopPropagation()}>
          <p>{tr ? 'Yükleniyor...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-background rounded-lg p-8 max-w-md text-center space-y-4" onClick={e => e.stopPropagation()}>
          <p className="text-destructive">{loadError}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={loadTemplate}>
              {tr ? 'Tekrar Dene' : 'Retry'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {tr ? 'Kapat' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.accentColor }} />
            <h2 className="text-lg font-semibold">{tr ? event.labelTr : event.labelEn}</h2>
            {isCustomized && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {tr ? 'Özelleştirilmiş' : 'Customized'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Variables Reference */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-2">{tr ? 'Kullanılabilir Değişkenler' : 'Available Variables'}:</p>
            <div className="flex flex-wrap gap-1.5">
              {event.variables.map(v => (
                <code key={v} className="text-xs bg-background px-2 py-0.5 rounded border cursor-pointer hover:bg-blue-50"
                  onClick={() => navigator.clipboard.writeText(`{{${v}}}`)}
                  title={tr ? 'Kopyalamak için tıkla' : 'Click to copy'}>
                  {'{{' + v + '}}'}
                </code>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-sm font-medium">{tr ? 'Konu' : 'Subject'}</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={defaultSubject}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {tr ? 'Boş bırakılırsa varsayılan kullanılır' : 'Leave empty to use default'}
            </p>
          </div>

          {/* Body Editor / Preview Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-medium">{tr ? 'İçerik (HTML)' : 'Body (HTML)'}</Label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPreview(false)}
                  className={`text-xs px-2 py-1 rounded ${!showPreview ? 'bg-foreground text-background' : 'bg-muted'}`}
                >
                  <Code className="h-3 w-3 inline mr-1" />
                  HTML
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className={`text-xs px-2 py-1 rounded ${showPreview ? 'bg-foreground text-background' : 'bg-muted'}`}
                >
                  <Eye className="h-3 w-3 inline mr-1" />
                  {tr ? 'Önizleme' : 'Preview'}
                </button>
              </div>
            </div>

            {showPreview ? (
              <div className="border rounded-lg overflow-hidden bg-white" style={{ height: 350 }}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox=""
                  title="Email Preview"
                />
              </div>
            ) : (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={defaultBody}
                className="w-full h-[350px] font-mono text-xs border rounded-lg p-3 bg-muted/30 focus:ring-1 focus:ring-ring focus:outline-none resize-none"
                spellCheck={false}
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {tr ? 'HTML destekler. Boş bırakılırsa varsayılan şablon kullanılır.' : 'Supports HTML. Leave empty to use the default template.'}
            </p>
          </div>

          {/* Test Email */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <Label className="text-sm font-medium">{tr ? 'Test E-postası Gönder' : 'Send Test Email'}</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSendTest} disabled={sendingTest}>
                <Send className="h-3.5 w-3.5 mr-1" />
                {sendingTest ? '...' : (tr ? 'Gönder' : 'Send')}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving || !isCustomized}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            {tr ? 'Varsayılana Dön' : 'Reset to Default'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{tr ? 'İptal' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? '...' : (tr ? 'Kaydet' : 'Save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Email Settings Card ─────────────────────────────────────

const EMAIL_EVENTS_CONFIG: EmailEventMeta[] = [
  {
    type: 'welcome', settingKey: 'mail_on_user_register',
    labelTr: 'Hoş Geldin E-postası', labelEn: 'Welcome Email',
    descTr: 'Yeni kullanıcı kaydolduğunda hoş geldin maili gönder',
    descEn: 'Send welcome email when a new user registers',
    accentColor: '#2563eb', variables: ['user_name', 'user_email', 'site_name', 'login_url'],
  },
  {
    type: 'password_reset', settingKey: 'mail_on_password_reset',
    labelTr: 'Şifre Sıfırlama', labelEn: 'Password Reset',
    descTr: 'Kullanıcı şifre sıfırlama isteğinde e-posta gönder',
    descEn: 'Send email when user requests password reset',
    accentColor: '#dc2626', variables: ['user_name', 'user_email', 'reset_url', 'site_name'],
  },
  {
    type: 'new_comment', settingKey: 'mail_on_comment',
    labelTr: 'Yeni Yorum', labelEn: 'New Comment',
    descTr: 'Yeni yorum yazıldığında yöneticiye bildir',
    descEn: 'Notify admin when a new comment is posted',
    accentColor: '#4a90d9', variables: ['author_name', 'author_email', 'comment_content', 'post_title', 'post_url', 'site_name'],
  },
  {
    type: 'new_contact', settingKey: 'mail_on_contact',
    labelTr: 'Yeni İletişim Mesajı', labelEn: 'New Contact Message',
    descTr: 'İletişim formu gönderildiğinde yöneticiye bildir',
    descEn: 'Notify admin when a contact form is submitted',
    accentColor: '#4a90d9', variables: ['contact_name', 'contact_email', 'contact_subject', 'contact_message', 'site_name'],
  },
  {
    type: 'subscription_active', settingKey: 'mail_on_subscription_active',
    labelTr: 'Abonelik Aktif', labelEn: 'Subscription Active',
    descTr: 'Abonelik aktifleştiğinde kullanıcıya bildir',
    descEn: 'Notify user when subscription is activated',
    accentColor: '#22c55e', variables: ['user_name', 'package_name', 'billing_period', 'payment_method', 'period_end'],
  },
  {
    type: 'subscription_expiring', settingKey: 'mail_on_subscription_expiring',
    labelTr: 'Abonelik Sona Eriyor', labelEn: 'Subscription Expiring',
    descTr: 'Abonelik süresi dolmak üzereyken kullanıcıya hatırlat',
    descEn: 'Remind user when subscription is about to expire',
    accentColor: '#f59e0b', variables: ['user_name', 'package_name', 'days_left', 'period_end', 'renew_url'],
  },
  {
    type: 'subscription_cancelled', settingKey: 'mail_on_subscription_cancelled',
    labelTr: 'Abonelik İptal', labelEn: 'Subscription Cancelled',
    descTr: 'Abonelik iptal edildiğinde kullanıcıya bildir',
    descEn: 'Notify user when subscription is cancelled',
    accentColor: '#ef4444', variables: ['user_name', 'package_name', 'period_end', 'renew_url'],
  },
  {
    type: 'new_post_published', settingKey: 'mail_on_new_post_published',
    labelTr: 'Yeni Yazı Yayınlandı', labelEn: 'New Post Published',
    descTr: 'Yeni bir yazı yayınlandığında site sahibine bildir',
    descEn: 'Notify site owner when a new post is published',
    accentColor: '#8b5cf6', variables: ['post_title', 'post_excerpt', 'post_url', 'site_name', 'author_name'],
  },
];

function EmailSettingsCard({ lang, settings, updateSetting, forceOpen = false }: {
  lang: string;
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  forceOpen?: boolean;
}) {
  const tr = lang === 'tr';
  const mailEnabled = settings.mail_enabled !== 'false';
  const [editingEvent, setEditingEvent] = useState<EmailEventMeta | null>(null);

  // Determine default for each toggle
  const isEventEnabled = (evt: EmailEventMeta): boolean => {
    const val = settings[evt.settingKey];
    // new_post_published defaults to off, rest default to on
    if (evt.type === 'new_post_published') return val === 'true';
    return val !== 'false';
  };

  return (
    <>
      <AccordionCard
        forceOpen={forceOpen}
        icon={<Mail className="h-5 w-5" />}
        title={tr ? 'E-posta Ayarları & Şablonlar' : 'Email Settings & Templates'}
        description={tr
          ? 'E-posta gönderim ayarları, bildirim tercihleri ve şablon düzenleyici.'
          : 'Email delivery settings, notification preferences, and template editor.'}
      >
        <div className="space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {tr ? 'E-posta Bildirimleri Aktif' : 'Enable Email Notifications'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {tr ? 'Sistem genelinde e-posta gönderimini aç/kapa' : 'Enable/disable email sending system-wide'}
              </p>
            </div>
            <Switch
              checked={mailEnabled}
              onCheckedChange={(checked) => updateSetting('mail_enabled', String(checked))}
            />
          </div>

          {mailEnabled && (
            <>
              <Separator />

              {/* Provider & Credentials */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{tr ? 'E-posta Sağlayıcı' : 'Email Provider'}</Label>
                  <select
                    value={settings.mail_provider || 'resend'}
                    onChange={(e) => updateSetting('mail_provider', e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="resend">Resend</option>
                    <option value="smtp">SMTP ({tr ? 'Yakında' : 'Coming Soon'})</option>
                  </select>
                </div>
                <div>
                  <Label>API Key</Label>
                  <SecretInput
                    value={settings.mail_api_key || ''}
                    onChange={(v) => updateSetting('mail_api_key', v)}
                    placeholder="re_..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {tr ? 'Resend API anahtarınız. Boş bırakılırsa ortam değişkeni kullanılır.' : 'Your Resend API key. If empty, environment variable will be used.'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Sender Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>{tr ? 'Gönderen E-posta' : 'Sender Email'}</Label>
                  <Input
                    type="email"
                    value={settings.mail_from_address || ''}
                    onChange={(e) => updateSetting('mail_from_address', e.target.value)}
                    placeholder="info@workercms.com"
                  />
                </div>
                <div>
                  <Label>{tr ? 'Gönderen Adı' : 'Sender Name'}</Label>
                  <Input
                    value={settings.mail_from_name || ''}
                    onChange={(e) => updateSetting('mail_from_name', e.target.value)}
                    placeholder="Worker CMS"
                  />
                </div>
              </div>
              <div>
                <Label>{tr ? 'Yönetici E-posta Adresi' : 'Admin Email Address'}</Label>
                <Input
                  type="email"
                  value={settings.mail_admin_email || ''}
                  onChange={(e) => updateSetting('mail_admin_email', e.target.value)}
                  placeholder="admin@workercms.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {tr ? 'Bildirimlerin gönderileceği yönetici e-posta adresi' : 'Admin email address for receiving notifications'}
                </p>
              </div>

              <Separator />

              {/* Event Toggles & Templates */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {tr ? 'E-posta Etkinlikleri & Şablonlar' : 'Email Events & Templates'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tr ? 'Hangi durumlarda e-posta gönderilsin ve şablonları düzenleyin.' : 'Choose when to send emails and customize their templates.'}
                </p>

                <div className="space-y-1 mt-3">
                  {EMAIL_EVENTS_CONFIG.map(evt => (
                    <div key={evt.type}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: evt.accentColor }} />
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{tr ? evt.labelTr : evt.labelEn}</span>
                          <p className="text-xs text-muted-foreground truncate">{tr ? evt.descTr : evt.descEn}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <button
                          onClick={() => setEditingEvent(evt)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                          title={tr ? 'Şablonu düzenle' : 'Edit template'}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {tr ? 'Şablon' : 'Template'}
                        </button>
                        <Switch
                          checked={isEventEnabled(evt)}
                          onCheckedChange={(checked) => updateSetting(evt.settingKey, String(checked))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </AccordionCard>

      {/* Template Editor Modal */}
      {editingEvent && (
        <EmailTemplateEditor
          event={editingEvent}
          lang={lang}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </>
  );
}

export function GlobalSettings() {
  const { lang } = useAuthStore();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('timezone');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getGlobalSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateGlobalSettings(settings);
      toast(lang === 'tr' ? 'Global ayarlar kaydedildi' : 'Global settings saved', 'success');
    } catch {
      toast(lang === 'tr' ? 'Kaydetme başarısız' : 'Save failed', 'error');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-4">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</div>;

  const recaptchaEnabled = settings.recaptcha_enabled === 'true';
  const commentsEnabled = settings.comments_enabled === 'true';

  const TABS: { id: string; icon: React.ReactNode; label: string }[] = [
    { id: 'timezone', icon: <Clock className="h-4 w-4" />, label: lang === 'tr' ? 'Saat Dilimi' : 'Timezone' },
    { id: 'editor', icon: <Type className="h-4 w-4" />, label: lang === 'tr' ? 'Editör' : 'Editor' },
    { id: 'recaptcha', icon: <Shield className="h-4 w-4" />, label: 'reCAPTCHA' },
    { id: 'comments', icon: <MessageSquare className="h-4 w-4" />, label: lang === 'tr' ? 'Yorumlar' : 'Comments' },
    { id: 'email', icon: <Mail className="h-4 w-4" />, label: lang === 'tr' ? 'E-posta' : 'Email' },
    { id: 'cloudflare', icon: <Globe className="h-4 w-4" />, label: 'Cloudflare' },
    { id: 'oauth', icon: <KeyRound className="h-4 w-4" />, label: lang === 'tr' ? 'Sosyal Giriş' : 'Social Login' },
    { id: 'payments', icon: <CreditCard className="h-4 w-4" />, label: lang === 'tr' ? 'Ödemeler' : 'Payments' },
    { id: 'analytics', icon: <BarChart3 className="h-4 w-4" />, label: 'Analytics' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {lang === 'tr' ? 'Global Ayarlar' : 'Global Settings'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'tr'
              ? 'Bu ayarlar tüm sitelerde varsayılan olarak geçerlidir. Siteler kendi ayarlarından geçersiz kılabilir.'
              : 'These settings apply as defaults across all sites. Individual sites can override them.'}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? (lang === 'tr' ? 'Kaydediliyor...' : 'Saving...') : (lang === 'tr' ? 'Kaydet' : 'Save')}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Tab nav */}
        <nav className="w-full md:w-52 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-4">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors text-left ${
                tab === tabItem.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tabItem.icon}
              <span>{tabItem.label}</span>
            </button>
          ))}
        </nav>

        {/* Active section */}
        <div className="flex-1 min-w-0 max-w-2xl space-y-4">

      {/* Timezone Card */}
      {tab === 'timezone' && (
      <AccordionCard
        forceOpen
        icon={<Clock className="h-5 w-5" />}
        title={lang === 'tr' ? 'Saat Dilimi' : 'Timezone'}
        description={lang === 'tr'
          ? 'Tüm sitelerde varsayılan saat dilimi. Siteler kendi ayarlarından geçersiz kılabilir.'
          : 'Default timezone for all sites. Individual sites can override from their own settings.'}
      >
          <div>
            <Label>{lang === 'tr' ? 'Saat Dilimi' : 'Timezone'}</Label>
            <select
              value={settings.timezone || 'Europe/Istanbul'}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
              <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="Europe/Moscow">Europe/Moscow (GMT+3)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="America/Chicago">America/Chicago (GMT-6)</option>
              <option value="America/Denver">America/Denver (GMT-7)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
              <option value="Asia/Shanghai">Asia/Shanghai (GMT+8)</option>
              <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
              <option value="Australia/Sydney">Australia/Sydney (GMT+11)</option>
              <option value="Pacific/Auckland">Pacific/Auckland (GMT+13)</option>
              <option value="UTC">UTC (GMT+0)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'tr'
                ? 'Rich Snippets (Schema.org) tarih/saat bilgilerinde kullanılır.'
                : 'Used for date/time in Rich Snippets (Schema.org) structured data.'}
            </p>
          </div>
      </AccordionCard>
      )}

      {/* Editor Preference Card */}
      {tab === 'editor' && (
      <AccordionCard
        forceOpen
        icon={<Type className="h-5 w-5" />}
        title={lang === 'tr' ? 'Varsayılan Editör' : 'Default Editor'}
        description={lang === 'tr'
          ? 'Tüm yeni siteler ve editör tercihi belirtilmemiş siteler bu editörü kullanır.'
          : 'All new sites and sites without a specific editor preference will use this editor.'}
      >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              (settings.editor_type || 'classic') === 'classic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input type="radio" name="editor_type" value="classic"
                checked={(settings.editor_type || 'classic') === 'classic'}
                onChange={() => updateSetting('editor_type', 'classic')}
                className="accent-blue-500" />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Type className="h-4 w-4" />
                  {lang === 'tr' ? 'Klasik Editör' : 'Classic Editor'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Araç çubuğu tabanlı zengin metin editörü' : 'Toolbar-based rich text editor'}
                </p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.editor_type === 'blocknote' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input type="radio" name="editor_type" value="blocknote"
                checked={settings.editor_type === 'blocknote'}
                onChange={() => updateSetting('editor_type', 'blocknote')}
                className="accent-blue-500" />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Blocks className="h-4 w-4" />
                  {lang === 'tr' ? 'Blok Editör' : 'Block Editor'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Gutenberg benzeri blok tabanlı editör' : 'Gutenberg-like block-based editor'}
                </p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.editor_type === 'tiptap' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input type="radio" name="editor_type" value="tiptap"
                checked={settings.editor_type === 'tiptap'}
                onChange={() => updateSetting('editor_type', 'tiptap')}
                className="accent-blue-500" />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <PenTool className="h-4 w-4" />
                  Tiptap
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Gelişmiş özellikler: renk, highlight, YouTube, kod bloğu' : 'Advanced: color, highlight, YouTube, code blocks'}
                </p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.editor_type === 'plate' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input type="radio" name="editor_type" value="plate"
                checked={settings.editor_type === 'plate'}
                onChange={() => updateSetting('editor_type', 'plate')}
                className="accent-blue-500" />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Layers className="h-4 w-4" />
                  Plate.js
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Slate tabanlı modern editör, eklenti desteği' : 'Slate-based modern editor with plugin system'}
                </p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.editor_type === 'tinymce' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:border-gray-400'
            }`}>
              <input type="radio" name="editor_type" value="tinymce"
                checked={settings.editor_type === 'tinymce'}
                onChange={() => updateSetting('editor_type', 'tinymce')}
                className="accent-blue-500" />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Edit3 className="h-4 w-4" />
                  TinyMCE
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? 'Klasik WordPress editörü, tam özellikli' : 'Classic WordPress-style editor, full-featured'}
                </p>
              </div>
            </label>
          </div>
      </AccordionCard>

      )}

      {/* reCAPTCHA v3 Card */}
      {tab === 'recaptcha' && (
      <AccordionCard
        forceOpen
        icon={<Shield className="h-5 w-5" />}
        title="reCAPTCHA v3"
        description={lang === 'tr'
          ? 'Tüm sitelerde geçerli reCAPTCHA ayarları. Siteler kendi ayarlarından geçersiz kılabilir.'
          : 'System-wide reCAPTCHA settings. Sites can override from their own settings.'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {lang === 'tr' ? 'reCAPTCHA Aktif' : 'Enable reCAPTCHA'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'Tüm sitelerde spam koruması' : 'Spam protection across all sites'}
              </p>
            </div>
            <Switch
              checked={recaptchaEnabled}
              onCheckedChange={(checked) => updateSetting('recaptcha_enabled', String(checked))}
            />
          </div>

          {recaptchaEnabled && (
            <>
              <Separator />
              <div>
                <Label>Site Key</Label>
                <Input
                  value={settings.recaptcha_site_key || ''}
                  onChange={(e) => updateSetting('recaptcha_site_key', e.target.value)}
                  placeholder="6Lc..."
                />
              </div>
              <div>
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  value={settings.recaptcha_secret_key || ''}
                  onChange={(e) => updateSetting('recaptcha_secret_key', e.target.value)}
                  placeholder="6Lc..."
                />
              </div>
              <div>
                <Label>{lang === 'tr' ? 'Skor Eşiği' : 'Score Threshold'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.recaptcha_score_threshold || '0.5'}
                  onChange={(e) => updateSetting('recaptcha_score_threshold', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'tr' ? '0.0 (bot) - 1.0 (insan), önerilen: 0.5' : '0.0 (bot) - 1.0 (human), recommended: 0.5'}
                </p>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {lang === 'tr' ? 'Koruma Alanları' : 'Protection Areas'}
                </Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{lang === 'tr' ? 'İletişim Formu' : 'Contact Form'}</span>
                  <Switch
                    checked={settings.recaptcha_on_contact !== 'false'}
                    onCheckedChange={(checked) => updateSetting('recaptcha_on_contact', String(checked))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{lang === 'tr' ? 'Yorum Formu' : 'Comment Form'}</span>
                  <Switch
                    checked={settings.recaptcha_on_comments !== 'false'}
                    onCheckedChange={(checked) => updateSetting('recaptcha_on_comments', String(checked))}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </AccordionCard>

      )}

      {/* Comment Settings Card */}
      {tab === 'comments' && (
      <AccordionCard
        forceOpen
        icon={<MessageSquare className="h-5 w-5" />}
        title={lang === 'tr' ? 'Yorum Ayarları' : 'Comment Settings'}
        description={lang === 'tr'
          ? 'Tüm sitelerde geçerli varsayılan yorum ayarları'
          : 'Default comment settings applied across all sites'}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                {lang === 'tr' ? 'Yorumları Etkinleştir' : 'Enable Comments'}
              </Label>
              <p className="text-xs text-muted-foreground">
                {lang === 'tr' ? 'Tüm sitelerde yorumlara izin ver' : 'Allow comments across all sites'}
              </p>
            </div>
            <Switch
              checked={commentsEnabled}
              onCheckedChange={(checked) => updateSetting('comments_enabled', String(checked))}
            />
          </div>

          {commentsEnabled && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {lang === 'tr' ? 'Yorum Moderasyonu' : 'Comment Moderation'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Yorumlar yayınlanmadan önce onay gereksin' : 'Comments require approval before publishing'}
                  </p>
                </div>
                <Switch
                  checked={settings.comment_moderation === 'true'}
                  onCheckedChange={(checked) => updateSetting('comment_moderation', String(checked))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {lang === 'tr' ? 'Varsayılan Yorum Durumu' : 'Default Comment Status'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Yeni yazılarda yorumlar açık mı olsun?' : 'Should new posts have comments open?'}
                  </p>
                </div>
                <Switch
                  checked={settings.default_comment_status !== 'closed'}
                  onCheckedChange={(checked) => updateSetting('default_comment_status', checked ? 'open' : 'closed')}
                />
              </div>
            </>
          )}
        </div>
      </AccordionCard>

      )}

      {/* Mail Settings & Templates Card */}
      {tab === 'email' && (
        <EmailSettingsCard lang={lang} settings={settings} updateSetting={updateSetting} forceOpen />
      )}

      {/* Cloudflare Integration Card */}
      {tab === 'cloudflare' && (
        <CloudflareSettingsCard lang={lang} settings={settings} updateSetting={updateSetting} forceOpen />
      )}

      {/* OAuth / Social Login Card */}
      {tab === 'oauth' && (
        <OAuthSettingsCard lang={lang} settings={settings} updateSetting={updateSetting} forceOpen />
      )}

      {/* Payments: Stripe + Creem + Crypto */}
      {tab === 'payments' && (
      <>
      {/* Stripe Payment Card */}
      <AccordionCard
        forceOpen
        icon={<span className="text-lg">💳</span>}
        title={<>{lang === 'tr' ? 'Stripe Ödeme' : 'Stripe Payment'}<span className={`ml-auto w-2 h-2 rounded-full ${settings.stripe_secret_key ? 'bg-green-500' : 'bg-orange-400'}`} /></>}
        description={lang === 'tr'
          ? 'Stripe ile kredi kartı ödemelerini kabul etmek için yapılandırma.'
          : 'Configuration to accept credit card payments via Stripe.'}
      >
        <div className="space-y-4">
          <div>
            <Label>Stripe Secret Key</Label>
            <SecretInput
              value={settings.stripe_secret_key || ''}
              onChange={(v) => updateSetting('stripe_secret_key', v)}
              placeholder="sk_live_..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'tr' ? 'Stripe Dashboard → Developers → API keys' : 'Stripe Dashboard → Developers → API keys'}
            </p>
          </div>
          <div>
            <Label>Stripe Publishable Key</Label>
            <Input
              value={settings.stripe_publishable_key || ''}
              onChange={(e) => updateSetting('stripe_publishable_key', e.target.value)}
              placeholder="pk_live_..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>Stripe Webhook Secret</Label>
            <SecretInput
              value={settings.stripe_webhook_secret || ''}
              onChange={(v) => updateSetting('stripe_webhook_secret', v)}
              placeholder="whsec_..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'tr' ? 'Stripe Dashboard → Developers → Webhooks → Signing secret' : 'Stripe Dashboard → Developers → Webhooks → Signing secret'}
            </p>
          </div>
          <Separator />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">
              {lang === 'tr' ? '📖 Stripe Kurulum Rehberi' : '📖 Stripe Setup Guide'}
            </summary>
            <ol className="mt-2 space-y-1.5 list-decimal list-inside pl-1">
              <li>{lang === 'tr' ? 'Stripe hesabı oluşturun: stripe.com' : 'Create a Stripe account: stripe.com'}</li>
              <li>{lang === 'tr' ? 'Dashboard → Developers → API keys → Secret key ve Publishable key kopyalayın' : 'Dashboard → Developers → API keys → Copy Secret and Publishable keys'}</li>
              <li>{lang === 'tr' ? 'Dashboard → Developers → Webhooks → "Add endpoint" tıklayın' : 'Dashboard → Developers → Webhooks → Click "Add endpoint"'}</li>
              <li>
                Webhook URL: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">https://{'{'}ADMIN_DOMAIN{'}'}/api/webhooks/stripe</code>
              </li>
              <li>{lang === 'tr' ? 'Events: checkout.session.completed, invoice.paid, customer.subscription.deleted' : 'Events: checkout.session.completed, invoice.paid, customer.subscription.deleted'}</li>
              <li>{lang === 'tr' ? 'Webhook signing secret\'ı kopyalayıp yukarıya yapıştırın' : 'Copy the webhook signing secret and paste above'}</li>
              <li>{lang === 'tr' ? 'Paket yönetiminden Stripe Price ID\'leri tanımlayın' : 'Define Stripe Price IDs from package management'}</li>
            </ol>
          </details>
        </div>
      </AccordionCard>

      {/* Creem Payment Card — credit-card provider used by "Pay with Card" */}
      <AccordionCard
        forceOpen
        icon={<span className="text-lg">💳</span>}
        title={<>{lang === 'tr' ? 'Creem Ödeme (Kredi Kartı)' : 'Creem Payment (Card)'}<span className={`ml-auto w-2 h-2 rounded-full ${settings.creem_api_key ? 'bg-green-500' : 'bg-orange-400'}`} /></>}
        description={lang === 'tr'
          ? 'Kredi kartı ödemeleri Creem.io üzerinden alınır. Paket ürün ID\'leri Paket Yönetimi\'nden girilir.'
          : 'Credit-card payments are processed via Creem.io. Product IDs are set per package in Package Management.'}
      >
        <div className="space-y-4">
          <div>
            <Label>Creem API Key</Label>
            <SecretInput
              value={settings.creem_api_key || ''}
              onChange={(v) => updateSetting('creem_api_key', v)}
              placeholder="creem_..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'tr' ? 'Creem Dashboard → Developers → API Keys' : 'Creem Dashboard → Developers → API Keys'}
            </p>
          </div>
          <div>
            <Label>Creem Webhook Secret</Label>
            <SecretInput
              value={settings.creem_webhook_secret || ''}
              onChange={(v) => updateSetting('creem_webhook_secret', v)}
              placeholder="whsec_..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lang === 'tr' ? 'Creem Dashboard → Developers → Webhooks → Signing secret' : 'Creem Dashboard → Developers → Webhooks → Signing secret'}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.creem_test_mode === '1'}
              onChange={(e) => updateSetting('creem_test_mode', e.target.checked ? '1' : '0')}
              className="rounded"
            />
            <span className="text-sm">
              {lang === 'tr' ? 'Test (sandbox) modu — gerçek tahsilat yapılmaz' : 'Test (sandbox) mode — no real charges'}
            </span>
          </label>
          <Separator />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground transition-colors font-medium">
              {lang === 'tr' ? '📖 Creem Kurulum Rehberi' : '📖 Creem Setup Guide'}
            </summary>
            <ol className="mt-2 space-y-1.5 list-decimal list-inside pl-1">
              <li>{lang === 'tr' ? 'Creem hesabı oluşturun: creem.io' : 'Create a Creem account: creem.io'}</li>
              <li>{lang === 'tr' ? 'Developers → API Keys → anahtarı kopyalayın (test için test anahtarı)' : 'Developers → API Keys → copy the key (test key for sandbox)'}</li>
              <li>{lang === 'tr' ? 'Her paket için aylık/yıllık bir ürün (Product) oluşturun' : 'Create a monthly/yearly Product for each package'}</li>
              <li>{lang === 'tr' ? 'Ürün ID\'lerini (prod_...) Paket Yönetimi → ilgili pakete girin' : 'Enter the Product IDs (prod_...) in Package Management'}</li>
              <li>{lang === 'tr' ? 'Developers → Webhooks → endpoint ekleyin:' : 'Developers → Webhooks → add an endpoint:'}</li>
              <li>
                Webhook URL: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">https://{'{'}ADMIN_DOMAIN{'}'}/api/webhooks/creem</code>
              </li>
              <li>{lang === 'tr' ? 'Events: checkout.completed, subscription.paid, subscription.canceled, subscription.expired' : 'Events: checkout.completed, subscription.paid, subscription.canceled, subscription.expired'}</li>
              <li>{lang === 'tr' ? 'Webhook signing secret\'ı kopyalayıp yukarıya yapıştırın' : 'Copy the webhook signing secret and paste above'}</li>
            </ol>
          </details>
        </div>
      </AccordionCard>

      {/* Crypto Payment Wallets Card */}
      <AccordionCard
        forceOpen
        icon={<span className="text-lg">🪙</span>}
        title={<>{lang === 'tr' ? 'Crypto Ödeme Cüzdanları' : 'Crypto Payment Wallets'}<span className={`ml-auto w-2 h-2 rounded-full ${Object.keys(settings).some(k => k.startsWith('crypto_wallet_') && settings[k]) ? 'bg-green-500' : 'bg-orange-400'}`} /></>}
        description={lang === 'tr'
          ? 'USDT/USDC kabul etmek için her ağın cüzdan adresini girin. Boş bırakılan ağlar kullanıcıya gösterilmez.'
          : 'Enter wallet addresses for each network to accept USDT/USDC. Empty networks won\'t be shown to users.'}
      >
        <div className="space-y-4">
          {[
            { id: 'ethereum', label: 'Ethereum (ERC-20)', placeholder: '0x...' },
            { id: 'bsc', label: 'BNB Smart Chain (BEP-20)', placeholder: '0x...' },
            { id: 'polygon', label: 'Polygon', placeholder: '0x...' },
            { id: 'arbitrum', label: 'Arbitrum', placeholder: '0x...' },
            { id: 'optimism', label: 'Optimism', placeholder: '0x...' },
            { id: 'avalanche', label: 'Avalanche (C-Chain)', placeholder: '0x...' },
            { id: 'solana', label: 'Solana (SPL)', placeholder: '' },
            { id: 'tron', label: 'Tron (TRC-20)', placeholder: 'T...' },
          ].map(({ id, label, placeholder }) => (
            <div key={id} className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
              <Label className="text-xs font-semibold">{label}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">USDT</Label>
                  <Input
                    value={settings[`crypto_wallet_usdt_${id}`] || settings[`crypto_wallet_${id}`] || ''}
                    onChange={(e) => updateSetting(`crypto_wallet_usdt_${id}`, e.target.value)}
                    placeholder={placeholder || `USDT ${label}`}
                    className="font-mono text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-0.5 block">USDC</Label>
                  <Input
                    value={settings[`crypto_wallet_usdc_${id}`] || ''}
                    onChange={(e) => updateSetting(`crypto_wallet_usdc_${id}`, e.target.value)}
                    placeholder={placeholder || `USDC ${label}`}
                    className="font-mono text-xs h-8"
                  />
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-2">
            {lang === 'tr'
              ? '💡 Her ağ için USDT ve USDC adreslerini ayrı ayrı girebilirsiniz. Sadece adresi girilen token/ağ kombinasyonları kullanıcıya gösterilir.'
              : '💡 Enter USDT and USDC addresses separately per network. Only token/network combinations with an address will be shown to users.'}
          </p>
        </div>
      </AccordionCard>

      </>
      )}

      {/* Analytics / Tracking Codes Card */}
      {tab === 'analytics' && (
      <AccordionCard
        forceOpen
        icon={<BarChart3 className="h-5 w-5" />}
        title={lang === 'tr' ? 'Analytics / İzleme Kodları' : 'Analytics / Tracking Codes'}
        description={lang === 'tr'
          ? 'Tüm sitelerde geçerli analytics ve izleme kodları. Her site kendi ayarlarından override edebilir.'
          : 'Analytics and tracking codes applied across all sites. Individual sites can override from their own settings.'}
      >
        <div className="space-y-4">
          <div>
            <Label>{lang === 'tr' ? '<head> İçine Eklenecek Kod' : 'Code for <head> Section'}</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr'
                ? 'Google Analytics, Google Tag Manager veya diğer izleme kodları. <script> etiketleri dahil yapıştırın.'
                : 'Google Analytics, Google Tag Manager or other tracking codes. Paste including <script> tags.'}
            </p>
            <textarea
              value={settings.analytics_head_code || ''}
              onChange={(e) => updateSetting('analytics_head_code', e.target.value)}
              rows={5}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
              placeholder={'<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  ...\n</script>'}
            />
          </div>
          <Separator />
          <div>
            <Label>{lang === 'tr' ? '</body> Öncesine Eklenecek Kod' : 'Code Before </body>'}</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {lang === 'tr'
                ? 'Sayfa yüklendikten sonra çalışması gereken izleme kodları veya scriptler.'
                : 'Tracking codes or scripts that should run after page load.'}
            </p>
            <textarea
              value={settings.analytics_body_code || ''}
              onChange={(e) => updateSetting('analytics_body_code', e.target.value)}
              rows={5}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono text-xs"
              placeholder={'<!-- Facebook Pixel, Hotjar, etc. -->'}
            />
          </div>
        </div>
      </AccordionCard>
      )}

        </div>
      </div>
    </div>
  );
}
