-- Landing config seed (agency + migration narrative). Safe to re-run.
INSERT OR REPLACE INTO global_settings (key, value) VALUES (
  'landing_config',
  '{
    "enabled": true,
    "brand": { "name": "WorkerCms", "tagline": "Edge-native publishing platform" },
    "labels": {
      "nav": { "features": "Özellikler", "pricing": "Fiyatlar", "faq": "SSS",
               "login": "Giriş", "cta": "Sitemi Taşı" },
      "pricing": { "popular_badge": "Popüler", "per_month_suffix": "/ay" },
      "common": { "learn_more": "Detaylar", "get_started": "Başla" }
    },
    "hero": {
      "badge": "WP & Ghost migrasyon — 5 dakikada",
      "title": "Ajansınızın tüm müşteri sitelerini\ntek panelden yönetin.",
      "subtitle": "Cloudflare edge''inde çalışan multi-site CMS. WordPress XML''inizi yükleyin, biz URL''leri eşleyelim, siz yayınlayın. White-label admin, %63 düşük maliyet, 300+ kenar konumdan servis.",
      "cta_text": "Sitemi Taşı",
      "cta_url": "/admin/register",
      "secondary_cta_text": "Ücretsiz Hesap Aç",
      "secondary_cta_url": "/admin/register",
      "stats": [
        { "value": "5 dk", "label": "Migrasyon süresi" },
        { "value": "50 ms", "label": "Ortalama TTFB" },
        { "value": "300+", "label": "Kenar konum" },
        { "value": "%63", "label": "Maliyet tasarrufu" }
      ]
    },
    "migration": {
      "title": "WP''den 5 dakikada",
      "subtitle": "Tek bir XML/SQL dosyası yeter. Biz redirectleri ve medyayı otomatik eşleriz.",
      "steps": [
        { "icon": "upload", "label": "01 — Yükle", "desc": "WP export XML ya da SQL dosyanızı sürükleyip bırakın. Tüm post''lar, sayfa''lar, medya, kategori, etiket dahil." },
        { "icon": "linkSwap", "label": "02 — Eşle", "desc": "Eski URL''leriniz otomatik 301 redirect olarak eşlenir. SEO sıralamanız bozulmaz, Search Console farketmez." },
        { "icon": "rocket", "label": "03 — Yayınla", "desc": "DNS''i çevirin, anlık olarak Cloudflare edge''inden servis başlar. Eski hosting''i bir hafta sonra kapatabilirsiniz." }
      ]
    },
    "features": {
      "title": "Geleneksel CMS''lerin yapamadığı",
      "subtitle": "Cloudflare altyapısı üzerine kurulu, sıfır sunucu yöneten bir yayıncılık motoru.",
      "items": [
        { "icon": "upload", "title": "One-click WP import", "desc": "XML/SQL upload, otomatik medya eşleme, 301 redirect haritası — 5 dakikada taşıma." },
        { "icon": "layers", "title": "Multi-site, tek panel", "desc": "Sınırsız müşteri sitesi, izole D1 + R2 alanı, tek admin login. Ajans için tasarlandı." },
        { "icon": "zap", "title": "Edge performans", "desc": "50ms ortalama TTFB, 300+ Cloudflare PoP, sıfır soğuk başlangıç. Ölçtük." },
        { "icon": "sparkles", "title": "AI içerik asistanı", "desc": "Başlık, özet, SEO meta, kapak görseli üretimi — block editör içinde." },
        { "icon": "shield", "title": "Otomatik backup + 99.99% SLA", "desc": "Günlük yedek, point-in-time restore, sözleşmeli SLA. Ops ekibinize tatil." },
        { "icon": "code", "title": "Maliyet kıyası", "desc": "WP hosting + plugin + backup + CDN ayrı ayrı $X. Bizde tek paket $Y. Aşağıda tablo." }
      ]
    },
    "costCompare": {
      "title": "Aylık maliyet kıyası",
      "subtitle": "5 müşteri sitesi yöneten orta ölçek bir ajans için tipik aylık operasyonel maliyet.",
      "before_label": "Geleneksel WP yığını",
      "after_label": "WorkerCms",
      "rows": [
        { "label": "Hosting (5 site)",      "before": "$95",  "after": "$0"   },
        { "label": "Yedek + monitoring",   "before": "$45",  "after": "Dahil" },
        { "label": "Plugin lisansları",    "before": "$60",  "after": "Dahil" },
        { "label": "CDN + medya",          "before": "$30",  "after": "Dahil" },
        { "label": "Yönetim saatleri (5h)","before": "$220", "after": "$0"   },
        { "label": "Toplam",               "before": "$450", "after": "$165", "saving": "%63 tasarruf" }
      ],
      "footnote": "Plan paketinden bağımsız fix maliyet — Profesyonel plan üzerinden hesaplandı."
    },
    "multisite": {
      "title": "Tek panel, sınırsız müşteri sitesi",
      "subtitle": "Ajansınızın 50 müşterisini tek admin oturumundan yönetin. Beyaz etiket, müşteriye kendi domain''i ve logosu ile teslim.",
      "bullets": [
        "Ortak admin, müşteri-bazlı izolasyon (her site kendi D1 + R2 alanında)",
        "White-label: müşteriye kendi marka logosu/domain''i ile admin paneli sunun",
        "Rol tabanlı erişim: editör, çevirmen, sadece okuma",
        "Toplu güncelleme: 50 sitenin tema/plugin''ini tek tıkla deploy edin"
      ],
      "dashboard": {
        "sites": [
          { "name": "ajansx.com",        "visits": "184 K", "status": "live"  },
          { "name": "musteri-blog.com",  "visits": "92 K",  "status": "live"  },
          { "name": "ecommerce-x.com",   "visits": "47 K",  "status": "live"  },
          { "name": "yeni-launch.com",   "visits": "—",     "status": "draft" },
          { "name": "kampanya-x.com",    "visits": "12 K",  "status": "live"  }
        ]
      }
    },
    "pricing": {
      "title": "Fiyatlandırma",
      "subtitle": "İhtiyacınıza uygun planı seçin. Kurumsal için bizimle konuşun."
    },
    "testimonials": {
      "title": "Kullanıcı sesleri",
      "items": [
        { "text": "12 müşteri sitemizi WP''den taşıdık. Editörler farkı ilk gün farketti — yayın akışı 1.2 sn''den 180 ms''ye düştü.", "author": "Ayşe Yıldız", "role": "CTO, AjansX" },
        { "text": "Beyaz etiket admin paneli sayesinde her müşterimize kendi markasıyla CMS sunabiliyoruz. Satış hikayesi değişti.", "author": "Mehmet Kaya", "role": "Kurucu, Studio K" },
        { "text": "Kişisel blog''umu Ghost''tan taşıdım, 5 dakika sürdü. Aylık hosting + plugin maliyetim 4''te 1''e indi.", "author": "Selin Demir", "role": "Bağımsız yayıncı" }
      ]
    },
    "faq": {
      "title": "Sıkça sorulanlar",
      "subtitle": "Migration yaparken takıldığınız noktaların kısa cevapları.",
      "items": [
        { "q": "Eski URL''lerim bozulur mu?", "a": "Hayır. Migration aracı tüm WP/Ghost slug yapısını otomatik 301 redirect olarak eşler. Search Console pozisyonlarınız bozulmaz." },
        { "q": "WP plugin''lerim çalışır mı?", "a": "Plugin ekosistemi tek-tek port edilmiyor. Ancak en yaygın 30 plugin''in karşılığı (SEO, form, comment, share) yerleşik geliyor — listeyi pricing altında bulabilirsiniz." },
        { "q": "Verilerim nerede tutuluyor?", "a": "Cloudflare D1 (SQLite) + R2 (object storage). KVKK için isterseniz Avrupa region''una sabitleyebiliriz; sözleşmede yazılı." },
        { "q": "SLA garantisi nedir?", "a": "%99.99 uptime — yıllık 52 dakikadan az kesinti. Aşılırsa otomatik kredilendirme. Status sayfası her zaman canlı." },
        { "q": "White-label nasıl çalışıyor?", "a": "Profesyonel plan ve üzeri: kendi domain''inizi (admin.musteri.com) admin''e bağlayın, kendi logonuzu yükleyin. Müşteri ''powered by'' görmez." },
        { "q": "Çıkış kolay mı?", "a": "Evet. Tek tık ile tüm içerikleri WordPress XML, Ghost JSON ya da Markdown olarak indirin. Vendor lock-in yok." }
      ]
    },
    "cta": {
      "title": "Bugün taşımaya başla.",
      "subtitle": "Ücretsiz dene, yayınladığında öde. Migration sırasında destek var.",
      "button_text": "Sitemi Taşı",
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
