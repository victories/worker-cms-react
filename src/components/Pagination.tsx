import type { FC } from 'hono/jsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  lang: string;
}

export const Pagination: FC<PaginationProps> = ({ currentPage, totalPages, baseUrl, lang }) => {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const separator = baseUrl.includes('?') ? '&' : '?';

  return (
    <nav class="pagination" aria-label={lang === 'tr' ? 'Sayfalama' : 'Pagination'}>
      {currentPage > 1 && (
        <a href={`${baseUrl}${separator}page=${currentPage - 1}`} class="prev" aria-label={lang === 'tr' ? 'Önceki' : 'Previous'}>
          &larr; {lang === 'tr' ? 'Önceki' : 'Prev'}
        </a>
      )}
      {pages.map((p) =>
        p === '...' ? (
          <span class="dots">&hellip;</span>
        ) : p === currentPage ? (
          <span class="current" aria-current="page">{p}</span>
        ) : (
          <a href={`${baseUrl}${separator}page=${p}`}>{p}</a>
        )
      )}
      {currentPage < totalPages && (
        <a href={`${baseUrl}${separator}page=${currentPage + 1}`} class="next" aria-label={lang === 'tr' ? 'Sonraki' : 'Next'}>
          {lang === 'tr' ? 'Sonraki' : 'Next'} &rarr;
        </a>
      )}
    </nav>
  );
};
