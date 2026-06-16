import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Wordmark } from '@/components/Wordmark';
import { t } from '@/lib/i18n';
import { Shield, ArrowLeft } from 'lucide-react';

/**
 * Login — landing v2 themed.
 *
 * The auth journey is scoped to the `.auth-v2` wrapper (CSS in
 * admin/src/index.css) so the page reads as a continuation of the
 * marketing site: ink-0 base, amber accent, Instrument Serif for
 * display, glassmorphism card. No admin chrome.
 */

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
  const tr = lang === 'tr';

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

  return (
    <div className="auth-v2 min-h-screen flex items-center justify-center p-6">
      {/* Background layers */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <a
          href="/"
          className="flex items-center justify-center gap-2 mb-6 text-[#FAFAF7] hover:opacity-90 transition-opacity"
        >
          <Wordmark size={36} />
          <span className="font-semibold text-lg">Worker CMS</span>
        </a>

        {/* Card */}
        <div className="rounded-2xl border border-[#1B1B20] bg-[#0F0F11]/90 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
          <div className="text-center mb-7">
            <h1 className="font-serif text-3xl text-[#FAFAF7] mb-1.5">
              {requires2fa
                ? (tr ? 'Doğrulama Kodu' : 'Verification Code')
                : t('auth.login_title', lang)}
            </h1>
            <p className="text-sm text-[#8A8A93]">
              {requires2fa
                ? (tr ? 'Authenticator uygulamandaki 6 haneli kodu gir' : 'Enter the 6-digit code from your authenticator app')
                : t('auth.login_subtitle', lang)}
            </p>
          </div>

          {/* Social Login */}
          {!requires2fa && (
            <div className="space-y-2.5 mb-5">
              <button
                type="button"
                onClick={() => { window.location.href = '/api/auth/google'; }}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {tr ? 'Google ile Giriş' : 'Sign in with Google'}
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = '/api/auth/github'; }}
                className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#FAFAF7">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {tr ? 'GitHub ile Giriş' : 'Sign in with GitHub'}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1B1B20]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0F0F11] px-3 text-[#5C5C66] font-mono uppercase tracking-wider">
                    {tr ? 'veya e-posta ile' : 'or with email'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-500/10 rounded-lg border border-red-500/30">
                {error}
              </div>
            )}

            {!requires2fa ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider font-mono">
                    {t('auth.email', lang)}
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full h-11 rounded-lg border px-3 text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider font-mono">
                    {t('auth.password', lang)}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 rounded-lg border px-3 text-sm transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-[#8A8A93] hover:text-[#FAFAF7] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {tr ? 'Geri dön' : 'Go back'}
                </button>

                <div className="flex justify-center py-2">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5A524]/10 text-[#F5A524] pulse-ring">
                    <Shield className="w-8 h-8" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="totp_code" className="text-xs font-medium uppercase tracking-wider font-mono">
                    {tr ? '6 Haneli Kod' : '6-Digit Code'}
                  </label>
                  <input
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
                    className="w-full h-14 rounded-lg border px-3 text-center text-2xl font-mono tracking-[0.5em]"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-lg font-medium text-[#0A0A0B] bg-gradient-to-br from-[#F5A524] to-[#E89414] hover:from-[#FFB638] hover:to-[#F5A524] shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || (requires2fa && totpCode.length !== 6)}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common.loading', lang)}
                </span>
              ) : requires2fa ? (
                tr ? 'Doğrula' : 'Verify'
              ) : (
                t('auth.login', lang)
              )}
            </button>
          </form>

          {!requires2fa && (
            <div className="text-center mt-6 space-y-2">
              <div>
                <a href="/admin/forgot-password" className="text-sm text-[#8A8A93] hover:text-[#F5A524] transition-colors">
                  {tr ? 'Şifremi unuttum' : 'Forgot password?'}
                </a>
              </div>
              <div>
                <span className="text-sm text-[#5C5C66]">
                  {tr ? 'Hesabın yok mu? ' : "Don't have an account? "}
                </span>
                <a href="/admin/register" className="text-sm font-medium text-[#F5A524] hover:text-[#FFB638] transition-colors">
                  {tr ? 'Kayıt ol' : 'Sign up'}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#5C5C66] mt-6 font-mono">
          {tr ? '© WorkerCMS — Bulut yerel CMS' : '© WorkerCMS — Cloud-native CMS'}
        </p>
      </div>
    </div>
  );
}
