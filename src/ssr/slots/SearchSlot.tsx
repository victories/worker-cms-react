import { SearchOverlay } from '../islands/SearchOverlay';
import type { SlotProps } from './types';

/**
 * Search slot. Two presentations:
 *   - `variant: 'icon'` (default) — renders the SearchOverlay island, a
 *     small magnifier button that pops a centered prompt + ⌘K binding.
 *   - `variant: 'inline'` — server-rendered always-visible search input
 *     (no JS needed). Submits to the same /search?q= endpoint.
 *
 * `props.placeholder` overrides the locale default in both variants.
 */
export function SearchSlot({ ctx, props }: SlotProps) {
  const placeholder = (props?.placeholder as string) || ctx.searchPlaceholder;
  const action = ctx.searchAction;
  const variant = (props?.variant as string) === 'inline' ? 'inline' : 'icon';

  if (variant === 'inline') {
    return (
      <form
        method="get"
        action={action}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1 text-sm focus-within:ring-2 focus-within:ring-ring"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          name="q"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </form>
    );
  }

  return (
    <>
      <span data-island="search-overlay" className="contents">
        <SearchOverlay action={action} placeholder={placeholder} />
      </span>
      <script
        type="application/json"
        data-island-data="search-overlay"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ action, placeholder }) }}
      />
    </>
  );
}
