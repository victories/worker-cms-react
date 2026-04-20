import { MobileDrawer } from '../islands/MobileDrawer';
import type { SlotProps } from './types';

/**
 * Mobile-only navigation drawer trigger. The drawer itself is hidden
 * on md+ viewports via the `md:hidden` class. Wraps the same
 * MobileDrawer island the legacy UserActionsSlot used to render.
 */
export function MobileMenuSlot({ ctx }: SlotProps) {
  return (
    <>
      <span data-island="mobile-drawer" className="contents md:hidden">
        <MobileDrawer items={ctx.navItems} />
      </span>
      <script
        type="application/json"
        data-island-data="mobile-drawer"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ctx.navItems) }}
      />
    </>
  );
}
