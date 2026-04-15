import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * SearchOverlay — client island that opens a centered search prompt
 * when the user clicks the header magnifier button or hits ⌘K / Ctrl+K.
 *
 * The overlay is intentionally dumb: it submits the query as a GET
 * request to `/search?q=...` (or the locale prefix variant). All
 * result rendering happens server-side on the search page. Faz 4
 * will port that page to React SSR; for now Search just hands off
 * to whatever handler is mounted.
 *
 * We take `action` as a prop so the locale prefix (`lp`) can be
 * threaded from the layout rather than read at runtime.
 */

export interface SearchOverlayProps {
  /** Form action URL, e.g. '/search' or '/en/search' */
  action: string;
  /** Placeholder text — localised by caller */
  placeholder?: string;
}

export function SearchOverlay({ action, placeholder = 'Search…' }: SearchOverlayProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openOverlay = useCallback(() => setOpen(true), []);
  const closeOverlay = useCallback(() => setOpen(false), []);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Autofocus when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={openOverlay}
        aria-label="Search"
        className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close search"
            onClick={closeOverlay}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div className="absolute left-1/2 top-[15vh] w-full max-w-xl -translate-x-1/2 px-4">
            <form
              method="get"
              action={action}
              className="flex items-center gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1 size-5 text-muted-foreground"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                name="q"
                placeholder={placeholder}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                autoComplete="off"
              />
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                Esc
              </kbd>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
