/**
 * Landing page default content + config schema.
 *
 * The Landing component (src/ssr/pages/Landing.tsx) renders text from
 * the merged config; missing fields fall back to the values defined
 * here. This is also the source of truth used by the API
 * (src/routes/api/landing.ts) when no `landing_config` row exists yet
 * and when admins click "Reset to default".
 *
 * Schema is intentionally flat with one or two levels of nesting so the
 * admin form can scroll through it as collapsible sections without
 * needing recursive editors.
 */

export interface LandingNavLink {
  label: string;
  url: string;
}

export interface LandingStat {
  value: string;
  label: string;
}

export interface LandingFeatureCard {
  num: string;
  title: string;
  desc: string;
  /** Free-form text shown below the separator inside the card. */
  footer: string;
}

export interface LandingMiniFeature {
  title: string;
  desc: string;
}

export interface LandingBullet {
  value: string;
  text: string;
}

export interface LandingBuiltInPlugin {
  name: string;
  status: string;
  description: string;
}

export interface LandingShortcode {
  code: string;
  label: string;
}

export interface LandingPricingPlan {
  name: string;
  desc?: string;
  currency?: string;
  /** Plain string so it can be "Ücretsiz" or "Özel" or a number. */
  price?: string | number;
  period?: string;
  features?: string[];
  cta_text?: string;
  cta_url?: string;
  highlighted?: boolean;
}

export interface LandingFooterLink {
  text: string;
  url: string;
}

export interface LandingFooterColumn {
  heading: string;
  links: LandingFooterLink[];
}

export interface LandingConfig {
  enabled?: boolean;
  brand?: { name?: string; tagline?: string; logo_url?: string };
  nav?: {
    items?: LandingNavLink[];
    login_text?: string;
    login_url?: string;
    cta_text?: string;
    cta_url?: string;
  };
  hero?: {
    badge?: string;
    /** Title is split into 3 spans: `lead <em>highlight</em> tail`. */
    title_lead?: string;
    title_highlight?: string;
    title_tail?: string;
    /** Subtitle is split similarly so admins can bold one phrase. */
    subtitle_lead?: string;
    subtitle_bold?: string;
    subtitle_tail?: string;
    cta_text?: string;
    cta_url?: string;
    secondary_cta_text?: string;
    secondary_cta_url?: string;
    note?: string;
    stats?: LandingStat[];
  };
  marquee?: {
    items?: string[];
  };
  architecture?: {
    section_label?: string;
    title_lead?: string;
    title_highlight?: string;
    title_tail?: string;
    body_lead?: string;
    body_bold?: string;
    body_tail?: string;
    bullets?: string[];
    diagram_label?: string;
    live_label?: string;
  };
  features?: {
    section_label?: string;
    title_lead?: string;
    title_highlight?: string;
    title_tail?: string;
    side_note?: string;
    items?: LandingFeatureCard[];
    mini?: LandingMiniFeature[];
  };
  mcp?: {
    section_label?: string;
    title_lead?: string;
    title_highlight?: string;
    title_tail?: string;
    body_lead?: string;
    body_bold?: string;
    body_tail?: string;
    bullets?: LandingBullet[];
    plan_note?: string;
    chat_title?: string;
    chat_status?: string;
    chat_user_label?: string;
    chat_user_message?: string;
    chat_assistant_label?: string;
    chat_steps?: string[];
    chat_response_lead?: string;
    chat_response_quoted?: string;
    compat_label?: string;
    compat_items?: string[];
    compat_extra?: string;
  };
  plugins?: {
    section_label?: string;
    title_lead?: string;
    title_highlight?: string;
    title_tail?: string;
    body?: string;
    builtin_heading?: string;
    builtin?: LandingBuiltInPlugin[];
    shortcodes_heading?: string;
    shortcodes?: LandingShortcode[];
    shortcodes_extra?: string;
  };
  pricing?: {
    section_label?: string;
    title_lead?: string;
    title_highlight?: string;
    subtitle?: string;
    plans?: LandingPricingPlan[];
    final_title?: string;
    final_subtitle?: string;
    final_cta_text?: string;
    final_cta_url?: string;
  };
  footer?: {
    description?: string;
    columns?: LandingFooterColumn[];
    copyright?: string;
    side_text?: string;
  };
}

