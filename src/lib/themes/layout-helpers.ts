import type { ActiveDesign, LayoutConfig } from './types';

/**
 * Walk a layout tree and collect every `menu_slug` referenced by a
 * `widget:menu` slot. Used by route handlers so getSidebarData can
 * pre-fetch the menus the layout needs.
 */
export function extractMenuSlugsFromDesign(design: ActiveDesign | null | undefined): string[] {
  if (!design || !design.layoutConfig) return [];
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
        }
      }
    }
  }
  return [...slugs];
}
