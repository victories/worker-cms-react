import { ThemeToggle } from '../islands/ThemeToggle';
import type { SlotProps } from './types';

/**
 * Standalone dark/light mode toggle slot. Renders the existing
 * ThemeToggle island wherever the user drops it (header, sidebar,
 * footer, ...). Visibility is intentional — if the user placed the
 * slot they want it shown, even if the legacy theme.supports_dark_mode
 * flag is false.
 */
export function ThemeToggleSlot(_: SlotProps) {
  return (
    <span data-island="theme-toggle" className="contents">
      <ThemeToggle />
    </span>
  );
}
