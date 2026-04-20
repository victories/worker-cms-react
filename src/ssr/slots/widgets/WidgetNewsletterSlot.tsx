import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

/**
 * Inline newsletter form. POSTs to a configurable endpoint (defaults
 * to `/api/newsletter/subscribe` once that endpoint exists). Markup
 * intentionally minimal so themes can restyle freely.
 */
export function WidgetNewsletterSlot({ ctx, props }: SlotProps) {
  const title = resolveTitle(
    props?.title,
    ctx.lang === 'tr' ? 'Bültenimize Katılın' : 'Subscribe'
  );
  const cta = (props?.cta as string) || (ctx.lang === 'tr' ? 'Abone Ol' : 'Subscribe');
  const placeholder =
    (props?.placeholder as string) || (ctx.lang === 'tr' ? 'E-posta adresiniz' : 'Your email');
  const action = (props?.action as string) || '/api/newsletter/subscribe';

  return (
    <Card>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <form action={action} method="post" className="flex flex-col gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder={placeholder}
            className="rounded border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {cta}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
