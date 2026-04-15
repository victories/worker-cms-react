import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Button } from '@ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PER_PAGE_OPTIONS = [10, 20, 50, 100, 250];
const STORAGE_KEY = 'cms_per_page';

export function getPerPage(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored);
      if (PER_PAGE_OPTIONS.includes(n)) return n;
    }
  } catch {}
  return 20;
}

export function setPerPage(value: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {}
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  lang?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  lang = 'tr',
}: PaginationProps) {
  const handlePerPageChange = (value: string) => {
    const n = parseInt(value);
    setPerPage(n);
    onPerPageChange(n);
  };

  const from = Math.min((page - 1) * perPage + 1, total);
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
      {/* Info + per-page selector */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {total > 0
            ? (lang === 'tr'
              ? `${total} sonuçtan ${from}-${to} arası`
              : `${from}-${to} of ${total} results`)
            : (lang === 'tr' ? 'Sonuç yok' : 'No results')}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs whitespace-nowrap">
            {lang === 'tr' ? 'Sayfa başına:' : 'Per page:'}
          </span>
          <Select value={String(perPage)} onValueChange={handlePerPageChange}>
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
            title={lang === 'tr' ? 'İlk sayfa' : 'First page'}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            title={lang === 'tr' ? 'Önceki' : 'Previous'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="flex items-center px-3 text-sm text-muted-foreground whitespace-nowrap">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            title={lang === 'tr' ? 'Sonraki' : 'Next'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title={lang === 'tr' ? 'Son sayfa' : 'Last page'}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
