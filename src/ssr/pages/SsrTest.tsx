/**
 * Faz 0 smoke-test page.
 *
 * Renders a minimal shadcn-styled hero to prove three things end-to-end:
 *
 *   1. React 19 SSR via `react-dom/server.edge` works on Cloudflare Workers.
 *   2. The Tailwind bundle is compiled and inlined by build-public-css.mjs.
 *   3. Shadcn design tokens (`bg-background`, `text-primary`, etc.) resolve
 *      through the HSL CSS variables defined in packages/ui/tokens.
 *
 * This file is temporary — Faz 2 replaces it with the real Shell + layout
 * integration, and Faz 8 deletes the /ssr-test route entirely.
 */

export function SsrTest() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        Faz 0 — React SSR baseline
      </div>

      <h1 className="text-balance text-center text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
        Hello from <span className="text-primary">React 19 SSR</span>
      </h1>

      <p className="max-w-xl text-balance text-center text-lg text-muted-foreground">
        Bu sayfa <code className="rounded bg-muted px-1.5 py-0.5 text-sm">react-dom/server.edge</code> ile
        Cloudflare Workers üzerinde render edildi. Tailwind bundle'ı build-time'da derlenip
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">Shell</code> içine inline edildi.
        shadcn token'ları (primary, muted, border, radius) çalışıyor.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Primary button
        </button>
        <button className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Outline button
        </button>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 pt-8 sm:grid-cols-3">
        {[
          { title: 'Radius', value: '0.5rem', desc: '--radius token' },
          { title: 'Primary', value: 'hsl(221 83% 53%)', desc: '--primary token' },
          { title: 'Font', value: 'system-ui', desc: '--font-sans stack' },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm"
          >
            <div className="text-sm font-medium text-muted-foreground">{item.title}</div>
            <div className="mt-1 text-lg font-semibold">{item.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
