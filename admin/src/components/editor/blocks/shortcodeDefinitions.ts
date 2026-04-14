// Shortcode definitions shared between ShortcodeModal and BlockNote custom blocks

export interface ShortcodeParam {
  name: string;
  desc: string;
  descEn: string;
  default?: string;
}

export interface ShortcodeDefinition {
  name: string;
  description: string;
  descriptionEn: string;
  params: ShortcodeParam[];
  example: string;
  category: string;
  isPaired: boolean;
}

export const SHORTCODE_DEFINITIONS: ShortcodeDefinition[] = [
  {
    name: 'son-yazilar',
    description: 'Son yayınlanan yazıları listeler',
    descriptionEn: 'Lists recent published posts',
    params: [
      { name: 'sayi', desc: 'Kaç yazı gösterilsin', descEn: 'Number of posts', default: '6' },
      { name: 'format', desc: 'Görünüm: kart, liste, mini', descEn: 'Display: kart, liste, mini', default: 'kart' },
      { name: 'kategori', desc: 'Kategori slug ile filtreleme', descEn: 'Filter by category slug' },
    ],
    example: '[son-yazilar sayi=6 format=kart]',
    category: 'icerik',
    isPaired: false,
  },
  {
    name: 'yazi',
    description: 'Belirli bir yazıyı ID veya slug ile gösterir',
    descriptionEn: 'Shows a specific post by ID or slug',
    params: [
      { name: 'id', desc: 'Yazı ID numarası', descEn: 'Post ID number' },
      { name: 'slug', desc: 'Yazı slug (URL kısmı)', descEn: 'Post slug' },
      { name: 'format', desc: 'Görünüm: kisa, tam, kart', descEn: 'Display: kisa, tam, kart', default: 'kisa' },
    ],
    example: '[yazi id=1 format=kart]',
    category: 'icerik',
    isPaired: false,
  },
  {
    name: 'kategori',
    description: 'Belirli bir kategorideki yazıları listeler',
    descriptionEn: 'Lists posts from a specific category',
    params: [
      { name: 'slug', desc: 'Kategori slug (zorunlu)', descEn: 'Category slug (required)' },
      { name: 'sayi', desc: 'Kaç yazı gösterilsin', descEn: 'Number of posts', default: '4' },
      { name: 'format', desc: 'Görünüm: kart, liste', descEn: 'Display: kart, liste', default: 'kart' },
    ],
    example: '[kategori slug="teknoloji" sayi=4]',
    category: 'icerik',
    isPaired: false,
  },
  {
    name: 'slider',
    description: 'Hero slider/kaydırıcı gösterir',
    descriptionEn: 'Shows hero slider from settings',
    params: [],
    example: '[slider]',
    category: 'medya',
    isPaired: false,
  },
  {
    name: 'menu',
    description: 'Belirli bir menüyü slug ile gösterir',
    descriptionEn: 'Shows a specific menu by slug',
    params: [
      { name: 'slug', desc: 'Menü slug (zorunlu)', descEn: 'Menu slug (required)' },
      { name: 'stil', desc: 'Görünüm: yatay, dikey', descEn: 'Style: yatay, dikey', default: 'yatay' },
    ],
    example: '[menu slug="ana-menu" stil=yatay]',
    category: 'navigasyon',
    isPaired: false,
  },
  {
    name: 'ozel-html',
    description: 'Özel HTML içerik bloğu ekler',
    descriptionEn: 'Adds custom HTML content block',
    params: [],
    example: '[ozel-html]<div class="banner">Custom content</div>[/ozel-html]',
    category: 'tasarim',
    isPaired: true,
  },
  {
    name: 'bosluk',
    description: 'Dikey boşluk ekler (piksel cinsinden)',
    descriptionEn: 'Adds vertical spacing (in pixels)',
    params: [
      { name: 'boyut', desc: 'Boşluk yüksekliği (px)', descEn: 'Height in px', default: '40' },
    ],
    example: '[bosluk boyut=60]',
    category: 'tasarim',
    isPaired: false,
  },
  {
    name: 'ayirici',
    description: 'Yatay çizgi / ayırıcı ekler',
    descriptionEn: 'Adds horizontal divider line',
    params: [
      { name: 'stil', desc: 'Çizgi tipi: duz, noktali, cizgili', descEn: 'Style: duz, noktali, cizgili', default: 'duz' },
      { name: 'renk', desc: 'Çizgi rengi (CSS)', descEn: 'Line color (CSS)' },
      { name: 'genislik', desc: 'Genişlik yüzdesi', descEn: 'Width percentage', default: '100' },
    ],
    example: '[ayirici stil=noktali genislik=80]',
    category: 'tasarim',
    isPaired: false,
  },
  {
    name: 'arama-formu',
    description: 'Arama kutusu ekler',
    descriptionEn: 'Adds a search form',
    params: [
      { name: 'placeholder', desc: 'Placeholder metni', descEn: 'Placeholder text' },
      { name: 'buton', desc: 'Buton metni', descEn: 'Button text' },
    ],
    example: '[arama-formu placeholder="Site içinde ara..."]',
    category: 'navigasyon',
    isPaired: false,
  },
  {
    name: 'widget',
    description: 'Widget alanından widget gösterir',
    descriptionEn: 'Shows widgets from a widget area',
    params: [
      { name: 'alan', desc: 'Widget alanı adı', descEn: 'Widget area name' },
      { name: 'tip', desc: 'Widget tipi filtresi', descEn: 'Widget type filter' },
    ],
    example: '[widget alan="sidebar"]',
    category: 'icerik',
    isPaired: false,
  },
  {
    name: 'galeri',
    description: 'Resim galerisi gösterir',
    descriptionEn: 'Shows an image gallery',
    params: [
      { name: 'idler', desc: 'Medya ID listesi (virgülle)', descEn: 'Media IDs (comma-separated)' },
      { name: 'sutun', desc: 'Sütun sayısı', descEn: 'Number of columns', default: '3' },
      { name: 'sayi', desc: 'Gösterilecek resim sayısı', descEn: 'Number of images', default: '12' },
    ],
    example: '[galeri sutun=3 sayi=9]',
    category: 'medya',
    isPaired: false,
  },
  {
    name: 'video',
    description: 'YouTube, Vimeo veya doğrudan video embed eder',
    descriptionEn: 'Embeds YouTube, Vimeo or direct video',
    params: [
      { name: 'url', desc: 'Video URL (zorunlu)', descEn: 'Video URL (required)' },
      { name: 'genislik', desc: 'Genişlik', descEn: 'Width', default: '100%' },
      { name: 'yukseklik', desc: 'Yükseklik (px)', descEn: 'Height (px)', default: '400' },
    ],
    example: '[video url="https://youtube.com/watch?v=..."]',
    category: 'medya',
    isPaired: false,
  },
  {
    name: 'sosyal-medya',
    description: 'Sosyal medya bağlantılarını gösterir',
    descriptionEn: 'Shows social media links from site settings',
    params: [
      { name: 'stil', desc: 'Görünüm: ikon, metin, hepsi', descEn: 'Style: ikon, metin, hepsi', default: 'ikon' },
    ],
    example: '[sosyal-medya stil=ikon]',
    category: 'sosyal',
    isPaired: false,
  },
  {
    name: 'iletisim-formu',
    description: 'İletişim formu ekler',
    descriptionEn: 'Adds a contact form',
    params: [
      { name: 'baslik', desc: 'Form başlığı', descEn: 'Form title' },
      { name: 'email', desc: 'Alıcı e-posta', descEn: 'Recipient email' },
    ],
    example: '[iletisim-formu baslik="Bize Ulaşın"]',
    category: 'form',
    isPaired: false,
  },
];

export const SHORTCODE_CATEGORIES: Record<string, { tr: string; en: string }> = {
  icerik: { tr: 'İçerik', en: 'Content' },
  medya: { tr: 'Medya', en: 'Media' },
  navigasyon: { tr: 'Navigasyon', en: 'Navigation' },
  tasarim: { tr: 'Tasarım', en: 'Design' },
  sosyal: { tr: 'Sosyal', en: 'Social' },
  form: { tr: 'Form', en: 'Form' },
};

/** Build shortcode text string from definition and props */
export function buildShortcodeText(def: ShortcodeDefinition, props: Record<string, string>): string {
  const parts = [def.name];
  for (const p of def.params) {
    const val = props[p.name];
    if (val && val.trim()) {
      parts.push(val.includes(' ') ? `${p.name}="${val}"` : `${p.name}=${val}`);
    }
  }
  const tag = `[${parts.join(' ')}]`;
  if (def.isPaired) {
    return `${tag}${props.innerContent || ''}[/${def.name}]`;
  }
  return tag;
}