/**
 * Resolved (no-undefined) view of the config used by the renderer.
 * Defined explicitly so `as const` on the defaults doesn't make the
 * shape `readonly` (mutable string[] arrays + plain numeric `length`
 * are both required for the renderer's `.length === 0` checks).
 */
export interface ResolvedLandingConfig {
  enabled: boolean;
  brand: { name: string; tagline: string; logo_url: string };
  nav: {
    items: LandingNavLink[];
    login_text: string;
    login_url: string;
    cta_text: string;
    cta_url: string;
  };
  hero: {
    badge: string;
    title_lead: string;
    title_highlight: string;
    title_tail: string;
    subtitle_lead: string;
    subtitle_bold: string;
    subtitle_tail: string;
    cta_text: string;
    cta_url: string;
    secondary_cta_text: string;
    secondary_cta_url: string;
    note: string;
    stats: LandingStat[];
  };
  marquee: { items: string[] };
  architecture: {
    section_label: string;
    title_lead: string;
    title_highlight: string;
    title_tail: string;
    body_lead: string;
    body_bold: string;
    body_tail: string;
    bullets: string[];
    diagram_label: string;
    live_label: string;
  };
  features: {
    section_label: string;
    title_lead: string;
    title_highlight: string;
    title_tail: string;
    side_note: string;
    items: LandingFeatureCard[];
    mini: LandingMiniFeature[];
  };
  mcp: {
    section_label: string;
    title_lead: string;
    title_highlight: string;
    title_tail: string;
    body_lead: string;
    body_bold: string;
    body_tail: string;
    bullets: LandingBullet[];
    plan_note: string;
    chat_title: string;
    chat_status: string;
    chat_user_label: string;
    chat_user_message: string;
    chat_assistant_label: string;
    chat_steps: string[];
    chat_response_lead: string;
    chat_response_quoted: string;
    compat_label: string;
    compat_items: string[];
    compat_extra: string;
  };
  plugins: {
    section_label: string;
    title_lead: string;
    title_highlight: string;
    title_tail: string;
    body: string;
    builtin_heading: string;
    builtin: LandingBuiltInPlugin[];
    shortcodes_heading: string;
    shortcodes: LandingShortcode[];
    shortcodes_extra: string;
  };
  pricing: {
    section_label: string;
    title_lead: string;
    title_highlight: string;
    subtitle: string;
    plans: LandingPricingPlan[];
    final_title: string;
    final_subtitle: string;
    final_cta_text: string;
    final_cta_url: string;
  };
  footer: {
    description: string;
    columns: LandingFooterColumn[];
    copyright: string;
    side_text: string;
  };
}

