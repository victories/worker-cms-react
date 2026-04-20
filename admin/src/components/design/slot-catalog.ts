import {
  Image as ImageIcon,
  Menu as MenuIcon,
  Search,
  UserCircle,
  FileText,
  ListOrdered,
  Tags,
  FolderTree,
  Code2,
  Mail,
  Info,
  type LucideIcon,
} from 'lucide-react';

export interface SlotCatalogEntry {
  /** Registry key shipped in `layout_config.columns[i].slots[j].id` */
  id: string;
  label: string;
  icon: LucideIcon;
  category: 'site' | 'core' | 'widget';
  /** When true, only one instance of this slot may exist across the layout. */
  singleton?: boolean;
  /** Initial props applied when the slot is first dropped onto a column. */
  defaultProps?: Record<string, unknown>;
  /** Short hint shown in the palette tooltip / config header. */
  hint?: string;
}

/**
 * Slot catalog used by the Layout Builder. Mirrors the keys the SSR
 * slot registry will resolve in Faz 5; until then dropping a slot only
 * affects what gets stored in `site_design.layout_config`.
 */
export const SLOT_CATALOG: SlotCatalogEntry[] = [
  // Site chrome
  { id: 'logo', label: 'Logo', icon: ImageIcon, category: 'site', hint: 'Site logosu / metni' },
  { id: 'menu', label: 'Menü', icon: MenuIcon, category: 'site', defaultProps: { menu_id: null }, hint: 'Yatay nav menü' },
  { id: 'search', label: 'Arama', icon: Search, category: 'site', defaultProps: { placeholder: 'Ara…' } },
  { id: 'user-actions', label: 'Kullanıcı butonları', icon: UserCircle, category: 'site' },

  // Core
  {
    id: 'main-content',
    label: 'Sayfa içeriği',
    icon: FileText,
    category: 'core',
    singleton: true,
    hint: 'Her sayfanın asıl içeriği. Tüm layout\'ta bir kez kullanılabilir.',
  },

  // Widgets (mevcut widget tipleriyle 1:1)
  { id: 'widget:recent-posts', label: 'Son yazılar', icon: ListOrdered, category: 'widget', defaultProps: { count: 5 } },
  { id: 'widget:categories', label: 'Kategoriler', icon: FolderTree, category: 'widget' },
  { id: 'widget:tags', label: 'Etiketler', icon: Tags, category: 'widget' },
  { id: 'widget:custom-html', label: 'Özel HTML', icon: Code2, category: 'widget', defaultProps: { html: '' } },
  { id: 'widget:newsletter', label: 'Bülten formu', icon: Mail, category: 'widget' },
  { id: 'widget:about', label: 'Hakkımızda', icon: Info, category: 'widget', defaultProps: { title: '', html: '' } },
];

export function getSlotEntry(id: string): SlotCatalogEntry | undefined {
  return SLOT_CATALOG.find((s) => s.id === id);
}

export const REGION_KEYS = ['header', 'body', 'footer'] as const;
export type RegionKey = (typeof REGION_KEYS)[number];

export const REGION_LABELS: Record<RegionKey, string> = {
  header: 'Header',
  body: 'Gövde',
  footer: 'Footer',
};
