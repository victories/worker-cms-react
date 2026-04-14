import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as any;
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Bir hata oluştu');
      }
    } catch {
      setError('Bağlantı hatası');
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-xl font-bold mb-2">Geçersiz Bağlantı</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.
            </p>
            <Link to="/forgot-password">
              <Button variant="outline">Yeni Bağlantı İste</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold mb-2">Şifre Değiştirildi</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.
            </p>
            <Link to="/login">
              <Button className="gap-2">
                Giriş Yap
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
              <KeyRound className="h-7 w-7 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold">Yeni Şifre Belirle</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hesabınız için yeni bir şifre belirleyin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div>
              <Label>Şifre Tekrar</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !password || !confirmPassword}>
              {loading ? 'Değiştiriliyor...' : 'Şifremi Değiştir'}
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
