import { cn } from '@ui/lib/utils';
import type { SlotProps } from './types';

const VARIANT_CLASS: Record<string, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
};

const SIZE_CLASS: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
};

/**
 * Configurable CTA button. Designed for header right-rail slots, hero
 * regions, footer columns. Renders as a styled `<a>` so it works
 * without JS and respects normal link semantics.
 */
export function ButtonSlot({ props }: SlotProps) {
  const text = (props?.text as string) || '';
  if (!text) return null;
  const href = (props?.href as string) || '#';
  const target = (props?.target as string) === '_blank' ? '_blank' : undefined;
  const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
  const variant = VARIANT_CLASS[(props?.variant as string) || 'primary'] ?? VARIANT_CLASS.primary;
  const size = SIZE_CLASS[(props?.size as string) || 'md'] ?? SIZE_CLASS.md;
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant,
        size
      )}
    >
      {text}
    </a>
  );
}
