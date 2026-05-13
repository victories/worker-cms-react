import { m, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { cn } from '@ui/lib/utils';
import { AnimatedWordmark } from '../../ssr/pages/landing/components/AnimatedWordmark';

interface WordmarkProps {
  text: string;
  className?: string;
}

/**
 * Hydrates the SSR wordmark with a stagger reveal. The motion plays
 * once on mount (the first viewport view of the hero) and never again.
 *
 * Reduced-motion users get the static SSR markup verbatim by reusing
 * `AnimatedWordmark`. This keeps the SSR/static markup contract in
 * one place and ensures `className` is forwarded identically.
 */
export function Wordmark({ text, className }: WordmarkProps) {
  const reduced = useReducedMotion();
  const chars = useMemo(() => Array.from(text), [text]);

  if (reduced) {
    return <AnimatedWordmark text={text} className={className} />;
  }

  return (
    <m.span
      className={cn('font-heading inline-block tracking-[-0.04em]', className)}
      aria-label={text}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 1 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
    >
      {chars.map((ch, i) => (
        <m.span
          key={i}
          aria-hidden="true"
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                type: 'spring',
                damping: 14,
                stiffness: 200,
                mass: 0.6,
              },
            },
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </m.span>
      ))}
    </m.span>
  );
}
