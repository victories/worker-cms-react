import type { SlotProps } from './types';

/**
 * Page-content sentinel slot. Renders whatever React tree the route
 * handler passed as `children` to PublisherLayout — i.e. the actual
 * post / archive / page body. Treated as a singleton at the editor
 * level: only one main-content slot may exist across the layout.
 */
export function MainContentSlot({ ctx }: SlotProps) {
  return <>{ctx.children}</>;
}
