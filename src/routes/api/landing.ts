import { Hono } from 'hono';
import type { Bindings, Variables } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';

const landing = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Default landing config
const DEFAULT_CONFIG = JSON.stringify({
  enabled: true,
  brand: {
    name: 'WP-CMS',
    logo_url: '',
    tagline: 'Next-Gen Content Platform',
  },
  colors: {
    primary: '#2563eb',
    accent: '#dc2626',
    bg_dark: '#09090b',
    bg_light: '#fafafa',
    text_light: '#f4f4f5',
    text_dark: '#18181b',
  },
  hero: {
    badge: 'Cloudflare Workers Üzerinde Çalışır',
    title: 'İçerik Yönetiminin\nGeleceği Burada.',
    subtitle: 'Sınırsız hız, sınırsız ölçek. Yapay zeka destekli, 5 farklı editör, çoklu site yönetimi — tek platformda.',
    cta_text: 'Hemen Başla',
    cta_url: '/admin/register',
    secondary_cta_text: 'Fiyatları Gör',
    secondary_cta_url: '#pricing',
    stats: [
      { value: '50ms', label: 'Ortalama Yanıt' },
      { value: '99.9%', label: 'Uptime' },
      { value: '300+', label: 'Edge Lokasyon' },
      { value: '∞', label: 'Ölçeklenebilirlik' },
    ],
  },
  features: {
    title: 'Neden WP-CMS?',
    subtitle: 'Modern web için tasarlanmış, geleneksel CMS\'lerin ötesinde.',
    items: [
      { icon: 'zap', title: 'Işık Hızında', desc: 'Cloudflare Workers edge runtime ile dünya çapında 50ms altı yanıt süresi.' },
      { icon: 'layers', title: '5 Farklı Editör', desc: 'Classic, BlockNote, Tiptap, Plate.js ve TinyMCE — herkes için ideal editör.' },
      { icon: 'globe', title: 'Çoklu Site', desc: 'Tek kurulumdan sınırsız site yönetin. Her site kendi domaini, teması ve ayarları.' },
      { icon: 'bot', title: 'AI İçerik Asistanı', desc: 'Yapay zeka ile içerik üretin, özetleyin, SEO optimize edin — doğrudan editör içinden.' },
      { icon: 'shield', title: 'Güvenlik', desc: '2FA, API anahtarları, rol tabanlı erişim ve otomatik yedekleme.' },
      { icon: 'code', title: 'Geliştirici Dostu', desc: 'REST API, shortcode sistemi, plugin altyapısı, webhook desteği.' },
    ],
  },
  pricing: {
    title: 'Planlar & Fiyatlandırma',
    subtitle: 'Her ölçekte işletme için uygun plan.',
    plans: [
      {
        name: 'Starter',
        price: '0',
        currency: '₺',
        period: '/ay',
        desc: 'Kişisel blog ve küçük projeler için.',
        features: ['1 Site', '1 GB Depolama', '10.000 Sayfa Görüntüleme', 'Topluluk Desteği', '5 Editör Seçeneği'],
        cta_text: 'Ücretsiz Başla',
        cta_url: '/admin/register?plan=starter',
        highlighted: false,
      },
      {
        name: 'Pro',
        price: '199',
        currency: '₺',
        period: '/ay',
        desc: 'Büyüyen işletmeler ve profesyoneller için.',
        features: ['10 Site', '25 GB Depolama', 'Sınırsız Görüntüleme', 'Öncelikli Destek', 'AI İçerik Asistanı', 'Özel Domain', 'Otomatik Yedekleme'],
        cta_text: 'Pro\'ya Geç',
        cta_url: '/admin/register?plan=pro',
        highlighted: true,
      },
      {
        name: 'Enterprise',
        price: 'Özel',
        currency: '',
        period: '',
        desc: 'Büyük organizasyonlar ve ajanslar için.',
        features: ['Sınırsız Site', 'Sınırsız Depolama', 'Sınırsız Görüntüleme', '7/24 Destek', 'SLA Garantisi', 'Özel Entegrasyonlar', 'Beyaz Etiket'],
        cta_text: 'İletişime Geç',
        cta_url: 'mailto:info@example.com',
        highlighted: false,
      },
    ],
  },
  testimonials: {
    title: 'Kullanıcılarımız Ne Diyor?',
    items: [
      { text: 'WordPress\'ten geçiş sürecimiz inanılmaz kolay oldu. Hız farkı gece gündüz gibi.', author: 'Ahmet Yılmaz', role: 'Tech Lead, DigiCorp', avatar: '' },
      { text: 'AI içerik asistanı ekibimizin verimliliğini %40 artırdı. Tek kelimeyle mükemmel.', author: 'Elif Kaya', role: 'İçerik Müdürü, MediaHub', avatar: '' },
      { text: 'Çoklu site yönetimi ile 50+ müşterimizin sitesini tek panelden yönetiyoruz.', author: 'Can Demir', role: 'Kurucu, WebAjans', avatar: '' },
    ],
  },
  cta: {
    title: 'Hemen Başlamaya Hazır mısınız?',
    subtitle: 'Kredi kartı gerekmez. 14 gün ücretsiz deneyin.',
    button_text: 'Ücretsiz Hesap Oluştur',
    button_url: '/admin/register',
  },
  footer: {
    text: '© 2026 WP-CMS. Tüm hakları saklıdır.',
    links: [
      { text: 'Gizlilik', url: '#' },
      { text: 'Kullanım Koşulları', url: '#' },
      { text: 'İletişim', url: 'mailto:info@example.com' },
    ],
  },
});

// GET /api/landing — public (no auth) — returns landing config
landing.get('/', async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT value FROM global_settings WHERE key = 'landing_config'"
  ).first<{ value: string }>();

  const config = result?.value || DEFAULT_CONFIG;
  return c.json({ success: true, data: JSON.parse(config) });
});

// PUT /api/landing — requires super_admin — update landing config
landing.put('/', authMiddleware, requireRole('super_admin'), async (c) => {
  const body = await c.req.json();
  const configStr = JSON.stringify(body);

  await c.env.DB.prepare(
    "INSERT INTO global_settings (key, value) VALUES ('landing_config', ?) ON CONFLICT(key) DO UPDATE SET value = ?"
  ).bind(configStr, configStr).run();

  return c.json({ success: true, data: body });
});

// GET /api/landing/default — returns default config for reset
landing.get('/default', authMiddleware, requireRole('super_admin'), async (c) => {
  return c.json({ success: true, data: JSON.parse(DEFAULT_CONFIG) });
});

export default landing;
