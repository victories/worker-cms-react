import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import type { SlotProps } from '../types';
import { resolveTitle } from './title';
import { MenuRenderer } from '../../components/MenuRenderer';

/**
 * Renders a menu (from `menus` + `menu_items`) inside a sidebar or
 * footer column. The menu is identified by its slug; the menu data
 * itself is pre-fetched by the route handler via `getSidebarData`'s
 * `extraMenuSlugs` option, so this component is a synchronous lookup.
 *
 * `props.orientation` defaults to vertical (sidebar/footer style);
 * pass 'horizontal' for an inline list.
 */
export function WidgetMenuSlot({ ctx, props }: SlotProps) {
  const slug = (props?.menu_slug as string) || '';
  if (!slug) return null;
  const menu = ctx.sidebarData.menus?.[slug];
  if (!menu || menu.items.length === 0) return null;

  const title = resolveTitle(props?.title, menu.name);
  const orientation =
    (props?.orientation as string) === 'horizontal' ? 'horizontal' : 'vertical';

  return (
    <Card>
      {title ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={title ? 'pt-0' : 'pt-6'}>
        <MenuRenderer items={menu.items} orientation={orientation} />
      </CardContent>
    </Card>
  );
}
