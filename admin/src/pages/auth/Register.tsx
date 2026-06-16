import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Check, Zap, Crown, Building2, ArrowRight, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';
import { Wordmark } from '@/components/Wordmark';

/**
 * Register — landing v2 themed (see Login.tsx for design rationale).
 *
 * Two-step flow: plan picker (defaults via ?plan=) → email/password form.
 *
 * The self-serve plans (Free / Pro / …) come from the admin-editable
 * `packages` table via /api/packages, so editing a plan's name, price or
 * features in Paket Yönetimi reflects here immediately. Only the contact
 * ("Kurumsal" / "Enterprise") card is hardcoded — it routes to
 * /legal/iletisim instead of registering. The packages table is
 * single-language, so whatever the admin types shows in both TR and EN;
 * only the surrounding chrome (buttons, "Free", price period) is i18n'd.
 *
 * The backend (src/routes/api/auth.ts) maps the chosen plan slug to
 * PLAN_LIMITS. The packages table has no slug column, so we derive one
 * from max_sites: a 1-site package is `starter`, anything larger is `pro`.
 */

interface PackageData {
  id: number;
  name: string;
  description: string | null;
  price_monthly: number;
  max_sites: number;
  features: string | null;
}

// Derive the backend plan slug (PLAN_LIMITS key) from a package. The
// table has no slug column: a single-site package is the free "starter"
// tier, anything larger is "pro". The unlimited "enterprise" tier is the
// hardcoded contact card and never registers directly.
const planSlug = (pkg: PackageData): 'starter' | 'pro' =>
  pkg.max_sites <= 1 ? 'starter' : 'pro';

