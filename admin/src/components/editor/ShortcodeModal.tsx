import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Braces, Copy, Check } from 'lucide-react';

interface ShortcodeInfo {
  name: string;
  description: string;
  descriptionEn: string;
  params: { name: string; desc: string; descEn: string; default?: string }[];
  example: string;
  category: string;
}

const SHORTCODES: ShortcodeInfo[] = [
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
  },
  {
    name: 'slider',
    description: 'Hero slider/kaydırıcı gösterir (Hero Slider eklentisi ayarlarından)',
    descriptionEn: 'Shows hero slider from Hero Slider plugin settings',
    params: [],
    example: '[slider]',
    category: 'medya',
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
  },
  {
    name: 'ozel-html',
    description: 'Özel HTML içerik bloğu ekler',
    descriptionEn: 'Adds custom HTML content block',
    params: [],
    example: '[ozel-html]<div class="banner">Özel içerik</div>[/ozel-html]',
    category: 'tasarim',
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
  },
  {
    name: 'sosyal-medya',
    description: 'Sosyal medya bağlantılarını gösterir (site ayarlarından)',
    descriptionEn: 'Shows social media links from site settings',
    params: [
      { name: 'stil', desc: 'Görünüm: ikon, metin, hepsi', descEn: 'Style: ikon, metin, hepsi', default: 'ikon' },
    ],
    example: '[sosyal-medya stil=ikon]',
    category: 'sosyal',
  },
  {
    name: 'iletisim-formu',
    description: 'İletişim formu ekler. Mesajlar admin panelindeki İletişim bölümüne kaydedilir.',
    descriptionEn: 'Adds a contact form. Messages are saved to the Contact section in admin panel.',
    params: [
      { name: 'baslik', desc: 'Form başlığı', descEn: 'Form title' },
    ],
    example: '[iletisim-formu baslik="Bize Ulaşın"]',
    category: 'form',
  },
];

const CATEGORIES: Record<string, { tr: string; en: string }> = {
  icerik: { tr: 'İçerik', en: 'Content' },
  medya: { tr: 'Medya', en: 'Media' },
  navigasyon: { tr: 'Navigasyon', en: 'Navigation' },
  tasarim: { tr: 'Tasarım', en: 'Design' },
  sosyal: { tr: 'Sosyal', en: 'Social' },
  form: { tr: 'Form', en: 'Form' },
};

interface ShortcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (shortcodeText: string) => void;
  lang?: string;
}

