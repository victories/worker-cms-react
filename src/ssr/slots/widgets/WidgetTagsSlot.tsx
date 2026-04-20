import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

export function WidgetTagsSlot({ ctx, props }: SlotProps) {
  const title = resolveTitle(props?.title, ctx.lang === 'tr' ? 'Etiketler' : 'Tags');
  const tags = ctx.sidebarData.tags;
  if (tags.length === 0) return null;

  return (
    <Card>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <a key={tag.id} href={`${ctx.lp}/tag/${tag.slug}`}>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag.name}
              </Badge>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
