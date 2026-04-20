import { ThemeToggle } from '../islands/ThemeToggle';
import { MobileDrawer } from '../islands/MobileDrawer';
import type { SlotProps } from './types';

/**
 * "User actions" slot — the right cluster of header tools that doesn't
 * fit any other slot: theme toggle (when supported) + mobile drawer
 * trigger + plugin headerRight content. Acts as the catch-all for
 * islands that used to live next to the search input.
 */
export function UserActionsSlot({ ctx }: SlotProps) {
  return (
    <div className="flex items-center gap-2">
      {ctx.headerRight}
      {ctx.supportsDarkMode ? (
        <span data-island="theme-toggle" className="contents">
          <ThemeToggle />
        </span>
      ) : null}
      <span data-island="mobile-drawer" className="contents md:hidden">
        <MobileDrawer items={ctx.navItems} />
      </span>
      <script
        type="application/json"
        data-island-data="mobile-drawer"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ctx.navItems) }}
      />
    </div>
  );
}
