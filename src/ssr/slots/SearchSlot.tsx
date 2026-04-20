import { SearchOverlay } from '../islands/SearchOverlay';
import type { SlotProps } from './types';

/**
 * Search island slot. Wires the existing SearchOverlay island and emits
 * its data envelope so client hydration finds the same JSON it always
 * has. `props.placeholder` overrides the locale default.
 */
export function SearchSlot({ ctx, props }: SlotProps) {
  const placeholder = (props?.placeholder as string) || ctx.searchPlaceholder;
  const action = ctx.searchAction;
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
