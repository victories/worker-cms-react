import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  display_name: string;
  role: string;
  max_sites?: number;
  max_editors?: number;
  max_writers?: number;
  ai_enabled?: number;
  ai_use_global?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  originalUser: User | null;
  lang: string;
  login: (email: string, password: string, totpCode?: string) => Promise<{ success: boolean; error?: string; requires_2fa?: boolean }>;
  logout: () => void;
  setLang: (lang: string) => void;
  initialize: () => void;
  startImpersonation: (targetUserId: number) => Promise<{ success: boolean; error?: string }>;
  stopImpersonation: () => void;
}

// Synchronously restore auth state from localStorage at store creation time
// This prevents the race condition where useEffect-based initialization
// fires after the first render, causing a flash redirect to /login
function getInitialAuthState(): { user: User | null; isAuthenticated: boolean; isImpersonating: boolean; originalUser: User | null } {
  try {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    const originalUserStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      const user = JSON.parse(userStr) as User;
      api.setToken(token);
      const isImpersonating = !!originalUserStr;
      const originalUser = originalUserStr ? JSON.parse(originalUserStr) as User : null;
      return { user, isAuthenticated: true, isImpersonating, originalUser };
    }
  } catch {
    // ignore parse errors
  }
  return { user: null, isAuthenticated: false, isImpersonating: false, originalUser: null };
}

const initialAuth = getInitialAuthState();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,
  isImpersonating: initialAuth.isImpersonating,
  originalUser: initialAuth.originalUser,
  lang: localStorage.getItem('lang') || 'tr',

  login: async (email, password, totpCode?) => {
    try {
      const res = await api.login(email, password, totpCode) as any;
      if (res.success) {
        const { access_token, refresh_token, user } = res.data;
        api.setToken(access_token);
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, isAuthenticated: true });
        return { success: true };
      }
      if (res.requires_2fa) {
        return { success: false, requires_2fa: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  },

  logout: () => {
    api.setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    set({ user: null, isAuthenticated: false, isImpersonating: false, originalUser: null });
  },

  setLang: (lang) => {
    localStorage.setItem('lang', lang);
    set({ lang });
  },

  initialize: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    const originalUserStr = localStorage.getItem('admin_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        api.setToken(token);
        const isImpersonating = !!originalUserStr;
        const originalUser = originalUserStr ? JSON.parse(originalUserStr) : null;
        set({ user, isAuthenticated: true, isImpersonating, originalUser });
      } catch {
        // ignore
      }
    }
  },

  startImpersonation: async (targetUserId: number) => {
    try {
      const res = await api.request(`/auth/impersonate/${targetUserId}`, { method: 'POST' }) as any;
      if (res.success) {
        // Save current admin credentials
        const currentToken = localStorage.getItem('access_token');
        const currentRefresh = localStorage.getItem('refresh_token');
        const currentUser = localStorage.getItem('user');
        if (currentToken) localStorage.setItem('admin_access_token', currentToken);
        if (currentRefresh) localStorage.setItem('admin_refresh_token', currentRefresh);
        if (currentUser) localStorage.setItem('admin_user', currentUser);

        // Switch to target user
        const { access_token, refresh_token, user } = res.data;
        api.setToken(access_token);
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));

        const originalUser = currentUser ? JSON.parse(currentUser) : null;
        set({ user, isImpersonating: true, originalUser });
        return { success: true };
      }
      return { success: false, error: res.error || 'Impersonation failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impersonation failed' };
    }
  },

  stopImpersonation: () => {
    // Restore admin credentials
    const adminToken = localStorage.getItem('admin_access_token');
    const adminRefresh = localStorage.getItem('admin_refresh_token');
    const adminUserStr = localStorage.getItem('admin_user');

    if (adminToken && adminUserStr) {
      api.setToken(adminToken);
      localStorage.setItem('access_token', adminToken);
      if (adminRefresh) localStorage.setItem('refresh_token', adminRefresh);
      localStorage.setItem('user', adminUserStr);

      // Clean up admin backup
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');

      try {
        const user = JSON.parse(adminUserStr);
        set({ user, isImpersonating: false, originalUser: null });
      } catch {
        set({ isImpersonating: false, originalUser: null });
      }
    }
  },
}));
