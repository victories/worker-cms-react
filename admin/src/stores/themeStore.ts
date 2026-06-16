import { create } from 'zustand';

// The admin is dark-only (ink/amber, matching the landing & auth pages),
// so there is no light variant to resolve. The store keeps its previous
// shape so existing consumers don't break, but every value is pinned to
// 'dark' and `.dark` is always applied to <html> — components that branch
// on `document.documentElement.classList.contains('dark')` (e.g. the
// editors) and native form controls all stay dark.
type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  initialize: () => void;
}

function applyDark() {
  const root = document.documentElement;
  root.classList.remove('light');
  root.classList.add('dark');
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: () => {
    applyDark();
    localStorage.setItem('theme', 'dark');
    set({ theme: 'dark', resolvedTheme: 'dark' });
  },

  initialize: () => {
    applyDark();
    set({ theme: 'dark', resolvedTheme: 'dark' });
  },
}));
