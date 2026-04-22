import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

/**
 * Drop a shortcode anywhere in the layout (header / body / footer /
 * sidebar column). The admin types the raw shortcode string (e.g.
 * `"[son-yazilar sayi=5]"` or a site-defined static shortcode like
 * `"[reklam-kodu]"`) and the route handler pre-renders it into
 * `ctx.shortcodeOutputs` before React runs — the slot itself is a
 * simple HTML injection.
 *
 * Title is optional; when empty the card chrome vanishes (just the
 * shortcode HTML).
 */
export function WidgetShortcodeSlot({ ctx, props }: SlotProps) {
  const raw = typeof props?.shortcode === 'string' ? props.shortcode.trim() : '';
  if (!raw) return null;
  const html = ctx.shortcodeOutputs?.[raw];
  if (!html) return null;

  const title = resolveTitle(props?.title, '');
  const body = (
    <div
      className="text-sm text-foreground/80 [&_a]:text-primary [&_a:hover]:text-primary/80"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  if (!title) return body;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{body}</CardContent>
    </Card>
  );
}
