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
    // Tokens are passed via query string in the hash: /oauth-callback?access_token=...&refresh_token=...
    const params = new URLSearchParams(location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('OAuth giriş başarısız oldu. Token bulunamadı.');
      return;
    }

    // Set tokens
    api.setToken(accessToken);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Decode user info from JWT (basic decode, no verification needed on client)
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
      // If decode fails, still proceed — auth middleware will validate
    }

    // Initialize auth store from localStorage
    useAuthStore.getState().initialize();

    // Navigate to dashboard
    navigate('/', { replace: true });
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-destructive text-lg font-semibold">Hata</div>
          <p className="text-muted-foreground text-sm">{error}</p>
          <a
            href="/admin/login"
            className="inline-block text-sm text-primary hover:underline"
          >
            Giriş sayfasına dön
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Giriş yapılıyor...</span>
      </div>
    </div>
  );
}
