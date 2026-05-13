import type { ReactNode } from 'react';
import { Container } from '@ui/container';
import { Button } from '@ui/button';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';

interface NavProps {
  brandName: string;
  labels?: LandingConfig['labels'];
}

interface NavLinkProps {
  href: string;
  children: ReactNode;
}

/**
 * Single nav link. Uses an animated underline (Linear / Vercel-style)
 * instead of a background pill — same hover affordance, much more
 * premium. The underline grows from the left and the text shifts to
 * full foreground colour, both on the same 200ms ease-out curve.
 */
function NavLink({ href, children }: NavLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'group relative inline-flex items-center px-3 py-2',
        'text-sm font-medium text-foreground/65',
        'transition-colors duration-200',
        'hover:text-foreground',
        'focus-visible:outline-none focus-visible:text-foreground'
      )}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -bottom-1 left-0 h-px w-0 bg-foreground',
            'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'group-hover:w-full',
            'group-focus-visible:w-full'
          )}
        />
      </span>
    </a>
  );
}

export function Nav({ brandName, labels }: NavProps) {
  const nav = labels?.nav ?? {};
  const initial = brandName.charAt(0).toUpperCase() || 'W';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full',
        'border-b border-border/50',
        'bg-background/80 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-background/65'
      )}
    >
      <Container size="xl" className="flex h-16 items-center justify-between">
        {/* Brand mark: gradient monogram + glow on hover, wordmark in
            Space Grotesk via font-heading. */}
        <a
          href="/"
          className="group relative flex items-center gap-2.5 transition-opacity hover:opacity-95"
          aria-label={brandName}
        >
          <span
            className={cn(
              'relative flex size-9 items-center justify-center rounded-lg',
              'bg-gradient-to-br from-primary via-primary to-primary/85',
              'font-heading text-base font-bold text-primary-foreground',
              'shadow-sm ring-1 ring-primary/30',
              'transition-transform duration-200 group-hover:scale-[1.04]'
            )}
          >
            {initial}
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute -inset-1 rounded-xl bg-primary/30 blur-lg',
                'opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10'
              )}
            />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {brandName}
          </span>
        </a>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavLink href="#features">{nav.features ?? 'Özellikler'}</NavLink>
          <NavLink href="#pricing">{nav.pricing ?? 'Fiyatlar'}</NavLink>
          <NavLink href="#faq">{nav.faq ?? 'SSS'}</NavLink>
          <NavLink href="/admin/login">{nav.login ?? 'Giriş'}</NavLink>
        </nav>

        {/* Right cluster: theme toggle + CTA */}
        <div className="flex items-center gap-2">
          <span data-island="theme-toggle" className="contents">
            {/* Ghost theme toggle — borderless to match the underline-only nav.
                Hydrated client-side by landing-entry.tsx. */}
            <button
              type="button"
              aria-label="Toggle theme"
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-md',
                'text-muted-foreground transition-colors',
                'hover:bg-accent/60 hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
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
          </span>
          <Button asChild size="sm" className="group shadow-sm">
            <a href="/admin/register">
              {nav.cta ?? 'Sitemi Taşı'}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </Button>
        </div>
      </Container>
    </header>
  );
}
