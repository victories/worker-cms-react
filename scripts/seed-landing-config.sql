-- Worker CMS Landing v2 — seed for global_settings.landing_config.
--
-- Mirrors the Turkish copy of the "Worker CMS Landing v2.html" mock at
-- the repo root and the React port in src/ssr/pages/Landing.tsx.
-- Pricing plans are intentionally a tiny default set; production sites
-- override them by populating the `packages` table (the landing route
-- merges those rows in at request time — see merge logic in
-- src/routes/public/landing.ts).
--
-- Words wrapped in `{}` braces are rendered as amber italic accents by
-- the `withAccent()` helper. Example: "{en yakın noktadan}" renders
-- inside an <em class="text-amber-400 not-italic">.
--
-- Idempotent: INSERT OR REPLACE — safe to re-run.
INSERT OR REPLACE INTO global_settings (key, value) VALUES (
  'landing_config',
  '{
    "enabled": true,
    "brand": {
      "name": "Worker CMS",
      "tagline": "Edge''de çalışan modern içerik platformu"
    },

    "colors": {
      "primary": "#F5A524",
      "accent": "#E89312",
      "bg_dark": "#0A0A0B",
      "bg_light": "#FAFAF7",
      "text_light": "#E2E2E5",
      "text_dark": "#0A0A0B"
    },

    "hero": {
      "badge": "Edge-native CMS · 300+ konum · ~30ms p50",
      "title": "WordPress''in özgürlüğü, {saniyenin onda biri} hızında.",
      "subtitle": "Worker CMS, sınırsız siteyi tek panelden yöneten bulut tabanlı içerik platformu. Yapılandırma yok, sunucu yönetimi yok, eklenti çakışması yok — sadece içerik üretin.",
      "cta_text": "Ücretsiz başla",
      "cta_url": "#pricing",
      "secondary_cta_text": "Demo izle",
      "secondary_cta_url": "#features",
      "stats": [
        { "value": "~30{ms}",  "label": "Yanıt süresi" },
        { "value": "99.99{%}", "label": "Çalışma süresi" },
        { "value": "∞",         "label": "Site sayısı" },
        { "value": "300{+}",   "label": "Edge konumu" }
      ]
    },

    "marquee": {
      "items": [
        "Sınırsız çoklu site",
        "Yerleşik AI asistanı",
        "AMP otomatik",
        "FTS arama dahili",
        "Eklenti sandbox",
        "Çift editör",
        "SEO analizci",
        "Çoklu dil",
        "2FA + RBAC",
        "WordPress''ten göç",
        "Server-side analytics",
        "Otomatik yedekleme"
      ]
    },

    "architecture": {
      "eyebrow": "[ 01 ] Performans",
      "title": "Kullanıcınıza {en yakın noktadan} servis.",
      "intro": "Sayfa, kullanıcının coğrafi olarak en yakın olduğu sunucudan üretilir. Tek sunuculu klasik CMS''lerde 800ms süren bir istek, Worker CMS''de 30 milisaniyede tamamlanır. Origin sunucusu yok, soğuk başlatma yok, ölçeklenme bekleme yok.",
      "bullets": [
        { "text": "Domain başına izole edilmiş içerik ve kullanıcılar" },
        { "text": "Yerleşik edge cache, içerik değişiminde otomatik temizlenir" },
        { "text": "Sayfa görüntüleme kayıtları yanıtı geciktirmez (arka plan)" },
        { "text": "Streaming HTML — ilk byte 50ms altında" }
      ]
    },

    "features": {
      "eyebrow": "[ 02 ] Özellikler",
      "title": "Bir CMS''den bekleyeceğiniz her şey, {artısı}.",
      "subtitle": "Tek hesapla sınırsız siteyi yönetin. Her birinin kendi domain''i, içeriği, ekibi ve diliyle.",
      "items": [
        { "icon": "grid",     "title": "Sınırsız Çoklu Site",        "desc": "Tek hesap, sınırsız bağımsız site. Her sitenin kendi domain''i, içeriği, ekibi ve diliyle. Tek panelden hepsini yönetin." },
        { "icon": "pencil",   "title": "Çift Editör + SEO",          "desc": "Zengin metin editörü ve blok editör yan yana. Yazı bazında meta yönetimi, OpenGraph, dahili SEO analizci ve otomatik revizyon geçmişi." },
        { "icon": "package",  "title": "Eklenti Sandbox",            "desc": "Hook tabanlı eklenti sistemi. Her eklenti izin listesiyle çalışır, izinsiz işlem otomatik engellenir. WordPress''in eklenti çakışmaları artık tarihte." },
        { "icon": "bolt",     "title": "AMP Otomatik",               "desc": "Mobilde Google''ın hızlandırılmış sayfa formatı bir tıkla aktif. <img> → <amp-img> dönüşümü, AMP analytics, özel domain." },
        { "icon": "search",   "title": "Yerleşik Tam Metin Arama",    "desc": "Site içi arama dahili. BM25 sıralama: başlık 10x, özet 5x, içerik 1x ağırlıklı. Algolia''ya, Elasticsearch''e ihtiyaç yok." },
        { "icon": "activity", "title": "Akıllı Edge Cache",          "desc": "Sık ziyaret edilen sayfalar otomatik önbelleğe alınır. İçerik güncellendiğinde cache otomatik temizlenir — manuel purge''e veda." }
      ]
    },

    "mcp": {
      "eyebrow": "[ 03 ] AI Entegrasyonu",
      "title": "CMS''inizi AI''ya {teslim edin}.",
      "intro": "Worker CMS, yapay zeka asistanlarıyla yerleşik olarak konuşur. Claude, Cursor veya kendi AI aracınız doğrudan içerik üretir, yorumları moderasyona alır, analytics okur. Kopyala-yapıştır iş akışına son.",
      "stats": [
        { "value": "20", "text": "hazır araç: yazılar, medya, taksonomi, yorum, analytics" },
        { "value": "∞",  "text": "tek hesap, tüm sitelerinizde geçerli" },
        { "value": "0",  "text": "ek lisans, ek araç, ek aylık ücret" }
      ]
    },

    "plugins": {
      "eyebrow": "[ 04 ] Genişletme",
      "title": "Eklentiler ve {kısa kodlar}.",
      "intro": "Kutudan çıkan dahili eklentiler işin %80''ini halleder. Kısa kodlar her yazıya bir satırla galeri, slider, form, son yazı listesi yerleştirir.",
      "items": [
        { "icon": "compass", "title": "SEO Optimizer",    "status": "aktif",     "desc": "Otomatik meta açıklama, başlık uyarıları, okuma süresi rozeti, OpenGraph etiketleri." },
        { "icon": "share",   "title": "Sosyal Paylaşım",  "status": "aktif",     "desc": "9 platforma stillenmiş paylaşım butonları. Yazı altına otomatik eklenir." },
        { "icon": "mail",    "title": "İletişim Formu",   "status": "opsiyonel", "desc": "reCAPTCHA korumalı form. Mesajlar admin paneline düşer, e-posta bildirimi gönderilir." },
        { "icon": "video",   "title": "Hero Slider",      "status": "opsiyonel", "desc": "Otomatik oynatma, dokunmatik kaydırma, palet uyumlu stil." }
      ],
      "shortcodes": [
        { "code": "[slider]",          "desc": "görsel karusel" },
        { "code": "[galeri]",          "desc": "medya ızgarası" },
        { "code": "[son-yazilar]",     "desc": "son n yazı" },
        { "code": "[iletisim-formu]",  "desc": "korumalı form" },
        { "code": "[sosyal-medya]",    "desc": "9 platform" },
        { "code": "[arama-formu]",     "desc": "site içi arama" },
        { "code": "[menu]",            "desc": "navigasyon" },
        { "code": "[ozel-html]",       "desc": "raw HTML" }
      ]
    },

    "pricing": {
      "eyebrow": "[ 05 ] Fiyatlandırma",
      "title": "Bir fiyat. {Sürpriz yok.}",
      "subtitle": "Tüm planlarda AI asistanı, edge cache, eklenti sandbox ve sınırsız sayfa görüntüleme dahil.",
      "plans": [
        {
          "name": "Starter",
          "desc": "Kişisel projeler için",
          "currency": "",
          "price": "Ücretsiz",
          "period": "",
          "features": [
            "1 site, 1 domain",
            "2 ekip üyesi",
            "5 GB medya depolama",
            "AI asistanı (aylık 100 işlem)",
            "Tüm dahili eklentiler"
          ],
          "cta_text": "Hemen başla",
          "cta_url": "/admin/register",
          "highlighted": false
        },
        {
          "name": "Pro",
          "desc": "Yayıncılar ve küçük ekipler",
          "currency": "$",
          "price": "29",
          "period": "/ ay",
          "features": [
            "10 site, sınırsız domain",
            "Sınırsız ekip üyesi",
            "100 GB medya depolama",
            "AI asistanı (sınırsız)",
            "WordPress göç asistanı",
            "Öncelikli destek"
          ],
          "cta_text": "Pro''ya geç",
          "cta_url": "/admin/register",
          "highlighted": true
        },
        {
          "name": "Enterprise",
          "desc": "Ajanslar ve kurumlar",
          "currency": "",
          "price": "",
          "period": "",
          "features": [
            "Sınırsız site",
            "SSO + SAML",
            "SLA garantisi (%99.99)",
            "Özel eklenti geliştirme",
            "Atanmış müşteri yöneticisi"
          ],
          "cta_text": "Bizimle görüşün",
          "cta_url": "/iletisim",
          "highlighted": false,
          "isEnterprise": true
        }
      ]
    },

    "cta": {
      "title": "Birkaç dakikada yayında.",
      "subtitle": "İlk sitenizi 60 saniyede oluşturun. Kredi kartı gerekmez.",
      "button_text": "Ücretsiz hesap oluştur",
      "button_url": "/admin/register"
    },

    "footer": {
      "description": "Edge''de çalışan, çoklu site destekli modern içerik yönetim platformu. WordPress''in özgürlüğü, modern yazılımın hızıyla.",
      "text": "© 2026 Worker CMS",
      "columns": [
        {
          "title": "Ürün",
          "links": [
            { "text": "Özellikler",        "url": "#features" },
            { "text": "Performans",        "url": "#architecture" },
            { "text": "AI Entegrasyonu",   "url": "#mcp" },
            { "text": "Eklentiler",        "url": "#plugins" },
            { "text": "Fiyatlandırma",     "url": "#pricing" }
          ]
        },
        {
          "title": "Şirket",
          "links": [
            { "text": "Hakkımızda", "url": "/hakkimizda" },
            { "text": "Blog",        "url": "/blog" },
            { "text": "Kariyer",     "url": "/kariyer" },
            { "text": "İletişim",    "url": "/iletisim" }
          ]
        },
        {
          "title": "Yasal",
          "links": [
            { "text": "Gizlilik",            "url": "/gizlilik" },
            { "text": "Kullanım koşulları",  "url": "/sartlar" },
            { "text": "KVKK",                 "url": "/kvkk" },
            { "text": "Durum",                "url": "https://status.example.com" }
          ]
        }
      ]
    }
  }'
);