export const LANDING_DEFAULTS: ResolvedLandingConfig = {
  enabled: true,
  brand: {
    name: 'Worker CMS',
    tagline: "Edge'de çalışan modern içerik platformu",
    logo_url: '',
  },
  nav: {
    items: [
      { label: 'Özellikler', url: '#features' },
      { label: 'Performans', url: '#architecture' },
      { label: 'AI Entegrasyonu', url: '#mcp' },
      { label: 'Eklentiler', url: '#plugins' },
      { label: 'Fiyatlandırma', url: '#pricing' },
    ],
    login_text: 'Giriş yap',
    login_url: '/admin/login',
    cta_text: 'Ücretsiz başla',
    cta_url: '/admin/register',
  },
  hero: {
    badge: 'Edge-native CMS · 300+ konum · ~30ms p50',
    title_lead: "WordPress'in özgürlüğü, ",
    title_highlight: 'saniyenin onda biri',
    title_tail: ' hızında.',
    subtitle_lead:
      'Worker CMS, sınırsız siteyi tek panelden yöneten bulut tabanlı içerik platformu. ',
    subtitle_bold:
      'Yapılandırma yok, sunucu yönetimi yok, eklenti çakışması yok',
    subtitle_tail: ' — sadece içerik üretin.',
    cta_text: 'Ücretsiz başla',
    cta_url: '#pricing',
    secondary_cta_text: 'Demo izle',
    secondary_cta_url: '#features',
    note: 'Kredi kartı gerekmez',
    stats: [
      { value: '~30ms', label: 'Yanıt süresi' },
      { value: '99.99%', label: 'Çalışma süresi' },
      { value: '∞', label: 'Site sayısı' },
      { value: '300+', label: 'Edge konumu' },
    ],
  },
  marquee: {
    items: [
      'Sınırsız çoklu site',
      'Yerleşik AI asistanı',
      'AMP otomatik',
      'FTS arama dahili',
      'Eklenti sandbox',
      'Çift editör',
      'SEO analizci',
      'Çoklu dil',
      '2FA + RBAC',
      "WordPress'ten göç",
      'Server-side analytics',
      'Otomatik yedekleme',
    ],
  },
  architecture: {
    section_label: '[ 01 ] Performans',
    title_lead: 'Kullanıcınıza ',
    title_highlight: 'en yakın noktadan',
    title_tail: ' servis.',
    body_lead:
      "Sayfa, kullanıcının coğrafi olarak en yakın olduğu sunucudan üretilir. Tek sunuculu klasik CMS'lerde 800ms süren bir istek, Worker CMS'de ",
    body_bold: '30 milisaniyede',
    body_tail:
      ' tamamlanır. Origin sunucusu yok, soğuk başlatma yok, ölçeklenme bekleme yok.',
    bullets: [
      'Domain başına izole edilmiş içerik ve kullanıcılar',
      'Yerleşik edge cache, içerik değişiminde otomatik temizlenir',
      'Sayfa görüntüleme kayıtları yanıtı geciktirmez (arka plan)',
      'Streaming HTML — ilk byte 50ms altında',
    ],
    diagram_label: '↳ Origin yok · Tek istek · ~30ms p50',
    live_label: 'canlı',
  },
  features: {
    section_label: '[ 02 ] Özellikler',
    title_lead: "Bir CMS'den bekleyeceğiniz her şey, ",
    title_highlight: 'artısı',
    title_tail: '.',
    side_note:
      "Tek hesapla sınırsız siteyi yönetin. Her birinin kendi domain'i, içeriği, ekibi ve diliyle.",
    items: [
      {
        num: '01',
        title: 'Sınırsız Çoklu Site',
        desc: "Tek hesap, sınırsız bağımsız site. Her sitenin kendi domain'i, içeriği, ekibi ve diliyle. Tek panelden hepsini yönetin.",
        footer: '● blog.com · ● shop.io · ● docs.dev',
      },
      {
        num: '02',
        title: 'Çift Editör + SEO',
        desc: 'Zengin metin editörü ve blok editör yan yana. Yazı bazında meta yönetimi, OpenGraph, dahili SEO analizci ve otomatik revizyon geçmişi.',
        footer: 'WYSIWYG · Blok editör · Revizyon',
      },
      {
        num: '03',
        title: 'Eklenti Sandbox',
        desc: "Hook tabanlı eklenti sistemi. Her eklenti izin listesiyle çalışır, izinsiz işlem otomatik engellenir. WordPress'in eklenti çakışmaları artık tarihte.",
        footer: 'izin tabanlı · izole çalışma · hata yalıtımı',
      },
      {
        num: '04',
        title: 'AMP Otomatik',
        desc: "Mobilde Google'ın hızlandırılmış sayfa formatı bir tıkla aktif. <img> → <amp-img> dönüşümü, AMP analytics, özel domain.",
        footer: 'Mobil hız puanı 100 · arama görünürlüğü +',
      },
      {
        num: '05',
        title: 'Yerleşik Tam Metin Arama',
        desc: "Site içi arama dahili. BM25 sıralama: başlık 10x, özet 5x, içerik 1x ağırlıklı. Algolia'ya, Elasticsearch'e ihtiyaç yok.",
        footer: 'Milisaniye altı yanıt · çoklu dil',
      },
      {
        num: '06',
        title: 'Akıllı Edge Cache',
        desc: "Sık ziyaret edilen sayfalar otomatik önbelleğe alınır. İçerik güncellendiğinde cache otomatik temizlenir — manuel purge'e veda.",
        footer: '~30ms · cache hit',
      },
    ],
    mini: [
      { title: 'Kurumsal güvenlik', desc: '2FA, RBAC, API anahtarları' },
      { title: 'Server-side analytics', desc: 'Bot filtreleme, ülke algılama' },
      { title: 'Çoklu dil', desc: 'Çeviri grupları, dil rotaları' },
      { title: 'WordPress göçü', desc: 'WXR import, tek tıkla aktarım' },
    ],
  },
  mcp: {
    section_label: '[ 03 ] AI Entegrasyonu',
    title_lead: "CMS'inizi AI'ya ",
    title_highlight: 'teslim edin',
    title_tail: '.',
    body_lead:
      'Worker CMS, yapay zeka asistanlarıyla yerleşik olarak konuşur. Claude, Cursor veya kendi AI aracınız doğrudan içerik üretir, yorumları moderasyona alır, analytics okur. ',
    body_bold: 'Kopyala-yapıştır iş akışına son.',
    body_tail: '',
    bullets: [
      { value: '20', text: 'hazır araç: yazılar, medya, taksonomi, yorum, analytics' },
      { value: '∞', text: 'tek hesap, tüm sitelerinizde geçerli' },
      { value: '0', text: 'ek lisans, ek araç, ek aylık ücret' },
    ],
    plan_note: 'Tüm planlarda dahil',
    chat_title: 'AI Asistanı · workercms',
    chat_status: 'bağlı',
    chat_user_label: 'SİZ',
    chat_user_message: "Site 1'de bekleyen yorumları onayla, sonra son 5 yazıyı listele.",
    chat_assistant_label: 'ASİSTAN',
    chat_steps: [
      'Bekleyen yorumları al → 3 sonuç',
      '3 yorumu onayla → başarılı',
      'Son 5 yazıyı getir → 5 sonuç',
    ],
    chat_response_lead: '3 yorum onaylandı. İşte son 5 yazı: ',
    chat_response_quoted: '"Edge\'de yayıncılık", "AI ile içerik akışı", ...',
    compat_label: 'Uyumlu',
    compat_items: ['Claude', 'Cursor', 'ChatGPT'],
    compat_extra: '+ standart protokol',
  },
  plugins: {
    section_label: '[ 04 ] Genişletme',
    title_lead: 'Eklentiler ve ',
    title_highlight: 'kısa kodlar',
    title_tail: '.',
    body:
      "Kutudan çıkan dahili eklentiler işin %80'ini halleder. Kısa kodlar her yazıya bir satırla galeri, slider, form, son yazı listesi yerleştirir.",
    builtin_heading: 'Dahili eklentiler',
    builtin: [
      {
        name: 'SEO Optimizer',
        status: 'aktif',
        description:
          'Otomatik meta açıklama, başlık uyarıları, okuma süresi rozeti, OpenGraph etiketleri.',
      },
      {
        name: 'Sosyal Paylaşım',
        status: 'aktif',
        description:
          '9 platforma stillenmiş paylaşım butonları. Yazı altına otomatik eklenir.',
      },
      {
        name: 'İletişim Formu',
        status: 'opsiyonel',
        description:
          'reCAPTCHA korumalı form. Mesajlar admin paneline düşer, e-posta bildirimi gönderilir.',
      },
      {
        name: 'Hero Slider',
        status: 'opsiyonel',
        description: 'Otomatik oynatma, dokunmatik kaydırma, palet uyumlu stil.',
      },
    ],
    shortcodes_heading: '14+ kısa kod',
    shortcodes: [
      { code: '[slider]', label: 'görsel karusel' },
      { code: '[galeri]', label: 'medya ızgarası' },
      { code: '[son-yazilar]', label: 'son n yazı' },
      { code: '[iletisim-formu]', label: 'korumalı form' },
      { code: '[sosyal-medya]', label: '9 platform' },
      { code: '[arama-formu]', label: 'site içi arama' },
      { code: '[menu]', label: 'navigasyon' },
      { code: '[ozel-html]', label: 'raw HTML' },
    ],
    shortcodes_extra: 'video, kategori, widget, ayırıcı, boşluk, yazı',
  },
  pricing: {
    section_label: '[ 05 ] Fiyatlandırma',
    title_lead: 'Bir fiyat. ',
    title_highlight: 'Sürpriz yok.',
    subtitle:
      'Tüm planlarda AI asistanı, edge cache, eklenti sandbox ve sınırsız sayfa görüntüleme dahil.',
    plans: [
      {
        name: 'Starter',
        desc: 'Kişisel projeler için',
        price: 'Ücretsiz',
        features: [
          '1 site, 1 domain',
          '2 ekip üyesi',
          '5 GB medya depolama',
          'AI asistanı (aylık 100 işlem)',
          'Tüm dahili eklentiler',
        ],
        cta_text: 'Hemen başla',
        cta_url: '/admin/register',
        highlighted: false,
      },
      {
        name: 'Pro',
        desc: 'Yayıncılar ve küçük ekipler',
        currency: '$',
        price: '29',
        period: '/ ay',
        features: [
          '10 site, sınırsız domain',
          'Sınırsız ekip üyesi',
          '100 GB medya depolama',
          'AI asistanı (sınırsız)',
          'WordPress göç asistanı',
          'Öncelikli destek',
        ],
        cta_text: "Pro'ya geç",
        cta_url: '/admin/register',
        highlighted: true,
      },
      {
        name: 'Enterprise',
        desc: 'Ajanslar ve kurumlar',
        price: 'Özel',
        features: [
          'Sınırsız site',
          'SSO + SAML',
          'SLA garantisi (%99.99)',
          'Özel eklenti geliştirme',
          'Atanmış müşteri yöneticisi',
        ],
        cta_text: 'Bizimle görüşün',
        cta_url: '/iletisim',
        highlighted: false,
      },
    ],
    final_title: 'Birkaç dakikada yayında.',
    final_subtitle: 'İlk sitenizi 60 saniyede oluşturun. Kredi kartı gerekmez.',
    final_cta_text: 'Ücretsiz hesap oluştur',
    final_cta_url: '/admin/register',
  },
  footer: {
    description:
      "Edge'de çalışan, çoklu site destekli modern içerik yönetim platformu. WordPress'in özgürlüğü, modern yazılımın hızıyla.",
    columns: [
      {
        heading: 'Ürün',
        links: [
          { text: 'Özellikler', url: '#features' },
          { text: 'Performans', url: '#architecture' },
          { text: 'AI Entegrasyonu', url: '#mcp' },
          { text: 'Eklentiler', url: '#plugins' },
          { text: 'Fiyatlandırma', url: '#pricing' },
        ],
      },
      {
        heading: 'Şirket',
        links: [
          { text: 'Hakkımızda', url: '#' },
          { text: 'Blog', url: '#' },
          { text: 'Kariyer', url: '#' },
          { text: 'İletişim', url: '#' },
        ],
      },
      {
        heading: 'Yasal',
        links: [
          { text: 'Gizlilik', url: '#' },
          { text: 'Kullanım koşulları', url: '#' },
          { text: 'KVKK', url: '#' },
          { text: 'Durum', url: '#' },
        ],
      },
    ],
    copyright: '© 2026 Worker CMS',
    side_text: 'Edge-native · Sınırsız ölçek',
  },
};

/**
 * Deep-merge a partial config over the defaults.
 *
 * - Objects are merged recursively (so an admin can override just one
 *   field of a section).
 * - Arrays are replaced wholesale (because partial array merges produce
 *   confusing results — admin always sends the full array of items).
 * - `undefined` and `null` values fall back to the default.
 */
export function resolveLandingConfig(
  partial: LandingConfig | null | undefined
): ResolvedLandingConfig {
  return mergeDeep(LANDING_DEFAULTS, partial) as ResolvedLandingConfig;
}

function mergeDeep(defaults: any, override: any): any {
  if (override === undefined || override === null) return defaults;
  if (Array.isArray(defaults) || Array.isArray(override)) {
    // Caller-provided arrays replace defaults entirely.
    return Array.isArray(override) ? override : defaults;
  }
  if (typeof defaults !== 'object' || typeof override !== 'object') {
    return override;
  }
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(override)) {
    out[key] = mergeDeep((defaults as Record<string, unknown>)[key], (override as Record<string, unknown>)[key]);
  }
  return out;
}
