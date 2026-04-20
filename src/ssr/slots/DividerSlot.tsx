import type { SlotProps } from './types';

/**
 * Visual separator. `props.orientation` defaults to horizontal (full
 * width hr). Vertical mode renders a 1px tall column inside the
 * surrounding flex row — useful between header tools.
 */
export function DividerSlot({ props }: SlotProps) {
  const orientation = (props?.orientation as string) === 'vertical' ? 'vertical' : 'horizontal';
  if (orientation === 'vertical') {
    return <div className="mx-2 h-6 w-px self-center bg-border" aria-hidden="true" />;
  }
  return <hr className="my-2 border-border" />;
}
