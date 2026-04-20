import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';

export function WidgetRecentPostsSlot({ ctx, props }: SlotProps) {
  const count = Math.max(1, Math.min(20, Number(props?.count ?? 5)));
  const title = resolveTitle(props?.title, ctx.lang === 'tr' ? 'Son Yazılar' : 'Recent Posts');
  const posts = ctx.sidebarData.recentPosts.slice(0, count);
  if (posts.length === 0) return null;

  return (
    <Card>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {posts.map((p) => (
            <li key={p.id} className="py-2 first:pt-0 last:pb-0">
              <a
                href={`${ctx.lp}/${p.slug}`}
                className="text-foreground/80 transition-colors hover:text-primary line-clamp-2"
              >
                {p.title}
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

