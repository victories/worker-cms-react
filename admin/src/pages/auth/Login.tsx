import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { t } from '@/lib/i18n';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { FileText, Shield, Zap, Globe, ArrowLeft } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, lang } = useAuthStore();
  const navigate = useNavigate();
  const totpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (requires2fa && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [requires2fa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password, requires2fa ? totpCode : undefined);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else if (result.requires_2fa) {
      setRequires2fa(true);
      setTotpCode('');
    } else {
      setError(result.error || t('common.error', lang));
    }
  };

  const handleBack = () => {
    setRequires2fa(false);
    setTotpCode('');
    setError('');
  };

  const features = [
    { icon: FileText, text: lang === 'tr' ? 'Gelismis icerik yonetimi' : 'Advanced content management' },
    { icon: Shield, text: lang === 'tr' ? 'Guvenli ve hizli altyapi' : 'Secure & fast infrastructure' },
    { icon: Zap, text: lang === 'tr' ? 'Cloudflare Workers uzerinde' : 'Powered by Cloudflare Workers' },
    { icon: Globe, text: lang === 'tr' ? 'Cok dilli destek' : 'Multi-language support' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 animate-gradient">
        {/* Animated floating shapes */}
        <div
          className="absolute rounded-full bg-white/10 animate-float"
          style={{ width: 260, height: 260, top: '10%', left: '10%', animationDelay: '0s' }}
        />
        <div
          className="absolute rounded-lg bg-white/[0.07] animate-float"
          style={{ width: 180, height: 180, top: '55%', left: '60%', animationDelay: '1s', borderRadius: '1.5rem' }}
        />
        <div
          className="absolute rounded-full bg-white/[0.12] animate-float"
          style={{ width: 120, height: 120, top: '70%', left: '15%', animationDelay: '0.5s' }}
        />
        <div
          className="absolute bg-white/[0.08] animate-float"
          style={{ width: 200, height: 200, top: '5%', right: '10%', animationDelay: '1.5s', borderRadius: '2rem' }}
        />
        <div
          className="absolute rounded-full bg-white/[0.06] animate-float"
          style={{ width: 100, height: 100, bottom: '10%', right: '25%', animationDelay: '2s' }}
        />
        <div
          className="absolute bg-white/[0.09] animate-float"
          style={{ width: 140, height: 140, top: '35%', left: '40%', animationDelay: '0.8s', borderRadius: '1rem' }}
        />

        {/* Branding content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <div className="animate-fade-in-up mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm text-white text-3xl font-bold shadow-lg mb-6">
              W
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white/95 leading-tight">
              WorkerCms
            </h1>
            <p className="text-lg text-white/70 mt-3 max-w-md">
              {lang === 'tr'
                ? 'Modern icerik yonetim sistemi, bulut tabanli altyapi ile.'
                : 'Modern content management system, powered by cloud infrastructure.'}
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-white/80 animate-fade-in-up"
                style={{ opacity: 0, animationDelay: `${300 + i * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm">
                  <feature.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary text-white text-2xl font-bold shadow-md mb-4">
              W
            </div>
            <h2 className="text-xl font-bold text-foreground">WorkerCms</h2>
          </div>

          {/* Form card */}
          <div className="animate-scale-in">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground animate-fade-in-down">
                {requires2fa
                  ? (lang === 'tr' ? 'Dogrulama Kodu' : 'Verification Code')
                  : t('auth.login_title', lang)}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-sm animate-fade-in-down delay-75" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                {requires2fa
                  ? (lang === 'tr' ? 'Authenticator uygulamanızdaki 6 haneli kodu girin' : 'Enter the 6-digit code from your authenticator app')
                  : t('auth.login_subtitle', lang)}
              </p>
            </div>

            {/* Social Login Buttons */}
            {!requires2fa && (
              <div className="space-y-3 mb-6 animate-fade-in-up" style={{ opacity: 0, animationDelay: '50ms', animationFillMode: 'forwards' }}>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/api/auth/google'; }}
                  className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {lang === 'tr' ? 'Google ile Giriş' : 'Sign in with Google'}
                </button>

                <button
                  type="button"
                  onClick={() => { window.location.href = '/api/auth/github'; }}
                  className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {lang === 'tr' ? 'GitHub ile Giriş' : 'Sign in with GitHub'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 text-muted-foreground">
                      {lang === 'tr' ? 'veya e-posta ile' : 'or with email'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message with slide-in animation */}
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 animate-fade-in-down">
                  {error}
                </div>
              )}

              {!requires2fa ? (
                <>
                  {/* Email field */}
                  <div
                    className="space-y-2 animate-fade-in-up"
                    style={{ opacity: 0, animationDelay: '100ms', animationFillMode: 'forwards' }}
                  >
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t('auth.email', lang)}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="h-11 transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                    />
                  </div>

                  {/* Password field */}
                  <div
                    className="space-y-2 animate-fade-in-up"
                    style={{ opacity: 0, animationDelay: '200ms', animationFillMode: 'forwards' }}
                  >
                    <Label htmlFor="password" className="text-sm font-medium">
                      {t('auth.password', lang)}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {lang === 'tr' ? 'Geri don' : 'Go back'}
                  </button>

                  {/* 2FA Shield icon */}
                  <div className="flex justify-center py-2">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary">
                      <Shield className="w-8 h-8" />
                    </div>
                  </div>

                  {/* TOTP Code field */}
                  <div className="space-y-2 animate-fade-in-up">
                    <Label htmlFor="totp_code" className="text-sm font-medium">
                      {lang === 'tr' ? '6 Haneli Kod' : '6-Digit Code'}
                    </Label>
                    <Input
                      ref={totpInputRef}
                      id="totp_code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="h-12 text-center text-2xl font-mono tracking-[0.5em] transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                    />
                  </div>
                </>
              )}

              {/* Submit button */}
              <div
                className="animate-fade-in-up pt-1"
                style={{ opacity: 0, animationDelay: requires2fa ? '0ms' : '300ms', animationFillMode: 'forwards' }}
              >
                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]"
                  disabled={loading || (requires2fa && totpCode.length !== 6)}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('common.loading', lang)}
                    </span>
                  ) : requires2fa ? (
                    lang === 'tr' ? 'Dogrula' : 'Verify'
                  ) : (
                    t('auth.login', lang)
                  )}
                </Button>
              </div>
            </form>

            {!requires2fa && (
              <div className="text-center mt-6 space-y-2 animate-fade-in-up" style={{ opacity: 0, animationDelay: '400ms', animationFillMode: 'forwards' }}>
                <div>
                  <a href="/admin/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                    {lang === 'tr' ? 'Şifremi unuttum' : 'Forgot password?'}
                  </a>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    {lang === 'tr' ? 'Hesabın yok mu? ' : "Don't have an account? "}
                  </span>
                  <a href="/admin/register" className="text-sm font-medium text-primary hover:underline">
                    {lang === 'tr' ? 'Kayıt ol' : 'Sign up'}
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
