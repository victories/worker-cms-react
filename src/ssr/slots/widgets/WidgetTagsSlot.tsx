import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import type { SlotProps } from '../types';

export function WidgetTagsSlot({ ctx, props }: SlotProps) {
  const title = (props?.title as string) || (ctx.lang === 'tr' ? 'Etiketler' : 'Tags');
  const tags = ctx.sidebarData.tags;
  if (tags.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
