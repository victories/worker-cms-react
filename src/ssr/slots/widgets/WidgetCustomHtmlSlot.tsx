import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

/**
 * Renders raw HTML supplied by the admin. The content is *not*
 * sanitised — admin-only surface, trusted operator. No localised
 * default for the title since this is a freeform block.
 */
export function WidgetCustomHtmlSlot({ props }: SlotProps) {
  const html = (props?.html as string) || '';
  const title = resolveTitle(props?.title, '');
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
