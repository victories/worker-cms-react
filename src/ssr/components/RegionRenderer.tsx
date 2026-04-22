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
  sm: 'py-2',
  md: 'py-3',
  lg: 'py-8 md:py-12',
};

export function RegionRenderer({ config, ctx, as = 'div', className }: RegionRendererProps) {
  const Tag = as as any;
  const padding = PADDING_CLASS[config.padding ?? 'md'];
  // Header rows live as a single horizontal strip (logo / nav / actions),
  // so we vertically center their columns; body and footer keep top
  // alignment so a long sidebar doesn't push other columns down.
  const align = as === 'header' ? 'md:items-center' : 'md:items-start';

  // `sticky` is only meaningful for the header — a sticky body wrapper
  // pins the entire content column to the top of the viewport, and the
  // bundled `backdrop-blur` applies to every pixel underneath, which
  // looks like a full-page filigree/blur. Ignore the flag elsewhere.
  const isSticky = Boolean(config.sticky) && as === 'header';

  return (
    <Tag
      className={cn(
        isSticky
          ? 'sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
          : '',
        as === 'footer' ? 'mt-20 border-t border-border bg-muted/30' : '',
        className
      )}
    >
      <Container size="xl" className={padding}>
        <div className={cn('flex flex-col gap-6 md:flex-row', align)}>
          {config.columns.map((col, i) => (
            <div
              key={i}
              className={cn(
                'min-w-0',
                // Header columns lay slots out horizontally so a spacer
                // pushes neighbours apart instead of vanishing into a
                // dikey stack. Body/footer keep dikey stacking so widget
                // cards line up vertically as before.
                as === 'header'
                  ? 'flex flex-row items-center gap-3'
                  : 'space-y-4',
                // Per-column sticky — lets a short sidebar pin itself
                // to the top so long content next to it doesn't leave
                // a wall of whitespace. `top-20` (5rem) clears the
                // sticky header. Only takes effect on md+ viewports
                // where the columns are side-by-side. For sidebars
                // taller than the viewport the bottom widgets get
                // clipped — the admin should keep sticky columns
                // short enough to fit.
                col.sticky && as !== 'header' && 'md:sticky md:top-20 md:self-start'
              )}
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
