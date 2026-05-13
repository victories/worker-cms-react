import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

/**
 * ForgotPassword — landing v2 themed (see Login.tsx for design rationale).
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as any;
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || 'Bir hata oluştu');
      }
    } catch {
      setError('Bağlantı hatası');
    }
    setLoading(false);
  };

  return (
    <div className="auth-v2 min-h-screen flex items-center justify-center p-6">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 mb-6 text-[#FAFAF7] hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#F5A524] to-[#E89414] flex items-center justify-center text-[#0A0A0B] font-bold text-base shadow-lg shadow-amber-500/20">
            W
          </div>
          <span className="font-semibold text-lg">WorkerCMS</span>
        </Link>

        <div className="rounded-2xl border border-[#1B1B20] bg-[#0F0F11]/90 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 text-green-400 mb-5">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h1 className="font-serif text-2xl text-[#FAFAF7] mb-2">E-posta Gönderildi</h1>
              <p className="text-sm text-[#8A8A93] mb-7 leading-relaxed">
                Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi. Lütfen gelen kutunu kontrol et.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 h-11 rounded-lg border border-[#26262C] bg-[#0A0A0B] hover:bg-[#141418] hover:border-[#3A3A42] transition-colors text-sm font-medium text-[#E2E2E5]"
              >
                <ArrowLeft className="h-4 w-4" />
                Giriş Sayfasına Dön
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-7">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5A524]/10 text-[#F5A524] mb-4">
                  <Mail className="h-7 w-7" />
                </div>
                <h1 className="font-serif text-3xl text-[#FAFAF7] mb-1.5">Şifremi Unuttum</h1>
                <p className="text-sm text-[#8A8A93]">
                  E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-300 bg-red-500/10 rounded-lg border border-red-500/30">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="forgot_email" className="text-xs font-medium uppercase tracking-wider font-mono">
                    E-posta
                  </label>
                  <input
                    id="forgot_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    required
                    autoFocus
                    className="w-full h-11 rounded-lg border px-3 text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-lg font-medium text-[#0A0A0B] bg-gradient-to-br from-[#F5A524] to-[#E89414] hover:from-[#FFB638] hover:to-[#F5A524] shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !email}
                >
                  {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-sm text-[#8A8A93] hover:text-[#F5A524] transition-colors inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Giriş sayfasına dön
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#5C5C66] mt-6 font-mono">
          © WorkerCMS — Bulut yerel CMS
        </p>
      </div>
    </div>
  );
}
