import { Container } from '@ui/container';
import { cn } from '@ui/lib/utils';
import type { RegionConfig } from '../../lib/themes/types';
import { slotRegistry, type SlotContext } from '../slots';

/**
 * Renders one design region (header / body / footer / …) by walking
 * `config.columns` and looking each slot up in `slotRegistry`. Layout
 * is a flex row (stacking on mobile) where each column flexes to its
 * percentage width. Sticky regions keep stuck to the viewport top.
 */

export interface RegionRendererProps {
  config: RegionConfig;
  ctx: SlotContext;
  /** Wrapping element semantic — header / footer / div for body. */
  as?: 'header' | 'footer' | 'div' | 'section';
  className?: string;
}

const PADDING_CLASS: Record<NonNullable<RegionConfig['padding']>, string> = {
  none: '',
  sm: 'py-4',
  md: 'py-6',
  lg: 'py-10 md:py-14',
};

export function RegionRenderer({ config, ctx, as = 'div', className }: RegionRendererProps) {
  const Tag = as as any;
  const padding = PADDING_CLASS[config.padding ?? 'md'];

  return (
    <Tag
      className={cn(
        config.sticky
          ? 'sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
          : '',
        as === 'footer' ? 'mt-20 border-t border-border bg-muted/30' : '',
        className
      )}
    >
      <Container size="xl" className={padding}>
        <div className="flex flex-col items-stretch gap-6 md:flex-row">
          {config.columns.map((col, i) => (
            <div
              key={i}
              className="min-w-0 space-y-4"
              style={{ flex: `0 0 ${col.width}%` }}
            >
              {col.slots.map((slot, j) => {
                const Comp = slotRegistry[slot.id];
                if (!Comp) {
                  return (
                    <div
                      key={j}
                      className="rounded border border-dashed border-amber-500/50 bg-amber-500/5 p-2 text-xs text-amber-700"
                    >
                      Bilinmeyen slot: <code className="font-mono">{slot.id}</code>
                    </div>
                  );
                }
                return <Comp key={j} ctx={ctx} props={slot.props} />;
              })}
            </div>
          ))}
        </div>
      </Container>
    </Tag>
  );
}
