import { ThemeToggle } from '../islands/ThemeToggle';
import type { SlotProps } from './types';

/**
 * Standalone dark/light mode toggle slot. Renders the same island the
 * UserActionsSlot already wires up, but as its own placeable element
 * so designs can put the toggle anywhere (footer, sidebar, ...) — not
 * just lumped together with the mobile drawer trigger.
 */
export function ThemeToggleSlot({ ctx }: SlotProps) {
  if (!ctx.supportsDarkMode) return null;
  return (
    <span data-island="theme-toggle" className="contents">
      <ThemeToggle />
    </span>
  );
}
