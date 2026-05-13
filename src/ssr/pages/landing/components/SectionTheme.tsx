import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import { cn } from '@ui/lib/utils';

interface SectionThemeProps extends Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  theme?: 'auto' | 'dark';
  children: ReactNode;
}

export function SectionTheme({
  theme = 'auto',
  className,
  children,
  ...rest
}: SectionThemeProps) {
  return (
    <section
      data-section-theme={theme === 'dark' ? 'dark' : undefined}
      className={cn(
        'relative',
        theme === 'dark' && 'bg-background text-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </section>
  );
}
