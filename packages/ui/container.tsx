import * as React from 'react';
import { cn } from './lib/utils';

/**
 * Container — the one and only max-width wrapper used by public layouts.
 *
 * Why a dedicated primitive?
 * - Every section (nav, hero, footer, post body) needs the same horizontal
 *   gutter + max-width, and we want that padding to be edited in one place.
 * - Accepts a `size` prop so a hero/nav (wide) and a post body (narrow)
 *   can use the same component without hard-coding arbitrary max-w-* values
 *   in every call site.
 *
 * Sizes roughly match Tailwind's semantic scale:
 *   sm   → 640px   (narrow post, focused reading)
 *   md   → 768px   (default article column)
 *   lg   → 1024px  (sidebar + content)
 *   xl   → 1280px  (site chrome: nav, footer)
 *   full → 100%    (no cap, used when the section already caps itself)
 */
const SIZE_CLASSES = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-none',
} as const;

export type ContainerSize = keyof typeof SIZE_CLASSES;

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  /**
   * Render as a different element (e.g. `as="main"` or `as="section"`)
   * for semantic correctness. Defaults to `<div>`.
   */
  as?: 'div' | 'section' | 'main' | 'article' | 'header' | 'footer' | 'nav';
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', as: Tag = 'div', ...props }, ref) => {
    return React.createElement(Tag, {
      ref,
      className: cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        SIZE_CLASSES[size],
        className
      ),
      ...props,
    });
  }
);
Container.displayName = 'Container';
