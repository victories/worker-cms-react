import { Container } from '@ui/container';
import { Button } from '@ui/button';
import type { LandingConfig } from '../Landing';

interface NavProps {
  brandName: string;
  labels?: LandingConfig['labels'];
}

export function Nav({ brandName, labels }: NavProps) {
  const nav = labels?.nav ?? {};
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="xl" className="flex h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-heading font-semibold tracking-tight text-foreground">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {brandName.charAt(0).toUpperCase() || 'W'}
          </span>
          <span className="text-lg">{brandName}</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          <a href="#features" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.features ?? 'Özellikler'}
          </a>
          <a href="#pricing" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.pricing ?? 'Fiyatlar'}
          </a>
          <a href="#faq" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.faq ?? 'SSS'}
          </a>
          <a href="/admin/login" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.login ?? 'Giriş'}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <span data-island="theme-toggle" className="contents">
            {/* Same SSR placeholder as legacy — preserves no-flash hydration */}
            <button
              type="button"
              aria-label="Toggle theme"
              className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 dark:hidden" aria-hidden="true">
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden size-4 dark:inline" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
          </span>
          <Button asChild size="sm">
            <a href="/admin/register">{nav.cta ?? 'Sitemi Taşı'}</a>
          </Button>
        </div>
      </Container>
    </header>
  );
}
