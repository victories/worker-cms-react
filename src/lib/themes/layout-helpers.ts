import type { ActiveDesign, LayoutConfig } from './types';

/**
 * What the sidebar/footer rendering actually needs to pre-fetch based on
 * the resolved Theme Studio design. Aggregated once at the route handler
 * so `getSidebarData` can fan out queries in a single Promise.all.
 */
export interface DesignSidebarNeeds {
  /** Menu slugs referenced by `widget:menu` slots. */
  menuSlugs: string[];
  /** True if any slot is `widget:categories`. */
  needCategories: boolean;
  /** True if any slot is `widget:recent-posts`. */
  needRecentPosts: boolean;
  /** True if any slot is `widget:tags`. */
  needTags: boolean;
}

/**
 * Walk a layout tree once and collect everything the SSR layer will
 * need to populate its sidebar/footer widgets. Covers `widget:menu`
 * menu_slug lookups plus taxonomy/post pre-fetches for category /
 * recent-posts / tags slots.
 *
 * Without this, slots configured purely through the Theme Studio (with
 * no matching legacy `widgets` row) render empty because `getSidebarData`
 * historically only pre-fetched for widgets in the `widgets` table.
 */
export function extractDesignSidebarNeeds(
  design: ActiveDesign | null | undefined,
): DesignSidebarNeeds {
  const result: DesignSidebarNeeds = {
    menuSlugs: [],
    needCategories: false,
    needRecentPosts: false,
    needTags: false,
  };
  if (!design || !design.layoutConfig) return result;

  const slugs = new Set<string>();
  const layout = design.layoutConfig as LayoutConfig;
  for (const region of Object.values(layout)) {
    if (!region || !Array.isArray(region.columns)) continue;
    for (const col of region.columns) {
      if (!Array.isArray(col.slots)) continue;
      for (const slot of col.slots) {
        if (slot.id === 'widget:menu' && typeof slot.props?.menu_slug === 'string') {
          const s = (slot.props.menu_slug as string).trim();
          if (s) slugs.add(s);
        } else if (slot.id === 'widget:categories') {
          result.needCategories = true;
        } else if (slot.id === 'widget:recent-posts') {
          result.needRecentPosts = true;
        } else if (slot.id === 'widget:tags') {
          result.needTags = true;
        }
      }
    }
  }
  result.menuSlugs = [...slugs];
  return result;
}

/**
 * Back-compat convenience — older call-sites only cared about menu
 * slugs. New code should prefer `extractDesignSidebarNeeds`.
 */
export function extractMenuSlugsFromDesign(
  design: ActiveDesign | null | undefined,
): string[] {
  return extractDesignSidebarNeeds(design).menuSlugs;
}
