import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    // Tokens arrive in the hash fragment (never sent to the server); the
    // query-string form is kept as a fallback for older in-flight redirects.
    const params = new URLSearchParams(location.hash.replace(/^#/, '') || location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('OAuth giriş başarısız oldu. Token bulunamadı.');
      return;
    }

    api.setToken(accessToken);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const user = {
        id: payload.sub,
        email: payload.email,
        display_name: payload.display_name,
        role: payload.role,
      };
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      /* auth middleware will validate */
    }

    useAuthStore.getState().initialize();
    navigate('/', { replace: true });
  }, [location, navigate]);

  if (error) {
    return (
      <div className="auth-v2 min-h-screen flex items-center justify-center p-6">
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />
        <div className="relative text-center space-y-4 max-w-sm">
          <div className="font-serif text-2xl text-red-300">Hata</div>
          <p className="text-[#8A8A93] text-sm">{error}</p>
          <a
            href="/admin/login"
            className="inline-block text-sm text-[#F5A524] hover:text-[#FFB638] transition-colors"
          >
            Giriş sayfasına dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-v2 min-h-screen flex items-center justify-center p-6">
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute inset-0 grid-dots opacity-60 pointer-events-none" />
      <div className="relative flex items-center gap-3 text-[#8A8A93]">
        <Loader2 className="w-5 h-5 animate-spin text-[#F5A524]" />
        <span>Giriş yapılıyor...</span>
      </div>
    </div>
  );
}
