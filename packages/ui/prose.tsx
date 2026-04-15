import * as React from 'react';
import { cn } from './lib/utils';

/**
 * Prose — typography wrapper for rich HTML content (post body, page body).
 *
 * Post content in the CMS is stored as HTML produced by the TipTap/Plate
 * rich-text editor. Inside the SSR React tree we render it with
 * `<Prose><div dangerouslySetInnerHTML={{__html: content}} /></Prose>` so
 * headings, paragraphs, lists, blockquotes, code blocks etc. pick up a
 * consistent reading-friendly style without every theme reinventing
 * typographic scale.
 *
 * Uses @tailwindcss/typography plugin classes (`prose`, `prose-*`) which
 * are configured in public-styles/tailwind.config.ts. The plugin gives
 * us:
 * - max-width tuned for reading (~65ch)
 * - sensible line-height, font-size steps, vertical rhythm
 * - color-aware via `prose-invert` for dark mode (we apply based on theme)
 *
 * We also wire Prose to shadcn tokens so the primary link color, muted
 * text, and border colors come from the active palette instead of
 * Tailwind's defaults.
 *
 * ## WordPress-style image layout classes
 *
 * The rich-text editor drops classes like `wp-cover`, `wp-full-width`,
 * `wp-float-left`, and `wp-float-right` on figures/images inside post
 * content. Those are styled in `public-styles/input.css` under a
 * `@layer components` block scoped to `.prose` — i.e. they only take
 * effect inside this wrapper, matching the admin preview behaviour.
 * If you need to tweak float widths, caption colors, or small-screen
 * fallbacks, edit that file (not this one) so admin and public stay
 * in sync and the rules survive the tailwind build.
 */
export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls the scale via Tailwind typography plugin modifiers.
   * - 'sm' tighter (mobile-first or sidebar)
   * - 'base' default (post body, most common)
   * - 'lg' bigger (featured long-form)
   */
  size?: 'sm' | 'base' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'prose-sm',
  base: 'prose-base',
  lg: 'prose-lg',
} as const;

export const Prose = React.forwardRef<HTMLDivElement, ProseProps>(
  ({ className, size = 'base', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base prose + shadcn token integration.
          // Most `prose-<el>` modifiers remap typography colors to our
          // HSL tokens so dark mode / palette swaps flow through.
          'prose max-w-none',
          SIZE_CLASSES[size],
          'prose-headings:text-foreground prose-headings:font-semibold',
          'prose-p:text-foreground',
          'prose-a:text-primary hover:prose-a:text-primary/80',
          'prose-strong:text-foreground',
          'prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary',
          'prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none',
          'prose-pre:bg-muted prose-pre:text-foreground',
          'prose-hr:border-border',
          'prose-li:text-foreground',
          'prose-img:rounded-lg prose-img:border prose-img:border-border',
          'dark:prose-invert',
          className
        )}
        {...props}
      />
    );
  }
);
Prose.displayName = 'Prose';
