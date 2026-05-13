import { useCallback, useEffect, useState } from 'react';

/**
 * ThemeToggle — client island that flips `class="dark"` on `<html>`
 * and persists the choice in `localStorage['wp-color-mode']`.
 *
 * The SSR tree renders a static `<button data-island="theme-toggle">`
 * in `Header.tsx`. On the client, `publisher-entry.tsx` finds every
 * such element and calls `hydrateRoot(el, <ThemeToggle/>)` — at that
 * point this component takes over, replaces the placeholder icons,
 * and handles clicks.
 *
 * The early boot script in `Shell.themeBootScript` (DEFAULT_THEME_BOOT)
 * runs BEFORE first paint and applies the persisted mode, so there is
 * no flash of the wrong theme while React hydrates.
 */

type Mode = 'light' | 'dark';

function readPersistedMode(): Mode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('wp-color-mode');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // storage disabled (private mode, iframes) — fall through
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function ThemeToggle() {
  // Read whatever the boot script already applied so the first client
  // render matches the actual DOM (avoiding a hydration mismatch).
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Sync once on mount in case the boot script hadn't run yet.
  useEffect(() => {
    const current = readPersistedMode();
    setMode(current);
    document.documentElement.classList.toggle('dark', current === 'dark');
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: Mode = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('wp-color-mode', next);
      } catch {
        // ignore — storage may be disabled
      }
      return next;
    });
  }, []);

  // Render BOTH icons every time and toggle their visibility with
  // `dark:hidden` / `dark:inline`. The SSR markup ships exactly this
  // shape too (see the placeholder in Landing.tsx → Nav), so hydrate
  // never sees a structural mismatch (React error #418).
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={mode === 'dark'}
      className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 dark:hidden"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden size-4 dark:inline"
        aria-hidden="true"
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
