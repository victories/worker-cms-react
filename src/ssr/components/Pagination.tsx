import { cn } from '@ui/lib/utils';

/**
 * Pagination — prev/next + page numbers with ellipses for archives and
 * search pages. React port of `src/components/Pagination.tsx`.
 *
 * Layout rules:
 * - Always render 1 and `totalPages`
 * - Render current ± 2 neighbours
 * - Collapse the rest with `…`
 *
 * `baseUrl` is the stub href to which `?page=N` or `&page=N` is
 * appended based on whether the URL already has a query string.
 */

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  lang: string;
  className?: string;
}

function buildPageList(current: number, total: number): (number | '...')[] {
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return pages;
}

const buttonBase =
  'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  lang,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);
  const separator = baseUrl.includes('?') ? '&' : '?';
  const hrefFor = (p: number) => `${baseUrl}${separator}page=${p}`;

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-center gap-2', className)}
      aria-label={lang === 'tr' ? 'Sayfalama' : 'Pagination'}
    >
      {currentPage > 1 ? (
        <a
          href={hrefFor(currentPage - 1)}
          className={buttonBase}
          aria-label={lang === 'tr' ? 'Önceki' : 'Previous'}
        >
          ← {lang === 'tr' ? 'Önceki' : 'Prev'}
        </a>
      ) : null}

      {pages.map((p, idx) =>
        p === '...' ? (
          <span
            key={`dots-${idx}`}
            className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            className={cn(
              buttonBase,
              'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            )}
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <a key={p} href={hrefFor(p)} className={buttonBase}>
            {p}
          </a>
        )
      )}

      {currentPage < totalPages ? (
        <a
          href={hrefFor(currentPage + 1)}
          className={buttonBase}
          aria-label={lang === 'tr' ? 'Sonraki' : 'Next'}
        >
          {lang === 'tr' ? 'Sonraki' : 'Next'} →
        </a>
      ) : null}
    </nav>
  );
}
