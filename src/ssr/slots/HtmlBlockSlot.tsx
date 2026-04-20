import type { SlotProps } from './types';

/**
 * Raw HTML block without the Card chrome the widget slots wrap around.
 * Useful for adding ad blocks, hero banners, or arbitrary markup
 * without the title + bordered container of widget:custom-html.
 */
export function HtmlBlockSlot({ props }: SlotProps) {
  const html = (props?.html as string) || '';
  if (!html) return null;
  return (
    <div
      className="text-foreground/80 [&_a]:text-primary [&_a:hover]:text-primary/80"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
