import { Prose } from '@ui/prose';

/**
 * PostContent — renders sanitized post/page HTML inside `<Prose>`.
 *
 * Post bodies are stored as HTML produced by the rich-text editor and
 * post-processed through `src/lib/shortcodes.ts` (which expands plugin
 * shortcodes like `[contact-form]`). By the time this component runs
 * the `html` string is trusted — route handlers MUST NOT pass
 * unsanitised user input here.
 *
 * We wrap in the shared `<Prose>` primitive so typography (heading
 * scale, line-height, link color, code block styling) picks up the
 * shadcn token palette consistently across themes.
 */

export interface PostContentProps {
  html: string;
  /** Typography scale — passes through to the Prose primitive. */
  size?: 'sm' | 'base' | 'lg';
}

export function PostContent({ html, size = 'lg' }: PostContentProps) {
  return (
    <Prose size={size} className="max-w-none">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Prose>
  );
}
