import { cn } from '@ui/lib/utils';

interface AnimatedWordmarkProps {
  text: string;
  className?: string;
}

/**
 * Server-rendered wordmark. Each character is wrapped in a span with
 * data-letter so the client island can target them for stagger reveal
 * after hydration. Without JS, the wordmark renders fully visible —
 * no motion, no flicker.
 */
export function AnimatedWordmark({ text, className }: AnimatedWordmarkProps) {
  const chars = Array.from(text);
  return (
    <span
      data-island="wordmark"
      className={cn(
        'font-heading inline-block tracking-[-0.04em]',
        className
      )}
      aria-label={text}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          data-letter={i}
          aria-hidden="true"
          className="inline-block will-change-transform"
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}
