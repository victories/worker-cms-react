import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

/**
 * Plain "about" widget — title + body HTML. The body falls back to a
 * one-line site description if nothing has been authored.
 */
export function WidgetAboutSlot({ ctx, props }: SlotProps) {
  const title = resolveTitle(props?.title, ctx.siteName);
  const html = (props?.html as string) || '';
  if (!html) return null;
  return (
    <Card>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <div
          className="text-sm text-foreground/80 [&_a]:text-primary [&_a:hover]:text-primary/80"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </CardContent>
    </Card>
  );
}
