import type { ComponentType, ReactNode } from 'react';
import type { NavMenuItem } from '@ui/nav-menu';
import type { SidebarData } from '../../lib/public-db';

/**
 * Render context every slot receives. Built once by `PublisherLayout`
 * from the route handler's pre-fetched data, then forwarded down through
 * `RegionRenderer`. Slots only read from this — they don't fetch.
 */
export interface SlotContext {
  siteName: string;
  siteLogo?: string;
  lang: string;
  /** Locale prefix for hrefs ('' or '/en'). */
  lp: string;
  navItems: NavMenuItem[];
  activePath?: string;
  sidebarData: SidebarData;
  /** Where the brand link points (lp || '/'). */
  homeHref: string;
  /** Form action URL for the search slot (locale-prefixed). */
  searchAction: string;
  /** Localised default placeholder for the search slot. */
  searchPlaceholder: string;
  supportsDarkMode?: boolean;
  /** Page body — used by the `main-content` slot. */
  children?: ReactNode;
  /** Pre-rendered plugin slot output, kept for backward-compat. */
  headerRight?: ReactNode;
  sidebarTop?: ReactNode;
  sidebarBottom?: ReactNode;
  /** Pre-rendered HTML for every shortcode referenced by a
   *  `widget:shortcode` slot in the layout. Keyed by the raw
   *  shortcode string (e.g. `"[son-yazilar sayi=3]"`) so the slot can
   *  read the output synchronously at render time. */
  shortcodeOutputs?: Record<string, string>;
}

/**
 * What every slot component receives. `props` is the user-editable
 * config bag persisted under `layout_config.columns[i].slots[j].props`.
 */
export interface SlotProps {
  ctx: SlotContext;
  props?: Record<string, unknown>;
}

export type SlotComponent = ComponentType<SlotProps>;
