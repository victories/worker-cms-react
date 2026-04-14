import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  initialize: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'light',

  setTheme: (theme) => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved);
    localStorage.setItem('theme', theme);
    set({ theme, resolvedTheme: resolved });
  },

  initialize: () => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const theme = saved || 'system';
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });

    // Listen for system theme changes
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        if (get().theme === 'system') {
          const newResolved = e.matches ? 'dark' : 'light';
          applyTheme(newResolved);
          set({ resolvedTheme: newResolved });
        }
      };
      mq.addEventListener('change', handler);
    }
  },
}));
