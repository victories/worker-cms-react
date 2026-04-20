import type { SlotComponent } from './types';
import { LogoSlot } from './LogoSlot';
import { MenuSlot } from './MenuSlot';
import { SearchSlot } from './SearchSlot';
import { UserActionsSlot } from './UserActionsSlot';
import { MobileMenuSlot } from './MobileMenuSlot';
import { ThemeToggleSlot } from './ThemeToggleSlot';
import { MainContentSlot } from './MainContentSlot';
import { ButtonSlot } from './ButtonSlot';
import { SocialIconsSlot } from './SocialIconsSlot';
import { SpacerSlot } from './SpacerSlot';
import { DividerSlot } from './DividerSlot';
import { HtmlBlockSlot } from './HtmlBlockSlot';
import { WidgetRecentPostsSlot } from './widgets/WidgetRecentPostsSlot';
import { WidgetCategoriesSlot } from './widgets/WidgetCategoriesSlot';
import { WidgetTagsSlot } from './widgets/WidgetTagsSlot';
import { WidgetCustomHtmlSlot } from './widgets/WidgetCustomHtmlSlot';
import { WidgetNewsletterSlot } from './widgets/WidgetNewsletterSlot';
import { WidgetAboutSlot } from './widgets/WidgetAboutSlot';

export type { SlotContext, SlotProps, SlotComponent } from './types';

/**
 * Registry of every slot id the Theme Studio knows about. The Layout
 * Builder admin and the SSR RegionRenderer both look slots up here —
 * adding a new slot type means adding a row here, an entry in
 * `admin/src/components/design/slot-catalog.ts`, and a component file
 * under this folder.
 */
export const slotRegistry: Record<string, SlotComponent> = {
  logo: LogoSlot,
  menu: MenuSlot,
  search: SearchSlot,
  'user-actions': UserActionsSlot,
  'mobile-menu': MobileMenuSlot,
  'theme-toggle': ThemeToggleSlot,
  'main-content': MainContentSlot,
  button: ButtonSlot,
  'social-icons': SocialIconsSlot,
  spacer: SpacerSlot,
  divider: DividerSlot,
  'html-block': HtmlBlockSlot,
  'widget:recent-posts': WidgetRecentPostsSlot,
  'widget:categories': WidgetCategoriesSlot,
  'widget:tags': WidgetTagsSlot,
  'widget:custom-html': WidgetCustomHtmlSlot,
  'widget:newsletter': WidgetNewsletterSlot,
  'widget:about': WidgetAboutSlot,
};
