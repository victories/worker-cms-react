import {
  Image as ImageIcon,
  Menu as MenuIcon,
  Search,
  FileText,
  ListOrdered,
  Tags,
  FolderTree,
  Code2,
  Mail,
  Info,
  Sun,
  MousePointerClick,
  Share2,
  Move,
  Minus,
  Code,
  Smartphone,
  Menu as MenuListIcon,
  SquareCode,
  type LucideIcon,
} from 'lucide-react';

export interface SlotCatalogEntry {
  /** Registry key shipped in `layout_config.columns[i].slots[j].id` */
  id: string;
  label: string;
  icon: LucideIcon;
  category: 'site' | 'core' | 'layout' | 'widget';
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
  {
    id: 'search',
    label: 'Arama',
    icon: Search,
    category: 'site',
    defaultProps: { variant: 'icon', placeholder: 'Ara…' },
    hint: 'İkon (popup) veya satır içi tam form',
  },
  { id: 'theme-toggle', label: 'Karanlık mod düğmesi', icon: Sun, category: 'site', hint: 'Light / dark mod toggle' },
  {
    id: 'mobile-menu',
    label: 'Mobil menü düğmesi',
    icon: Smartphone,
    category: 'site',
    hint: 'Sadece md altı viewport\'larda görünen hamburger menü',
  },
  {
    id: 'button',
    label: 'Buton',
    icon: MousePointerClick,
    category: 'site',
    defaultProps: { text: 'Tıkla', href: '#', variant: 'primary', size: 'md' },
    hint: 'CTA / harekete geçir butonu',
  },
  {
    id: 'social-icons',
    label: 'Sosyal Medya',
    icon: Share2,
    category: 'site',
    defaultProps: {},
    hint: 'Instagram / Facebook / X / YouTube / LinkedIn / GitHub',
  },

  // Core
  {
    id: 'main-content',
    label: 'Sayfa içeriği',
    icon: FileText,
    category: 'core',
    singleton: true,
    hint: 'Her sayfanın asıl içeriği. Tüm layout\'ta bir kez kullanılabilir.',
  },

  // Layout helpers
  {
    id: 'spacer',
    label: 'Esnek boşluk',
    icon: Move,
    category: 'layout',
    defaultProps: {},
    hint: 'Slot\'ları birbirinden ayırır (esnek veya sabit yükseklik)',
  },
  {
    id: 'divider',
    label: 'Ayırıcı çizgi',
    icon: Minus,
    category: 'layout',
    defaultProps: { orientation: 'horizontal' },
    hint: 'Yatay (hr) veya dikey ince çizgi',
  },
  {
    id: 'html-block',
    label: 'HTML bloğu',
    icon: Code,
    category: 'layout',
    defaultProps: { html: '' },
    hint: 'Kart çerçevesi olmayan ham HTML / banner / reklam alanı',
  },

  // Widgets (mevcut widget tipleriyle 1:1, kart çerçeveli)
  { id: 'widget:recent-posts', label: 'Son yazılar', icon: ListOrdered, category: 'widget', defaultProps: { count: 5 } },
  { id: 'widget:categories', label: 'Kategoriler', icon: FolderTree, category: 'widget' },
  { id: 'widget:tags', label: 'Etiketler', icon: Tags, category: 'widget' },
  { id: 'widget:custom-html', label: 'Özel HTML (kartlı)', icon: Code2, category: 'widget', defaultProps: { html: '' } },
  { id: 'widget:newsletter', label: 'Bülten formu', icon: Mail, category: 'widget' },
  { id: 'widget:about', label: 'Hakkımızda', icon: Info, category: 'widget', defaultProps: { title: '', html: '' } },
  {
    id: 'widget:menu',
    label: 'Menü Listesi',
    icon: MenuListIcon,
    category: 'widget',
    defaultProps: { menu_slug: '', orientation: 'vertical' },
    hint: 'Sidebar veya footer için menü (header menüsünden ayrı)',
  },
  {
    id: 'widget:shortcode',
    label: 'Kısa Kod',
    icon: SquareCode,
    category: 'widget',
    defaultProps: { shortcode: '', title: '' },
    hint: 'Herhangi bir shortcode\'u layout\'a yerleştir (ör. [son-yazilar sayi=5])',
  },
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