const parseFeatures = (raw: string | null): string[] => {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const planIcon = (pkg: PackageData) => (pkg.price_monthly <= 0 ? Zap : Crown);

export function Register() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'plan' | 'form'>('plan');
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'starter');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const { lang } = useAuthStore();
  const navigate = useNavigate();
  const tr = lang === 'tr';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/packages');
        const data = (await res.json()) as any;
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setPackages(data.data);
        }
      } catch {
        /* ignore — picker still shows the contact card */
      }
      if (!cancelled) setLoadingPkgs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) setSelectedPlan(planParam);
  }, [searchParams]);

  // Highlight ("Popüler") the most expensive self-serve package — the
  // Pro tier — without relying on a column the table doesn't have.
  const highlightedId =
    packages.length > 0
      ? packages.reduce((top, p) => (p.price_monthly > top.price_monthly ? p : top)).id
      : null;

  const contactName = tr ? 'Kurumsal' : 'Enterprise';
  const contactFeatures = tr
    ? ['Sınırsız site', 'SSO + SAML', 'SLA garantisi (%99.99)', 'Özel eklenti geliştirme', 'Size özel hesap yöneticisi']
    : ['Unlimited sites', 'SSO + SAML', 'SLA guarantee (99.99%)', 'Custom plugin development', 'Dedicated account manager'];

  const handleSelectPackage = (pkg: PackageData) => {
    setSelectedPlan(planSlug(pkg));
    setStep('form');
  };

  const handleContact = () => {
    window.location.href = '/legal/iletisim';
  };

  const selectedName =
    packages.find((p) => planSlug(p) === selectedPlan)?.name || selectedPlan;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.request('/auth/register', {
        method: 'POST',
        body: { email, password, display_name: displayName, plan: selectedPlan },
      }) as any;

      if (res.success) {
        const { access_token, refresh_token, user } = res.data;
        api.setToken(access_token);
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        useAuthStore.getState().initialize();
        navigate('/setup-domain');
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => { window.location.href = '/api/auth/google'; };
  const handleGithubLogin = () => { window.location.href = '/api/auth/github'; };

  return (
    <div className="auth-v2 min-h-screen flex flex-col">
      {/* Background layers */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1B1B20] bg-[#0A0A0B]/80 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2 text-[#FAFAF7] hover:opacity-90 transition-opacity">
          <Wordmark size={32} />
          <span className="font-semibold">Worker CMS</span>
        </a>
        <a href="/admin/login" className="text-sm text-[#8A8A93] hover:text-[#F5A524] transition-colors">
          {tr ? 'Zaten hesabın var mı? Giriş yap' : 'Already have an account? Sign in'}
        </a>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6">
        {step === 'plan' ? (
          <div className="w-full max-w-5xl">
            <div className="text-center mb-10">
              <h1 className="font-serif text-4xl md:text-5xl text-[#FAFAF7] mb-3">
                {tr ? 'Planını Seç' : 'Choose Your Plan'}
              </h1>
              <p className="text-[#8A8A93]">
                {tr ? 'İhtiyacına uygun planla başla. İstediğin zaman yükselt.' : 'Start with the plan that fits. Upgrade anytime.'}
              </p>
            </div>

            {loadingPkgs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#5C5C66]" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6" style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Self-serve plans — admin-editable from Paket Yönetimi */}
                {packages.map((pkg) => {
                  const Icon = planIcon(pkg);
                  const slug = planSlug(pkg);
                  const isSelected = selectedPlan === slug;
                  const highlighted = pkg.id === highlightedId;
                  const isFree = pkg.price_monthly <= 0;
                  const features = parseFeatures(pkg.features);

                  return (
                    <div
                      key={pkg.id}
                      className={`relative rounded-2xl border p-6 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm ${
                        highlighted
                          ? 'border-[#F5A524]/40 bg-gradient-to-b from-[#F5A524]/[0.06] to-[#0F0F11] shadow-[0_0_0_1px_rgba(245,165,36,0.35),0_30px_60px_-30px_rgba(245,165,36,0.25)]'
                          : isSelected
                            ? 'border-[#F5A524]/30 bg-[#0F0F11]'
                            : 'border-[#1B1B20] bg-[#0F0F11]/80 hover:border-[#3A3A42] hover:bg-[#141418]'
                      }`}
                      style={{ flex: '0 1 calc(33.333% - 18px)', minWidth: 260 }}
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      {highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F5A524] text-[#0A0A0B] text-[10px] font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
                          {tr ? 'Popüler' : 'Popular'}
                        </div>
                      )}

                      <div className="w-12 h-12 rounded-xl bg-[#F5A524]/10 text-[#F5A524] flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6" />
                      </div>

                      <h3 className="font-serif text-2xl text-[#FAFAF7] mb-1">{pkg.name}</h3>

                      <div className="flex items-baseline gap-1 mb-5">
                        {isFree ? (
                          <span className="font-serif text-4xl text-[#FAFAF7]">{tr ? 'Ücretsiz' : 'Free'}</span>
                        ) : (
                          <>
                            <span className="text-lg text-[#8A8A93]">$</span>
                            <span className="font-serif text-4xl text-[#FAFAF7]">{pkg.price_monthly}</span>
                            <span className="text-[#8A8A93] text-sm">/{tr ? 'ay' : 'mo'}</span>
                          </>
                        )}
                      </div>

                      <ul className="space-y-2.5 mb-6">
                        {features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-[#B5B5BC]">
                            <Check className="w-4 h-4 text-[#F5A524] flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        className={
                          highlighted
                            ? 'w-full flex items-center justify-center gap-2 h-11 rounded-lg font-medium text-[#0A0A0B] bg-gradient-to-br from-[#F5A524] to-[#E89414] hover:from-[#FFB638] hover:to-[#F5A524] shadow-lg shadow-amber-500/20 transition-all'
                            : 'w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]'
                        }
                      >
                        {tr ? 'Seç' : 'Select'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Contact / Enterprise — hardcoded, routes to contact page */}
                <div
                  className="relative rounded-2xl border border-[#1B1B20] bg-[#0F0F11]/80 hover:border-[#3A3A42] hover:bg-[#141418] p-6 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm"
                  style={{ flex: '0 1 calc(33.333% - 18px)', minWidth: 260 }}
                  onClick={handleContact}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#F5A524]/10 text-[#F5A524] flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6" />
                  </div>

                  <h3 className="font-serif text-2xl text-[#FAFAF7] mb-1">{contactName}</h3>

                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="font-serif text-2xl text-[#FAFAF7]">{tr ? 'Bize Ulaşın' : 'Contact Us'}</span>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {contactFeatures.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-[#B5B5BC]">
                        <Check className="w-4 h-4 text-[#F5A524] flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button className="w-full flex items-center justify-center gap-2 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]">
                    <MessageSquare className="w-4 h-4" />
                    {tr ? 'İletişime Geç' : 'Contact Us'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Registration Form */
          <div className="w-full max-w-md">
            <button
              onClick={() => setStep('plan')}
              className="flex items-center gap-1.5 text-sm text-[#8A8A93] hover:text-[#F5A524] mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {tr ? 'Plan seçimine dön' : 'Back to plans'}
            </button>

            <div className="rounded-2xl border border-[#1B1B20] bg-[#0F0F11]/90 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
              <div className="mb-6">
                <div className="inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider text-[#0A0A0B] bg-[#F5A524] mb-3">
                  {selectedName}
                </div>
                <h2 className="font-serif text-3xl text-[#FAFAF7] mb-1.5">
                  {tr ? 'Hesap Oluştur' : 'Create Account'}
                </h2>
                <p className="text-sm text-[#8A8A93]">
                  {tr ? 'Bilgilerini gir ve hemen başla.' : 'Enter your details and get started.'}
                </p>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-2.5 mb-5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {tr ? 'Google ile Kayıt Ol' : 'Sign up with Google'}
                </button>

                <button
                  type="button"
                  onClick={handleGithubLogin}
                  className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FAFAF7">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {tr ? 'GitHub ile Kayıt Ol' : 'Sign up with GitHub'}
                </button>
              </div>

              <div className="relative mb-5 py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1B1B20]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0F0F11] px-3 text-[#5C5C66] font-mono uppercase tracking-wider">
                    {tr ? 'veya e-posta ile' : 'or with email'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-300 bg-red-500/10 rounded-lg border border-red-500/30">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="display_name" className="text-xs font-medium uppercase tracking-wider font-mono">
                    {tr ? 'Ad Soyad' : 'Full Name'}
                  </label>
                  <input
                    id="display_name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={tr ? 'Adın Soyadın' : 'Your full name'}
                    required
                    autoFocus
                    className="w-full h-11 rounded-lg border px-3 text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg_email" className="text-xs font-medium uppercase tracking-wider font-mono">
                    {tr ? 'E-posta' : 'Email'}
                  </label>
                  <input
                    id="reg_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full h-11 rounded-lg border px-3 text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reg_password" className="text-xs font-medium uppercase tracking-wider font-mono">
                    {tr ? 'Şifre' : 'Password'}
                  </label>
                  <input
                    id="reg_password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tr ? 'En az 8 karakter' : 'At least 8 characters'}
                    required
                    minLength={8}
                    className="w-full h-11 rounded-lg border px-3 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-lg font-medium text-[#0A0A0B] bg-gradient-to-br from-[#F5A524] to-[#E89414] hover:from-[#FFB638] hover:to-[#F5A524] shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {tr ? 'Oluşturuluyor...' : 'Creating...'}
                    </span>
                  ) : (
                    tr ? 'Hesap Oluştur' : 'Create Account'
                  )}
                </button>

                <p className="text-xs text-center text-[#5C5C66] leading-relaxed mt-4">
                  {tr
                    ? 'Kayıt olarak kullanım koşullarını ve gizlilik politikasını kabul etmiş olursun.'
                    : 'By signing up, you agree to our terms of service and privacy policy.'}
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
