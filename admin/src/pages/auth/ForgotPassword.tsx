import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

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

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold mb-2">E-posta Gönderildi</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Eğer bu e-posta adresine kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.
              Lütfen gelen kutunuzu kontrol edin.
            </p>
            <Link to="/login">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Giriş Sayfasına Dön
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Mail className="h-7 w-7 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold">Şifremi Unuttum</h1>
            <p className="text-sm text-muted-foreground mt-1">
              E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <Label>E-posta</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email}>
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Giriş sayfasına dön
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
