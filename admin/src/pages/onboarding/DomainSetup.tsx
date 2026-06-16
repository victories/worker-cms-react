import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useSiteStore } from '@/stores/siteStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ui/dropdown-menu';
import { Globe, ArrowRight, Loader2, CheckCircle2, AlertCircle, Copy, Check, RefreshCw, Server, PartyPopper, LogOut, ChevronDown } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';

export function DomainSetup() {
  const { lang, user, logout } = useAuthStore();
  const { fetchSites } = useSiteStore();
  const navigate = useNavigate();
  const tr = lang === 'tr';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [step, setStep] = useState<'enter' | 'cname'>('enter');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [cnameInfo, setCnameInfo] = useState<{
    domain: string;
    cname_target: string;
    custom_hostname_id: string;
    site_id: number;
    status: string;
    is_subdomain?: boolean;
  } | null>(null);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanDomain = (d: string) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = cleanDomain(domain);
    if (!clean || !clean.includes('.')) {
      setError(tr ? 'Geçerli bir domain girin (örn: example.com)' : 'Enter a valid domain (e.g., example.com)');
      return;
    }

    setLoading(true);
    try {
      const res = await api.request('/domains/setup', {
        method: 'POST',
        body: { domain: clean },
      }) as any;

      if (res.success) {
        setCnameInfo({
          domain: res.data.domain,
          cname_target: res.data.cname_target,
          custom_hostname_id: res.data.custom_hostname_id,
          site_id: res.data.site_id,
          status: res.data.status,
          is_subdomain: res.data.is_subdomain,
        });
        setStep('cname');
        // Refresh sites so the new site appears in sidebar
        await fetchSites();
      } else {
        setError(res.error || 'Failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!cnameInfo) return;
    setError('');
    setVerifying(true);

    try {
      const res = await api.request('/domains/verify', {
        method: 'POST',
        body: { domain: cnameInfo.domain },
      }) as any;

      if (res.success && res.data?.verified) {
        setVerified(true);
      } else if (res.success && !res.data?.verified) {
        // Build the message client-side — the backend's `message` is
        // Turkish-only, so it leaked Turkish onto the English UI.
        const target = res.data?.cname_target || cnameInfo.cname_target;
        setError(
          tr
            ? `CNAME kaydı henüz algılanmadı. Domain sağlayıcınızda kaydı ${target} olarak ayarladığınızdan emin olun.`
            : `CNAME record not detected yet. Make sure the record points to ${target} at your DNS provider.`
        );
      } else {
        setError(res.error || (tr ? 'Doğrulama başarısız' : 'Verification failed'));
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const copyCname = () => {
    if (cnameInfo) {
      navigator.clipboard.writeText(cnameInfo.cname_target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="auth-v2 relative min-h-screen flex flex-col">
      {/* Background layers — match the landing/auth dark theme */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1B1B20] bg-[#0A0A0B]/80 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2 text-[#FAFAF7] hover:opacity-90 transition-opacity">
          <Wordmark size={32} />
          <span className="font-semibold">Worker CMS</span>
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-sm text-[#8A8A93] hover:text-[#F5A524] transition-colors rounded-md px-2 py-1 -mr-2">
              {user?.display_name || user?.email}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0F0F11] border-[#1B1B20] text-[#E2E2E5]">
            <DropdownMenuItem onClick={handleLogout} className="focus:bg-[#141418] focus:text-[#FAFAF7]">
              <LogOut className="h-4 w-4 mr-2" />
              {tr ? 'Çıkış Yap' : 'Log Out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step 1: Enter Domain */}
          {step === 'enter' && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5A524]/10 mb-4">
                  <Globe className="w-8 h-8 text-[#F5A524]" />
                </div>
                <h1 className="font-serif text-4xl text-[#FAFAF7] mb-2">
                  {tr ? 'Domain Ekle' : 'Add Domain'}
                </h1>
                <p className="text-[#8A8A93] text-sm">
                  {tr ? 'Siteniz için kullanmak istediğiniz domain adını girin.' : 'Enter the domain name you want to use for your site.'}
                </p>
              </div>

              <form onSubmit={handleSetup} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-300 bg-red-500/10 rounded-lg border border-red-500/30">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C5C66] z-10" />
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    className="h-12 pl-10 text-base font-mono"
                    autoFocus
                    required
                  />
                </div>

                <p className="text-xs text-[#5C5C66]">
                  {tr
                    ? 'Domain adını girin (örn: example.com veya sub.example.com). Root domainlerde www otomatik eklenecektir.'
                    : 'Enter your domain (e.g. example.com or sub.example.com). www will be added automatically for root domains.'}
                </p>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-lg font-medium text-[#0A0A0B] bg-gradient-to-br from-[#F5A524] to-[#E89414] hover:from-[#FFB638] hover:to-[#F5A524] shadow-lg shadow-amber-500/20 transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {tr ? 'Ayarlanıyor...' : 'Setting up...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {tr ? 'Devam Et' : 'Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Skip option */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="text-sm text-[#8A8A93] hover:text-[#F5A524] transition-colors"
                >
                  {tr ? 'Şimdilik atla, sonra eklerim →' : 'Skip for now, add later →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: CNAME Instructions + Go to Dashboard */}
          {step === 'cname' && cnameInfo && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h1 className="font-serif text-4xl text-[#FAFAF7] mb-2">
                  {tr ? 'Siteniz Oluşturuldu! 🎉' : 'Your Site is Created! 🎉'}
                </h1>
                <p className="text-[#8A8A93] text-sm">
                  {tr
                    ? 'Siteniz hazır, hemen içerik oluşturmaya başlayabilirsiniz. Domain\'in tam çalışması için CNAME kaydı eklemeniz yeterli.'
                    : 'Your site is ready, you can start creating content right away. Just add a CNAME record for the domain to fully work.'}
                </p>
              </div>

              {/* Verified success */}
              {verified && (
                <div className="flex items-center gap-2 p-3 mb-4 text-sm text-emerald-300 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <PartyPopper className="w-4 h-4 flex-shrink-0" />
                  {tr ? 'CNAME doğrulandı! Domain aktif.' : 'CNAME verified! Domain is active.'}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-orange-300 bg-orange-500/10 rounded-lg border border-orange-500/30 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Go to Dashboard CTA */}
              <Button
                onClick={handleGoToDashboard}
                className="w-full h-11 rounded-lg font-medium text-[#0A0A0B] bg-gradient-to-br from-[#F5A524] to-[#E89414] hover:from-[#FFB638] hover:to-[#F5A524] shadow-lg shadow-amber-500/20 transition-all mb-6"
              >
                {tr ? 'Panele Git ve İçerik Oluştur' : 'Go to Dashboard & Create Content'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* CNAME Records section */}
              <div className="rounded-xl border border-[#1B1B20] bg-[#0F0F11]/80 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-[#F5A524]" />
                  <h3 className="font-semibold text-sm text-[#FAFAF7]">
                    {tr ? 'CNAME Kaydı Ekleyin' : 'Add CNAME Record'}
                  </h3>
                  {!verified && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">
                      {tr ? 'Bekliyor' : 'Pending'}
                    </span>
                  )}
                  {verified && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                      {tr ? 'Aktif ✓' : 'Active ✓'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#8A8A93]">
                  {tr
                    ? cnameInfo.is_subdomain
                      ? `Domain sağlayıcınızda ${cnameInfo.domain} için aşağıdaki CNAME kaydını ekleyin.`
                      : `Domain sağlayıcınızda ${cnameInfo.domain} ve www.${cnameInfo.domain} için aşağıdaki CNAME kaydını ekleyin.`
                    : cnameInfo.is_subdomain
                      ? `Add the following CNAME record for ${cnameInfo.domain} at your DNS provider.`
                      : `Add the following CNAME record for ${cnameInfo.domain} and www.${cnameInfo.domain} at your DNS provider.`}
                </p>

                {/* CNAME Record */}
                <div className="space-y-2">
                  {/* Bare domain */}
                  <div className="bg-[#0A0A0B] rounded-lg px-4 py-3 border border-[#1B1B20] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8A8A93]">{tr ? 'Kayıt Tipi' : 'Record Type'}</span>
                      <span className="font-mono text-xs font-bold text-[#F5A524]">CNAME</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8A8A93]">{tr ? 'Ad / Host' : 'Name / Host'}</span>
                      <span className="font-mono text-xs text-[#E2E2E5]">
                        {cnameInfo.is_subdomain ? cnameInfo.domain : `@ ${tr ? 'veya' : 'or'} ${cnameInfo.domain}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8A8A93]">{tr ? 'Hedef / Value' : 'Target / Value'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#FAFAF7]">{cnameInfo.cname_target}</span>
                        <button
                          type="button"
                          onClick={copyCname}
                          className="text-[#8A8A93] hover:text-[#F5A524] transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* www variant — root domains only; a subdomain has no www */}
                  {!cnameInfo.is_subdomain && (
                    <div className="bg-[#0A0A0B] rounded-lg px-4 py-3 border border-[#1B1B20] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8A8A93]">{tr ? 'Kayıt Tipi' : 'Record Type'}</span>
                        <span className="font-mono text-xs font-bold text-[#F5A524]">CNAME</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8A8A93]">{tr ? 'Ad / Host' : 'Name / Host'}</span>
                        <span className="font-mono text-xs text-[#E2E2E5]">www</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#8A8A93]">{tr ? 'Hedef / Value' : 'Target / Value'}</span>
                        <span className="font-mono text-xs font-bold text-[#FAFAF7]">{cnameInfo.cname_target}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick guide */}
                <details className="text-xs text-[#8A8A93]">
                  <summary className="cursor-pointer hover:text-[#F5A524] transition-colors font-medium">
                    {tr ? 'Nasıl yapılır?' : 'How to do this?'}
                  </summary>
                  <ol className="mt-2 space-y-1 list-decimal list-inside pl-1">
                    <li>{tr ? 'Domain sağlayıcınızın (GoDaddy, Namecheap vb.) DNS paneline girin' : 'Log in to your DNS provider (GoDaddy, Namecheap, etc.)'}</li>
                    <li>{tr ? 'DNS kayıtları bölümüne gidin' : 'Go to DNS records section'}</li>
                    <li>{tr ? `Yeni bir CNAME kaydı ekleyin: ${cnameInfo.is_subdomain ? cnameInfo.domain : '@'} → ${cnameInfo.cname_target}` : `Add a new CNAME record: ${cnameInfo.is_subdomain ? cnameInfo.domain : '@'} → ${cnameInfo.cname_target}`}</li>
                    {!cnameInfo.is_subdomain && (
                      <li>{tr ? `www için de aynı CNAME kaydını ekleyin: www → ${cnameInfo.cname_target}` : `Add the same CNAME for www: www → ${cnameInfo.cname_target}`}</li>
                    )}
                    <li>{tr ? 'Kaydedin. Yayılma genellikle 1-5 dakika sürer' : 'Save. Propagation usually takes 1-5 minutes'}</li>
                  </ol>
                </details>

                <div className="bg-[#F5A524]/[0.06] rounded-lg px-3 py-2 border border-[#F5A524]/20">
                  <p className="text-xs text-[#E2E2E5]">
                    {tr
                      ? '💡 NS değiştirmenize gerek yok! Sadece CNAME kaydı eklemek yeterli. Mevcut e-posta ve diğer DNS kayıtlarınız etkilenmez.'
                      : '💡 No need to change nameservers! Just add a CNAME record. Your existing email and other DNS records are not affected.'}
                  </p>
                </div>

                {/* Manual verify button */}
                {!verified && (
                  <Button
                    onClick={handleVerify}
                    variant="outline"
                    size="sm"
                    className="w-full border-[#26262C] bg-[#0A0A0B] text-[#E2E2E5] hover:bg-[#141418] hover:border-[#3A3A42] hover:text-[#FAFAF7]"
                    disabled={verifying}
                  >
                    {verifying ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {tr ? 'Kontrol ediliyor...' : 'Checking...'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        {tr ? 'CNAME Durumunu Kontrol Et' : 'Check CNAME Status'}
                      </span>
                    )}
                  </Button>
                )}

                <p className="text-xs text-[#5C5C66] text-center">
                  {tr
                    ? '💡 CNAME yayılması otomatik kontrol ediliyor. Panelde çalışmaya başlayabilirsiniz.'
                    : '💡 CNAME propagation is checked automatically. You can start working in the panel.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
