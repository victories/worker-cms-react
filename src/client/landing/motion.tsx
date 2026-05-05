import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

interface MotionRootProps {
  children: ReactNode;
}

/**
 * Wraps the entire client motion tree. LazyMotion + domAnimation
 * loads only ~10-12 KB of framer-motion features (no `m.div` heavy
 * dependencies). MotionConfig.reducedMotion="user" delegates to the
 * OS preference automatically — every motion child opts out for free.
 */
export function MotionRoot({ children }: MotionRootProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
