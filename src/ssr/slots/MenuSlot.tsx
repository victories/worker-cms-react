import { NavMenu } from '@ui/nav-menu';
import type { SlotProps } from './types';

/**
 * Header navigation slot. Uses the navItems pre-fetched by the route
 * handler. The menu_id prop is reserved for Faz 6 multi-menu support
 * (currently the route hands a single resolved menu).
 */
export function MenuSlot({ ctx }: SlotProps) {
  return <NavMenu items={ctx.navItems} activePath={ctx.activePath} className="flex-1" />;
}
