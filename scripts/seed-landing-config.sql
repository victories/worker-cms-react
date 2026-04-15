-- One-off seed for Faz 3 /landing smoke test.
-- Inserts a realistic landing_config JSON into global_settings so
-- `npm run dev` can render the route without admin panel access.
-- Safe to run multiple times (INSERT OR REPLACE).
INSERT OR REPLACE INTO global_settings (key, value) VALUES (
  'landing_config',
  '{
    "enabled": true,
    "brand": { "name": "WorkerCms", "tagline": "Kenar tabanlı yayıncılık" },
    "hero": {
      "badge": "Faz 3 React SSR",
      "title": "Senin CMS''in,\ndünyanın her yerinde hızlı.",
      "subtitle": "Cloudflare Workers üzerinde çalışan tam React 19 SSR deneyimi. Yüz milisaniyelik TTFB, sıfır soğuk başlangıç.",
      "cta_text": "Ücretsiz Başla",
      "cta_url": "/admin/register",
      "secondary_cta_text": "Canlı Demo",
      "secondary_cta_url": "#features",
      "stats": [
        { "value": "50 ms", "label": "Ortalama TTFB" },
        { "value": "300+", "label": "Kenar konum" },
        { "value": "99.99%", "label": "SLA" },
        { "value": "0 ms", "label": "Soğuk başlangıç" }
      ]
    },
    "features": {
      "title": "Geleneksel CMS''lerin yapamadığı",
      "subtitle": "Cloudflare altyapısı üzerine kurulu, sıfır sunucu yöneten bir yayıncılık motoru.",
      "items": [
        { "icon": "zap", "title": "Kenar hızı", "desc": "D1 + KV önbellek ile her istek kullanıcıya en yakın noktadan cevaplanır." },
        { "icon": "layers", "title": "Modüler içerik", "desc": "Block tabanlı editör, çok dilli içerik, tam REST API." },
        { "icon": "bot", "title": "AI asistan", "desc": "Yerleşik içerik üretimi, SEO özetleri ve görsel otomasyonu." },
        { "icon": "globe", "title": "Çok site", "desc": "Tek worker, sınırsız alan adı. Otomatik SSL, otomatik rotalama." },
        { "icon": "shield", "title": "Güvenli", "desc": "2FA, WAF entegrasyonu, otomatik spam filtreleme." },
        { "icon": "code", "title": "Geliştirici dostu", "desc": "Shortcode, plugin API, webhook''lar, tam TypeScript tipleme." }
      ]
    },
    "pricing": {
      "title": "Fiyatlandırma",
      "subtitle": "İhtiyacınıza uygun planı seçin",
      "plans": [
        {
          "name": "Başlangıç",
          "desc": "Kişisel blog veya küçük yayıncılar için.",
          "currency": "$",
          "price": "9",
          "period": "/ay",
          "features": ["1 site", "10 GB medya", "Temel AI", "Topluluk desteği"],
          "cta_text": "Başla",
          "cta_url": "/admin/register"
        },
        {
          "name": "Profesyonel",
          "desc": "Büyüyen yayıncılar için en popüler plan.",
          "currency": "$",
          "price": "29",
          "period": "/ay",
          "features": ["5 site", "100 GB medya", "Gelişmiş AI", "Öncelikli destek", "Özel domain"],
          "cta_text": "Profesyonele Geç",
          "cta_url": "/admin/register",
          "highlighted": true
        },
        {
          "name": "Takım",
          "desc": "Çoklu editör ekipleri için.",
          "currency": "$",
          "price": "79",
          "period": "/ay",
          "features": ["25 site", "1 TB medya", "Gelişmiş roller", "SSO", "Günlük yedek"],
          "cta_text": "Takım Planı",
          "cta_url": "/admin/register"
        },
        {
          "name": "Kurumsal",
          "desc": "Daha fazlasına mı ihtiyacınız var? Size özel çözüm sunalım.",
          "features": ["Özel altyapı", "Öncelikli destek", "SLA garantisi", "Özel entegrasyonlar"],
          "cta_text": "Bizimle İletişime Geçin",
          "cta_url": "/iletisim",
          "isEnterprise": true
        }
      ]
    },
    "testimonials": {
      "title": "Kullanıcı sesleri",
      "items": [
        { "text": "Migrasyon sonrası sayfa yüklemeleri 1.2 saniyeden 180 ms''ye düştü. Kullanıcılar farkı ilk gün farketti.", "author": "Ayşe Yıldız", "role": "CTO, Gazete X" },
        { "text": "Admin panelinin hızı ayrı güzel, ama asıl beni etkileyen editör içindeki AI özet akışı.", "author": "Mehmet Kaya", "role": "Yazı işleri müdürü" },
        { "text": "300 blogluk bir networkü tek worker üzerinden yönetiyoruz. Ops ekibim tatilde.", "author": "Selin Demir", "role": "Kurucu, Yayın Ağı" }
      ]
    },
    "cta": {
      "title": "Bugün taşınmaya başla.",
      "subtitle": "WordPress''ten, Ghost''tan, Hugo''dan. Otomatik import araçları hazır.",
      "button_text": "Hesap Aç",
      "button_url": "/admin/register"
    },
    "footer": {
      "text": "© 2026 WorkerCms. Tüm hakları saklıdır.",
      "links": [
        { "text": "Gizlilik", "url": "/gizlilik" },
        { "text": "Şartlar", "url": "/sartlar" },
        { "text": "Durum", "url": "https://status.example.com" }
      ]
    }
  }'
);
