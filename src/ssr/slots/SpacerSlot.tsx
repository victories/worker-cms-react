import type { SlotProps } from './types';

/**
 * Flexible spacer — eats remaining space in its container so neighbouring
 * slots can be pushed apart inside the same column. Optional `size`
 * prop ('xs' | 'sm' | 'md' | 'lg' | 'xl') forces a fixed gap instead.
 */
const FIXED: Record<string, string> = {
  xs: 'h-2',
  sm: 'h-4',
  md: 'h-6',
  lg: 'h-10',
  xl: 'h-16',
};

export function SpacerSlot({ props }: SlotProps) {
  const size = props?.size as string | undefined;
  if (size && FIXED[size]) {
    return <div className={FIXED[size]} aria-hidden="true" />;
  }
  return <div className="flex-1" aria-hidden="true" />;
}
