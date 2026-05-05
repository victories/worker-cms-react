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

/**
 * Self-gating preview bridge for the Theme Studio. Always emitted into
 * `<body>` but a no-op unless the page was loaded with
 * `?design_preview=1`. When preview is on, it listens for `message`
 * events from the admin iframe parent and rewrites a single
 * `<style id="design-preview-vars">` tag with the proposed style
 * tokens (light + dark CSS var maps) and font families. Parent then
 * sees a `design-preview-ready` message back so it knows when to push
 * its initial state.
 */
export const DESIGN_PREVIEW_BRIDGE = `(function(){try{if(new URLSearchParams(location.search).get('design_preview')!=='1')return;var s=document.getElementById('design-preview-vars');if(!s){s=document.createElement('style');s.id='design-preview-vars';document.head.appendChild(s);}var fs=document.getElementById('design-preview-fonts');if(!fs){fs=document.createElement('style');fs.id='design-preview-fonts';document.head.appendChild(fs);}function obj2css(sel,o){if(!o)return '';var p=Object.entries(o).filter(function(e){return typeof e[1]==='string'&&e[1].length}).map(function(e){return e[0]+':'+e[1]}).join(';');return p?sel+'{'+p+'}':''}function apply(t){if(!t)return;s.textContent=obj2css(':root',t.light)+obj2css('.dark',t.dark);if(t.fonts){var f=t.fonts;var fc=':root{';if(f.sans)fc+='--font-sans:\\''+f.sans+'\\',ui-sans-serif,system-ui;';if(f.heading)fc+='--font-heading:\\''+f.heading+'\\',ui-sans-serif,system-ui;';if(f.mono)fc+='--font-mono:\\''+f.mono+'\\',ui-monospace,monospace;';fc+='}';fs.textContent=fc;}if(t.google_fonts&&t.google_fonts.length){var u='https://fonts.googleapis.com/css2?'+t.google_fonts.map(function(g){var p=g.split(':');var fam=p[0].replace(/ /g,'+');var w=p[1]?'wght@'+p[1]:'';return 'family='+fam+(w?':'+w:'');}).join('&')+'&display=swap';var lk=document.getElementById('design-preview-fonts-link');if(!lk){lk=document.createElement('link');lk.id='design-preview-fonts-link';lk.rel='stylesheet';document.head.appendChild(lk);}lk.href=u;}}window.addEventListener('message',function(e){if(!e.data||typeof e.data!=='object')return;if(e.data.type==='design-update'&&e.data.styleTokens)apply(e.data.styleTokens);if(e.data.type==='design-mode'){if(e.data.mode==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}});if(window.parent&&window.parent!==window){window.parent.postMessage({type:'design-preview-ready'},'*');}}catch(e){console.error('[design-preview]',e);}})();`;

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
        {/* No-js → js feature flag. Synchronously adds class="js" to
            <html> before <body> parses, so the `html.js .reveal`
            CSS rule (in public-styles/input.css) applies before any
            reveal elements render. Without JS this script never runs
            and the html.js selector never matches → all reveals stay
            visible. Standard Modernizr-style no-js pattern. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
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
        <script dangerouslySetInnerHTML={{ __html: DESIGN_PREVIEW_BRIDGE }} />
      </body>
    </html>
  );
}
