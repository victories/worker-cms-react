import type { ReactNode } from 'react';
import { TAILWIND_CSS } from './__generated__/tailwind';

/**
 * HTML document shell for every React-SSR rendered page.
 *
 * This replaces the `<!DOCTYPE html>...<body>` prefix that the old Hono
 * JSX layouts wrote by hand. Route handlers wrap their page inside:
 *
 *   <Shell title="..." lang="tr" description="..." themeClass="dark">
 *     <PublisherLayout>...</PublisherLayout>
 *   </Shell>
 *
 * The Tailwind CSS bundle is embedded at build time (see
 * scripts/build-public-css.mjs) and inlined into <head>. This avoids the
 * extra round-trip of a <link rel="stylesheet"> request. When the bundle
 * grows too big for inlining we'll move it to Worker Assets and switch
 * to an external <link>.
 *
 * The DOCTYPE itself is prepended by renderPage() in src/lib/ssr.ts —
 * React's server renderer does not emit it.
 */

export interface ShellProps {
  lang?: string;
  title?: string;
  description?: string;
  /** Applied to <html>, used for shadcn dark mode (className="dark") */
  themeClass?: string;
  /** Extra <head> nodes — favicon, canonical, jsonld, plugin head hooks, ... */
  head?: ReactNode;
  /** Nodes rendered immediately after <body> opens (analytics, no-js notice, ...) */
  bodyStart?: ReactNode;
  /** Nodes rendered right before </body> (hydration islands, plugin scripts, ...) */
  bodyEnd?: ReactNode;
  /**
   * URL of a client-side JS bundle to hydrate the page's islands.
   * When set, Shell emits `<script type="module" src="...">` right
   * before `</body>`. Leave undefined for pure SSR pages with no
   * interactive widgets (e.g. /landing at Faz 0).
   */
  clientBundle?: string;
  /**
   * Inline boot script that runs BEFORE first paint to avoid a flash
   * of the wrong theme. The canonical use is reading the persisted
   * color mode from localStorage and adding/removing `class="dark"`
   * on `<html>`. Passed as a raw string (no JSX), injected via
   * `dangerouslySetInnerHTML` immediately after the Tailwind bundle.
   */
  themeBootScript?: string;
  children: ReactNode;
}

/**
 * Default theme-boot script: reads `wp-color-mode` from localStorage,
 * falls back to `prefers-color-scheme`, and applies `class="dark"` on
 * `<html>` before paint. Exposed as a constant so pages that want the
 * default behaviour can pass `themeBootScript={DEFAULT_THEME_BOOT}`
 * without reinventing it.
 */
export const DEFAULT_THEME_BOOT = `(function(){try{var s=localStorage.getItem('wp-color-mode');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export function Shell({
  lang = 'tr',
  title,
  description,
  themeClass,
  head,
  bodyStart,
  bodyEnd,
  clientBundle,
  themeBootScript,
  children,
}: ShellProps) {
  return (
    <html lang={lang} className={themeClass} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {title ? <title>{title}</title> : null}
        {description ? <meta name="description" content={description} /> : null}

        {/* Inline Tailwind CSS bundle — generated at build time */}
        <style dangerouslySetInnerHTML={{ __html: TAILWIND_CSS }} />

        {/* Theme boot: apply `class="dark"` on <html> before first paint */}
        {themeBootScript ? (
          <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        ) : null}

        {head}
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {bodyStart}
        {children}
        {bodyEnd}
        {clientBundle ? <script type="module" src={clientBundle} /> : null}
      </body>
    </html>
  );
}
