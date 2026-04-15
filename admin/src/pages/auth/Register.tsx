import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Check, Zap, Crown, Building2, ArrowRight, ArrowLeft, Loader2, MessageSquare } from 'lucide-react';

interface PackageData {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string;
  is_active: number;
  sort_order: number;
  highlighted?: number;
}

const ICON_MAP: Record<string, any> = {
  starter: Zap,
  pro: Crown,
  enterprise: Building2,
};

const COLOR_MAP: Record<string, string> = {
  starter: 'from-zinc-600 to-zinc-800',
  pro: 'from-blue-600 to-indigo-600',
  enterprise: 'from-red-600 to-rose-700',
};

const BORDER_MAP: Record<string, string> = {
  starter: 'border-zinc-300 dark:border-zinc-700',
  pro: 'border-blue-400 dark:border-blue-500',
  enterprise: 'border-red-300 dark:border-red-700',
};

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
    loadPackages();
  }, []);

  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) setSelectedPlan(planParam);
  }, [searchParams]);

  const loadPackages = async () => {
    setLoadingPkgs(true);
    try {
      const res = await fetch('/api/packages');
      const data = await res.json() as any;
      if (data.success && data.data) {
        setPackages(data.data);
      }
    } catch { /* ignore */ }
    setLoadingPkgs(false);
  };

  const handleSelectPlan = (slug: string) => {
    if (slug === 'kurumsal') {
      window.location.href = '/iletisim';
      return;
    }
    setSelectedPlan(slug);
    setStep('form');
  };

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

  // Parse features JSON
  const getFeatures = (pkg: PackageData): string[] => {
    try {
      const parsed = JSON.parse(pkg.features || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getIcon = (slug: string) => ICON_MAP[slug] || Zap;
  const getColor = (slug: string) => COLOR_MAP[slug] || 'from-gray-600 to-gray-800';
  const getBorder = (slug: string) => BORDER_MAP[slug] || 'border-gray-300 dark:border-gray-700';

  // Enterprise / Kurumsal card (always shown)
  const kurumsalCard = {
    slug: 'kurumsal',
    name: tr ? 'Kurumsal' : 'Enterprise',
    icon: Building2,
    color: 'from-violet-600 to-purple-700',
    border: 'border-violet-300 dark:border-violet-700',
    features: tr
      ? ['Sınırsız Site', 'Sınırsız Depolama', '7/24 Destek', 'SLA Garantisi', 'Özel Entegrasyonlar', 'Beyaz Etiket (White Label)']
      : ['Unlimited Sites', 'Unlimited Storage', '24/7 Support', 'SLA Guarantee', 'Custom Integrations', 'White Label'],
  };

  // Combine DB packages + enterprise card
  const allCards = [
    ...packages.map(pkg => ({
      type: 'package' as const,
      slug: pkg.slug,
      name: pkg.name,
      price: pkg.price_monthly,
      priceYearly: pkg.price_yearly,
      features: getFeatures(pkg),
      highlighted: pkg.highlighted === 1 || pkg.slug === 'pro',
      icon: getIcon(pkg.slug),
      color: getColor(pkg.slug),
      border: getBorder(pkg.slug),
    })),
    {
      type: 'enterprise' as const,
      slug: kurumsalCard.slug,
      name: kurumsalCard.name,
      price: -1,
      priceYearly: -1,
      features: kurumsalCard.features,
      highlighted: false,
      icon: kurumsalCard.icon,
      color: kurumsalCard.color,
      border: kurumsalCard.border,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <a href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">W</div>
          <span className="font-semibold">Worker CMS</span>
        </a>
        <a href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {tr ? 'Zaten hesabın var mı? Giriş yap' : 'Already have an account? Sign in'}
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {step === 'plan' ? (
          /* Plan Selection */
          <div className="w-full max-w-5xl animate-fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {tr ? 'Planını Seç' : 'Choose Your Plan'}
              </h1>
              <p className="text-muted-foreground">
                {tr ? 'İhtiyacına uygun planla başla. İstediğin zaman yükselt.' : 'Start with the plan that fits. Upgrade anytime.'}
              </p>
            </div>

            {loadingPkgs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6" style={{ maxWidth: 1200, margin: '0 auto' }}>
                {allCards.map((card, i) => {
                  const Icon = card.icon;
                  const isSelected = selectedPlan === card.slug;
                  const isEnterprise = card.type === 'enterprise';

                  return (
                    <div
                      key={card.slug}
                      className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                        isSelected
                          ? `${card.border} shadow-lg`
                          : 'border-border hover:border-muted-foreground/30'
                      } ${card.highlighted ? 'ring-2 ring-blue-500/20' : ''}`}
                      style={{
                        flex: '0 1 calc(33.333% - 18px)',
                        minWidth: 260,
                        animationDelay: `${i * 100}ms`,
                      }}
                      onClick={() => handleSelectPlan(card.slug)}
                    >
                      {card.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          {tr ? 'Popüler' : 'Popular'}
                        </div>
                      )}

                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      <h3 className="text-xl font-bold text-foreground mb-1">{card.name}</h3>

                      <div className="flex items-baseline gap-0.5 mb-4">
                        {isEnterprise ? (
                          <span className="text-2xl font-bold text-foreground">{tr ? 'Bize Ulaşın' : 'Contact Us'}</span>
                        ) : (
                          <>
                            {card.price === 0 ? (
                              <span className="text-4xl font-bold text-foreground">{tr ? 'Ücretsiz' : 'Free'}</span>
                            ) : (
                              <>
                                <span className="text-lg text-muted-foreground">₺</span>
                                <span className="text-4xl font-bold text-foreground">{card.price}</span>
                                <span className="text-muted-foreground">/ay</span>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <ul className="space-y-2.5 mb-6">
                        {card.features.map((f, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {isEnterprise ? (
                        <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {tr ? 'İletişime Geç' : 'Contact Us'}
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${
                            card.highlighted
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                              : ''
                          }`}
                          variant={card.highlighted ? 'default' : 'outline'}
                        >
                          {tr ? 'Seç' : 'Select'}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Registration Form */
          <div className="w-full max-w-md animate-fade-in">
            <button
              onClick={() => setStep('plan')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {tr ? 'Plan seçimine dön' : 'Back to plans'}
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${
                  allCards.find(c => c.slug === selectedPlan)?.color || 'from-gray-600 to-gray-800'
                }`}>
                  {allCards.find(c => c.slug === selectedPlan)?.name || selectedPlan}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {tr ? 'Hesap Oluştur' : 'Create Account'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tr ? 'Bilgilerini gir ve hemen başla.' : 'Enter your details and get started.'}
              </p>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
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
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {tr ? 'GitHub ile Kayıt Ol' : 'Sign up with GitHub'}
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">
                  {tr ? 'veya e-posta ile' : 'or with email'}
                </span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="display_name">{tr ? 'Ad Soyad' : 'Full Name'}</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={tr ? 'Adınız Soyadınız' : 'Your full name'}
                  required
                  autoFocus
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg_email">{tr ? 'E-posta' : 'Email'}</Label>
                <Input
                  id="reg_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg_password">{tr ? 'Şifre' : 'Password'}</Label>
                <Input
                  id="reg_password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tr ? 'En az 8 karakter' : 'At least 8 characters'}
                  required
                  minLength={8}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-blue-500/20"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tr ? 'Oluşturuluyor...' : 'Creating...'}
                  </span>
                ) : (
                  tr ? 'Hesap Oluştur' : 'Create Account'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                {tr
                  ? 'Kayıt olarak kullanım koşullarını ve gizlilik politikasını kabul etmiş olursunuz.'
                  : 'By signing up, you agree to our terms of service and privacy policy.'}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
