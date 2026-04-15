/** @jsxImportSource react */
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
  children: ReactNode;
}

export function Shell({
  lang = 'tr',
  title,
  description,
  themeClass,
  head,
  bodyStart,
  bodyEnd,
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

        {head}
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {bodyStart}
        {children}
        {bodyEnd}
      </body>
    </html>
  );
}