export function ShortcodeModal({ open, onOpenChange, onInsert, lang = 'en' }: ShortcodeModalProps) {
  const [search, setSearch] = useState('');
  const [selectedSc, setSelectedSc] = useState<ShortcodeInfo | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [innerContent, setInnerContent] = useState('');
  const [copiedExample, setCopiedExample] = useState(false);
  const tr = lang === 'tr';

  const filtered = useMemo(() => {
    if (!search.trim()) return SHORTCODES;
    const q = search.toLowerCase();
    return SHORTCODES.filter(sc =>
      sc.name.includes(q) ||
      sc.description.toLowerCase().includes(q) ||
      sc.descriptionEn.toLowerCase().includes(q) ||
      sc.category.includes(q)
    );
  }, [search]);

  const handleSelect = (sc: ShortcodeInfo) => {
    setSelectedSc(sc);
    const defaults: Record<string, string> = {};
    sc.params.forEach(p => { if (p.default) defaults[p.name] = p.default; });
    setParamValues(defaults);
    setInnerContent('');
  };

  const handleBack = () => {
    setSelectedSc(null);
    setParamValues({});
    setInnerContent('');
  };

  const buildShortcode = (): string => {
    if (!selectedSc) return '';
    const parts = [selectedSc.name];
    Object.entries(paramValues).forEach(([k, v]) => {
      if (v.trim()) {
        const val = v.includes(' ') ? `"${v}"` : v;
        parts.push(`${k}=${val}`);
      }
    });
    const tag = `[${parts.join(' ')}]`;
    // Paired shortcodes (ozel-html)
    if (selectedSc.name === 'ozel-html' || selectedSc.name === 'custom-html') {
      return `${tag}${innerContent || ''}[/${selectedSc.name}]`;
    }
    return tag;
  };

  const handleInsert = () => {
    const code = buildShortcode();
    if (code) {
      onInsert(code);
      onOpenChange(false);
      setSelectedSc(null);
      setParamValues({});
      setSearch('');
    }
  };

  const handleCopyExample = (example: string) => {
    navigator.clipboard.writeText(example);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedSc(null); setSearch(''); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Braces className="h-5 w-5" />
            {selectedSc
              ? <span>[{selectedSc.name}]</span>
              : (tr ? 'Shortcode Ekle' : 'Insert Shortcode')
            }
          </DialogTitle>
        </DialogHeader>

        {!selectedSc ? (
          /* --- LIST VIEW --- */
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tr ? 'Shortcode ara...' : 'Search shortcodes...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1 pr-1" style={{ maxHeight: '50vh' }}>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {tr ? 'Sonuç bulunamadı' : 'No results found'}
                </div>
              ) : (
                filtered.map((sc) => (
                  <button
                    key={sc.name}
                    onClick={() => handleSelect(sc)}
                    className="w-full text-left p-3 rounded-lg border hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700">
                        [{sc.name}]
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {CATEGORIES[sc.category]?.[lang === 'tr' ? 'tr' : 'en'] || sc.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tr ? sc.description : sc.descriptionEn}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* --- DETAIL/CONFIG VIEW --- */
          <div className="flex flex-col gap-4 overflow-hidden">
            <button
              onClick={handleBack}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 self-start"
            >
              ← {tr ? 'Tüm shortcode\'lar' : 'All shortcodes'}
            </button>

            <p className="text-sm text-muted-foreground">
              {tr ? selectedSc.description : selectedSc.descriptionEn}
            </p>

            {/* Example */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <code className="text-xs flex-1 font-mono text-muted-foreground">{selectedSc.example}</code>
              <Button
                variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                onClick={() => handleCopyExample(selectedSc.example)}
                title={tr ? 'Kopyala' : 'Copy'}
              >
                {copiedExample ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            {/* Params */}
            {selectedSc.params.length > 0 && (
              <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '35vh' }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {tr ? 'Parametreler' : 'Parameters'}
                </p>
                {selectedSc.params.map((p) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium font-mono">{p.name}</label>
                      {p.default && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {tr ? 'varsayılan' : 'default'}: {p.default}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{tr ? p.desc : p.descEn}</p>
                    <Input
                      value={paramValues[p.name] || ''}
                      onChange={(e) => setParamValues({ ...paramValues, [p.name]: e.target.value })}
                      placeholder={p.default || ''}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Inner content for paired shortcodes */}
            {(selectedSc.name === 'ozel-html' || selectedSc.name === 'custom-html') && (
              <div className="space-y-1">
                <label className="text-sm font-medium">{tr ? 'İçerik' : 'Content'}</label>
                <textarea
                  value={innerContent}
                  onChange={(e) => setInnerContent(e.target.value)}
                  rows={3}
                  className="w-full text-sm border rounded-md p-2 font-mono resize-none"
                  placeholder="<div>HTML içerik...</div>"
                />
              </div>
            )}

            {/* Preview */}
            <div className="bg-muted/30 border rounded-md p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {tr ? 'Önizleme' : 'Preview'}
              </p>
              <code className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">
                {buildShortcode()}
              </code>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {tr ? 'İptal' : 'Cancel'}
              </Button>
              <Button size="sm" onClick={handleInsert}>
                <Braces className="h-3.5 w-3.5 mr-1.5" />
                {tr ? 'Ekle' : 'Insert'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
