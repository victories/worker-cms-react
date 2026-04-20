import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

export function WidgetCategoriesSlot({ ctx, props }: SlotProps) {
  const title = resolveTitle(props?.title, ctx.lang === 'tr' ? 'Kategoriler' : 'Categories');
  const categories = ctx.sidebarData.categories;
  if (categories.length === 0) return null;

  return (
    <Card>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {categories.map((cat) => (
            <li key={cat.id} className="py-2 first:pt-0 last:pb-0">
              <a
                href={`${ctx.lp}/category/${cat.slug}`}
                className="flex items-center justify-between text-foreground/80 transition-colors hover:text-primary"
              >
                <span>{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
