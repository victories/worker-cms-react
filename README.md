# Worker CMS

Tamamen **Cloudflare Workers** üzerinde çalışan, çoklu site destekli içerik yönetim sistemi. Sunucu yok, altyapı yok — sadece deploy et ve kullan.

Backend: **Hono** + **D1** + **R2** | Frontend: **React** admin paneli

---

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Özellikler](#özellikler)
- [Mimari](#mimari)
- [Admin Paneli](#admin-paneli)
- [API Uç Noktaları](#api-uç-noktaları)
- [Herkese Açık Site (SSR)](#herkese-açık-site-ssr)
- [AMP Desteği](#amp-desteği)
- [Eklenti Sistemi](#eklenti-sistemi)
- [MCP Sunucusu (AI Entegrasyonu)](#mcp-sunucusu-ai-entegrasyonu)
- [Kısa Kod Motoru](#kısa-kod-motoru)
- [Veritabanı Şeması](#veritabanı-şeması)
- [Kurulum](#kurulum)

---

## Genel Bakış

Worker CMS, tek bir Cloudflare Worker olarak çalışan WordPress ilhamıyla geliştirilmiş bir CMS'dir. Tek bir deploy ile birden fazla bağımsız web sitesi sunar — her biri kendi domain'i, içeriği, ayarları, kullanıcıları ve eklentileriyle.

**Rakamlarla:**
- 30+ veritabanı tablosu, stratejik indeksleme
- 20+ REST API uç noktası
- 7 SSR sayfa tipi + AMP varyantları
- 4 dahili eklenti, 14+ kısa kod renderer'ı
- 8 middleware katmanı (sayfa görüntüleme takibi dahil)
- FTS5 tam metin arama (BM25 sıralama)
- Eklenti sandbox sistemi (izin tabanlı + Workers for Platforms izolasyonu)
- KV edge cache katmanı (isteğe bağlı)
- Zengin metin + blok editörlü tam admin paneli

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Çalışma Ortamı | Cloudflare Workers |
| Framework | Hono v4 (routing/middleware) |
| Veritabanı | Cloudflare D1 (Edge'de SQLite) |
| Dosya Depolama | Cloudflare R2 (S3 uyumlu) |
| **Public Render** | **React 19 SSR (`react-dom/server.edge`) + Tailwind + shadcn/ui** |
| Admin SPA | React 19 + Vite + TypeScript |
| UI Kiti | `packages/ui/` (Radix UI + shadcn/ui + TailwindCSS) — hem admin hem public için tek kaynak |
| Editörler | Tiptap (zengin metin) + BlockNote (blok editör) |
| Durum Yönetimi | Zustand |
| İkonlar | Lucide React |
| Arama | FTS5 Full-Text Search (BM25) |
| Önbellek | Cloudflare KV (isteğe bağlı edge cache) |
| Kimlik Doğrulama | JWT + TOTP (2FA) |
| E-posta | Resend API |

**Render mimarisi:** Public sayfalar (home, post, archive, search,
landing) React 19 SSR ile üretilir — `renderToReadableStream` streaming
response, inline Tailwind bundle, ve `src/ssr/layouts/PublisherLayout`
altında tek şadcn tabanlı tema. AMP route'ları (`src/routes/public/amp/*`),
RSS feed ve sitemap yalnızca Hono JSX kullanır (per-file
`/** @jsxImportSource hono/jsx */` pragma ile). Admin paneli ayrı Vite
bundle olarak aynı `packages/ui/` shadcn primitifleri üzerinde çalışır.

---

## Özellikler

### Çoklu Site Mimarisi
- **Domain yönlendirme** — her site kendi domain'ine sahip, edge'de çözümlenir
- **Site kapsamlı içerik** — yazılar, sayfalar, medya, ayarlar, eklentiler site bazında izole
- **Global ayarlar** — tüm sitelerde geçerli varsayılanlar, her site kendi değerleriyle override edebilir
- **Rol tabanlı erişim** — kullanıcılar farklı sitelerde farklı rollere sahip olabilir

### İçerik Yönetimi
- **Yazılar ve Sayfalar** — tam CRUD, taslak, zamanlama, yapışkan yazı, şifreli yazı desteği
- **Zengin metin editörü** — Tiptap WYSIWYG, görsel/bağlantı/kısa kod ekleme modalleri
- **Blok editör** — BlockNote tabanlı, slash komutlarıyla blok ekleme
- **SEO araçları** — yazı bazında meta başlık, açıklama, anahtar kelime, OpenGraph görseli, dahili SEO analizci
- **Revizyon geçmişi** — her güncelleme öncesi otomatik snapshot, admin panelden geri yükleme
- **Tam metin arama** — FTS5 motoruyla BM25 sıralama, başlık/içerik/özet ağırlıklı arama
- **Özel içerik tipleri** — görsel şema oluşturucu ile sınırsız alan tipi (metin, sayı, tarih, renk, ilişki vb.)
- **Çoklu dil** — çeviri gruplarıyla birden fazla dilde içerik (i18n)
- **Kategoriler ve Etiketler** — hiyerarşik taksonomiler, dil bazında destek
- **Yorumlar** — iç içe yorumlar, moderasyon kuyruğu, reCAPTCHA koruması
- **Medya kütüphanesi** — R2'ye yükleme, tarama, arama, görsel meta verileri

### Navigasyon ve Düzen
- **Menü oluşturucu** — sürükle-bırak navigasyon menüleri, birden fazla konum (birincil, footer vb.)
- **Widget'lar** — yapılandırılabilir kenar çubuğu/footer widget'ları (son yazılar, kategoriler, özel HTML vb.)
- **Kısa kodlar** — sayfalara dinamik içerik gömmek için 14+ dahili kısa kod

### Site Özellikleri
- **Özel hata sayfaları** — tasarlanmış 404, 403, 410, 500 sayfaları, çift dil desteği
- **URL yönlendirmeleri** — site kapsamlı 301/302/403/404/410 kuralları, tıklanma takibi
- **Kısa URL'ler** — global URL kısaltma servisi (`/git/:slug`)
- **RSS beslemesi** — site başına otomatik XML feed
- **XML site haritası** — arama motorları için otomatik sitemap
- **Analitik** — sunucu tarafı sayfa görüntüleme takibi (bot filtreleme, ülke algılama), analitik paneli
- **Analitik kod enjeksiyonu** — Google Analytics / özel izleme kodları (global + site bazında)
- **Edge önbellek** — isteğe bağlı KV cache ile public sayfalar, tema, menü, sidebar verileri edge'de önbelleğe alınır

### Performans
- **KV Cache katmanı** — getSiteTheme, getSidebarData, getPublicPosts gibi sık sorgular edge'de cache'lenir
- **Cache-aside pattern** — KV yoksa direkt DB'den okur (graceful degradation)
- **Site-wide cache purge** — içerik/ayar değişikliğinde otomatik temizleme
- **Async pageview kaydı** — `waitUntil()` ile sayfa yanıtını geciktirmeden arka planda kayıt

### AMP (Hızlandırılmış Mobil Sayfalar)
- **AMP anasayfa** — blog listesi veya statik sayfa AMP formatında
- **AMP yazılar ve sayfalar** — geçerli AMP markup'ıyla otomatik render
- **AMP özel domain** — AMP içeriği için ayrılmış subdomain
- **Çoklu URL formatı** — `/amp/:slug`, `/:slug/amp`, `?amp=1`

### Güvenlik ve Kimlik Doğrulama
- **JWT kimlik doğrulama** — bearer token tabanlı API erişimi
- **TOTP iki faktörlü doğrulama** — Google Authenticator uyumlu
- **Rol tabanlı erişim kontrolü** — 4 rol: `writer`, `editor`, `admin`, `super_admin`
- **API anahtarları** — kapsamlı izinlerle harici entegrasyonlar için anahtar üretimi
- **Hız sınırlama** — IP başına 60 saniyede 120 istek
- **reCAPTCHA** — yorumlar ve iletişim formları için yapılandırılabilir

### WordPress Göçü
- **WXR içe aktarma** — WordPress XML dışa aktarma dosyalarını içe aktar (yazılar, sayfalar, kategoriler, etiketler, medya)
- **Kullanıcı eşleme** — WordPress yazarlarını CMS kullanıcılarına eşle
- **Veri dışa aktarma** — site verilerini JSON olarak yedekle

---

## Mimari

```
                    ┌─────────────────────────────────────┐
                    │       Cloudflare Edge Ağı             │
                    └─────────────┬───────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────┐
                    │      Cloudflare Worker (Hono)         │
                    │                                       │
                    │  ┌─────────┐  ┌──────────┐  ┌──────┐│
                    │  │   API   │  │   SSR    │  │Admin ││
                    │  │ Route'lar│  │ Sayfalar │  │(SPA) ││
                    │  └────┬────┘  └────┬─────┘  └──┬───┘│
                    │       │            │            │     │
                    │  ┌────▼────────────▼────────────▼───┐│
                    │  │          Middleware Zinciri        ││
                    │  │ CORS → Hız Sınırı → Site Çözümle  ││
                    │  │ → i18n → Eklentiler → Yönlendirme ││
                    │  └────┬──────────┬──────────────────┘│
                    └───────┼──────────┼──────────────────┘
                            │          │
               ┌────────────▼┐    ┌────▼────────┐
               │  Cloudflare  │    │  Cloudflare  │
               │     D1       │    │     R2       │
               │ (Veritabanı) │    │  (Medya)     │
               └──────────────┘    └─────────────┘
```

### İstek Akışı

1. İstek Cloudflare edge'e ulaşır → Worker'a yönlendirilir
2. **CORS middleware** — erişim başlıklarını ayarlar
3. **Hız sınırlayıcı** — aşırı istekleri engeller (sadece API)
4. **Site çözümleyici** — domain → `site_id` eşler (veya admin için `X-Site-Id` header'ı okur)
5. **i18n middleware** — URL prefix'inden veya Accept-Language'den dili algılar
6. **Eklenti hook'ları** — çözümlenen site için aktif eklentileri yükler
7. **Yönlendirme middleware** — yapılandırılmış yönlendirmeleri kontrol eder (301/302/403/404/410)
8. Route handler yanıtı sunar (API JSON, SSR HTML veya statik dosya)

### Dizin Yapısı

```
├── src/
│   ├── index.ts                 # Ana uygulama — route'lar, middleware, handler'lar
│   ├── types.ts                 # TypeScript arayüzleri (Bindings, Variables)
│   ├── middleware/
│   │   ├── auth.ts              # JWT kimlik doğrulama ve RBAC
│   │   ├── cors.ts              # CORS başlıkları
│   │   ├── i18n.ts              # Dil algılama
│   │   ├── rateLimit.ts         # API hız sınırlama
│   │   ├── siteResolver.ts      # Domain → site_id eşleme
│   │   ├── pluginHooks.ts       # Eklenti yaşam döngüsü (sandbox entegrasyonu)
│   │   ├── pageViewTracker.ts   # Sunucu tarafı sayfa görüntüleme takibi
│   │   └── redirects.ts         # URL yönlendirme motoru
│   ├── routes/
│   │   ├── api/                 # 18 REST API uç noktası
│   │   └── public/              # SSR sayfalar + AMP route'ları
│   ├── components/              # Sunucu tarafı render edilen HTML bileşenleri
│   ├── lib/
│   │   ├── cache.ts             # KV edge cache (cache-aside pattern)
│   │   ├── search.ts            # FTS5 tam metin arama
│   │   ├── revisions.ts         # İçerik revizyon geçmişi
│   │   ├── content-types.ts     # Özel içerik tipi şema builder
│   │   ├── plugins/
│   │   │   ├── engine.ts        # Hook kayıt ve çalıştırma motoru
│   │   │   ├── sandbox.ts       # İzin tabanlı sandbox context
│   │   │   ├── permissions.ts   # İzin tanımları ve hook eşlemesi
│   │   │   ├── dispatcher.ts    # Workers for Platforms dispatch
│   │   │   ├── validator.ts     # Eklenti kod validasyonu
│   │   │   └── types.ts         # Hook ve eklenti tip tanımları
│   │   └── ...                  # auth, db, amp, email vb.
│   ├── plugins/                 # Dahili eklentiler
│   └── db/
│       ├── schema.sql           # Tam veritabanı şeması
│       ├── seed-demo.sql        # Demo veriler
│       └── migrations/          # Artımlı migration'lar
├── admin/
│   ├── src/
│   │   ├── App.tsx              # React router ve auth guard'ları
│   │   ├── pages/               # Tüm admin sayfaları
│   │   ├── components/          # UI bileşenleri, editörler, düzen
│   │   ├── stores/              # Zustand state (auth, site, theme)
│   │   └── lib/                 # API istemcisi, i18n, yardımcılar
│   └── package.json
├── wrangler.toml                # Cloudflare Workers yapılandırması
└── package.json                 # Backend bağımlılıkları ve script'ler
```

---

## Admin Paneli

Admin paneli `/admin/` yolundan sunulan bir React SPA'dır. Backend ile JWT kimlik doğrulama üzerinden REST API aracılığıyla iletişim kurar.

### Sayfalar

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Gösterge Paneli | `/admin/` | İstatistikler, son yazılar, hızlı işlemler |
| Yazılar | `/admin/posts` | Yazı ve sayfa listeleme, oluşturma, düzenleme, silme |
| Yazı Editörü | `/admin/posts/new` | Zengin metin + blok editör, SEO paneli |
| Medya | `/admin/media` | R2'deki dosyaları yükleme, tarama, yönetme |
| Kategoriler ve Etiketler | `/admin/taxonomies` | Hiyerarşik taksonomi yönetimi |
| Yorumlar | `/admin/comments` | Moderasyon, onaylama, yanıtlama |
| Mesajlar | `/admin/messages` | İletişim formu gönderileri |
| Menüler | `/admin/menus` | Navigasyon menüsü oluşturma |
| Widget'lar | `/admin/widgets` | Kenar çubuğu/footer widget yapılandırması |
| Kısa Kodlar | `/admin/shortcodes` | Kısa kod yönetimi ve önizleme |
| Eklentiler | `/admin/plugins` | Eklenti etkinleştirme/devre dışı bırakma, ayarlar |
| Kullanıcılar | `/admin/users` | Kullanıcı yönetimi, rol atama |
| Analitik | `/admin/analytics` | Sayfa görüntüleme paneli |
| Site Ayarları | `/admin/settings` | Site adı, SEO, analitik kodları, reCAPTCHA |
| Tema Ayarları | `/admin/theme` | Renkler, yazı tipleri, düzen, sayfa başına yazı |
| AMP Ayarları | `/admin/amp` | AMP etkinleştirme/devre dışı, özel domain, analitik |
| Yönlendirmeler | `/admin/redirects` | URL yönlendirme kuralları |
| Kısa URL'ler | `/admin/short-urls` | URL kısaltıcı yönetimi |
| API Anahtarları | `/admin/api-keys` | Anahtar üretme/iptal etme |
| WP İçe Aktarma | `/admin/import` | WordPress göç aracı |
| Yedekleme | `/admin/backup` | Site verilerini dışa aktarma |
| Global Ayarlar | `/admin/global-settings` | Sistem geneli ayarlar (super_admin) |
| Siteler | `/admin/sites` | Çoklu site yönetimi (super_admin) |
| Profil | `/admin/profile` | Kullanıcı profili, 2FA kurulumu |

---

## API Uç Noktaları

Tüm API route'ları `/api/` ön ekiyle başlar ve JWT kimlik doğrulama gerektirir (`POST /api/auth/login` ve `POST /api/auth/register` hariç).

### Kimlik Doğrulama
| Metod | Uç Nokta | Açıklama |
|-------|----------|----------|
| POST | `/api/auth/login` | E-posta + şifre ile giriş (+ opsiyonel TOTP) |
| POST | `/api/auth/register` | Yeni hesap oluşturma |
| POST | `/api/auth/refresh` | JWT token yenileme |
| POST | `/api/auth/totp/setup` | 2FA etkinleştirme |

### İçerik
| Metod | Uç Nokta | Açıklama |
|-------|----------|----------|
| GET | `/api/posts` | Yazıları listele (durum, tür, dil ile filtreleme) |
| POST | `/api/posts` | Yazı/sayfa oluştur |
| GET | `/api/posts/:id` | Tek yazı getir |
| PUT | `/api/posts/:id` | Yazı güncelle |
| DELETE | `/api/posts/:id` | Yazı sil |

### Medya
| Metod | Uç Nokta | Açıklama |
|-------|----------|----------|
| GET | `/api/media` | Medya dosyalarını listele |
| POST | `/api/media` | R2'ye dosya yükle |
| DELETE | `/api/media/:id` | Medya dosyasını sil |

### Taksonomiler
| Metod | Uç Nokta | Açıklama |
|-------|----------|----------|
| GET | `/api/taxonomies` | Kategorileri/etiketleri listele |
| POST | `/api/taxonomies` | Taksonomi oluştur |
| PUT | `/api/taxonomies/:id` | Taksonomi güncelle |
| DELETE | `/api/taxonomies/:id` | Taksonomi sil |

### Diğer Uç Noktalar
| Ön Ek | Açıklama |
|-------|----------|
| `/api/comments` | Yorum moderasyonu |
| `/api/menus` | Menü CRUD |
| `/api/users` | Kullanıcı yönetimi |
| `/api/widgets` | Widget yapılandırması |
| `/api/settings` | Site ayarları (global fallback ile) |
| `/api/global-settings` | Sistem ayarları (super_admin) |
| `/api/plugins` | Eklenti yönetimi |
| `/api/analytics` | Sayfa görüntüleme verileri |
| `/api/shortcodes` | Mevcut kısa kodlar |
| `/api/api-keys` | API anahtar yönetimi |
| `/api/contact` | İletişim formu handler'ı |
| `/api/redirects` | URL yönlendirme kuralları |
| `/api/short-urls` | URL kısaltıcı |
| `/api/import` | WordPress WXR içe aktarma |
| `/api/backup` | Veri dışa aktarma |

---

## Herkese Açık Site (SSR)

Herkese açık site, Hono'nun JSX desteğiyle sunucu tarafında render edilir. Her sayfa edge'de dinamik olarak üretilir.

| Route | Açıklama |
|-------|----------|
| `/` | Anasayfa (blog listesi veya statik sayfa) |
| `/:lang` | Varsayılan olmayan dilde anasayfa |
| `/:slug` | Tekil yazı veya sayfa |
| `/:lang/:slug` | Varsayılan olmayan dilde yazı/sayfa |
| `/category/:slug` | Kategori arşivi |
| `/tag/:slug` | Etiket arşivi |
| `/search?q=...` | Arama sonuçları |
| `/feed` | RSS 2.0 XML beslemesi |
| `/sitemap.xml` | XML site haritası |
| `/uploads/*` | R2'den sunulan medya dosyaları |

### SSR Özellikleri
- Header, kenar çubuğu, footer ile responsive düzen
- Veritabanından okunan navigasyon menüleri
- Kenar çubuğu widget'ları (son yazılar, kategoriler, özel HTML)
- Öne çıkan görsel, özet, yazar, tarih ile yazı kartları
- Sayfalama
- Eklenti hook enjeksiyonu (head, body başı, body sonu)
- Analitik kod enjeksiyonu (head + body)
- Özel hata sayfaları (404, 403, 410, 500)

---

## AMP Desteği

Worker CMS, hızlı mobil deneyim için geçerli AMP HTML üretir.

| Route | Açıklama |
|-------|----------|
| `/amp` | AMP anasayfa |
| `/amp/:slug` | AMP yazı |
| `/amp/page/:slug` | AMP sayfa |
| `/amp/:lang` | AMP anasayfa (varsayılan olmayan dil) |
| `/amp/:lang/:slug` | AMP yazı (varsayılan olmayan dil) |
| `/:slug/amp` | AMP yazı (sonek formatı) |
| `?amp=1` | Sorgu parametresiyle AMP |

- Site bazında yapılandırılabilir (admin panelinden etkinleştir/devre dışı bırak)
- AMP özel domain desteği (AMP içeriği ayrı bir subdomain'den sunulabilir)
- `<img>` → `<amp-img>`, `<iframe>` → `<amp-iframe>` vb. otomatik dönüşüm
- AMP boilerplate, runtime ve bileşen script'leri dahil
- AMP analitik ID desteği (Google Analytics)

---

## Eklenti Sistemi (API v2)

Eklentiler hook tabanlı mimari ile işlevselliği genişletir. **Plugin
API v2** (Faz 7 sonrası) tek bir API sunar: render hook'ları `ReactNode[]`
döner, eski HTML-string hook'ları (`page.head`, `page.bodyStart`,
`page.bodyEnd`, `post.beforeRender`) silindi. Detaylı döküman için
bkz. [`docs/plugin-development.md`](docs/plugin-development.md).

### Dahili Eklentiler

| Eklenti | Hook'lar | Açıklama |
|---------|----------|----------|
| **seo-optimizer** | `post.beforeSave`, `ui.head`, `ui.slot.postHeader` | Otomatik meta açıklama, başlık uyarısı, okuma süresi rozeti |
| **social-share** | `ui.slot.postFooter`, `ui.bodyEnd` | Shadcn-stillendirilmiş paylaşım butonları (9 platform) + hydration boot |
| **contact-form** | — (shortcode tabanlı) | `[contact-form]` / `[iletisim-formu]` shortcode + `/api/contact` + reCAPTCHA |
| **hero-slider** | `ui.head`, `ui.bodyStart`, `ui.bodyEnd` | Otomatik oynatma, dokunmatik kaydırma, palet-uyumlu stil |

### Hook Noktaları (v2)

| Hook | Scope | Açıklama |
|------|-------|----------|
| `post.beforeSave` / `post.afterSave` / `post.beforeDelete` | Data | Yazı satırlarını dönüştür / yan etki tetikle |
| `media.afterUpload` / `media.beforeServe` | Data | Medya yüklemeleri |
| `comment.beforeSave` / `comment.afterSave` | Data | Yorum dönüşümü |
| `api.response` | Data | API yanıtlarını enrich et |
| `ui.head` | `ReactNode[]` + `Site` | `<head>` içine React node enjeksiyonu |
| `ui.bodyStart` | `ReactNode[]` + `Site` | `<body>` başına React node enjeksiyonu |
| `ui.bodyEnd` | `ReactNode[]` + `Site` | `</body>` öncesine React node enjeksiyonu |
| `ui.slot.headerRight` | `ReactNode[]` + `Site` | Header sağ tools alanı |
| `ui.slot.sidebarTop` / `sidebarBottom` | `ReactNode[]` + `Site` | Widget listesinin üstü/altı |
| `ui.slot.footerStart` / `footerEnd` | `ReactNode[]` + `Site` | Footer widget grid'inin üstü / copyright'ın altı |
| `ui.slot.postHeader` / `postFooter` | `ReactNode[]` + `PluginPostContext` | Post gövdesinin üstü / yorum bölümünün üstü |

Her render hook akümülatör listesi alır, yeni React node'ları ekleyerek
dönülür. Route handler tüm slotları `collectDocumentSlots()` /
`collectSiteLayoutSlots()` / `collectPostLayoutSlots()` ile `Promise.all`
içinde önceden toplar ve `<Shell>` + `<PublisherLayout>` prop'larına
yerleştirir.

### Eklenti Sandbox Mimarisi

**Katman 1: İzin Tabanlı Sandbox (Dahili eklentiler)**
- Her eklenti izin listesi tanımlar (`posts:read`, `page:inject`, `http:fetch` vb.)
- Hook kaydında izin kontrolü — izinsiz hook otomatik atlanır
- `safeHandler` wrapper: try/catch, zamanlama ölçümü, hata izolasyonu
- Tüm çalışmalar `plugin_execution_logs` tablosuna kaydedilir

**Katman 2: Workers for Platforms (3. Parti eklentiler)**
- Dispatch namespace ile gerçek V8 isolate izolasyonu
- CPU/subrequest limitleri (plan bazlı: 10-50ms CPU, 0-50 subrequest)
- JSON üzerinden iletişim — eklenti DB/R2'ye erişemez
- Deploy öncesi kod validasyonu (eval, dynamic import yasağı)
- Not: MVP'de aktif 3. parti eklenti yok; altyapı gelecek için hazır.

---

## MCP Sunucusu (AI Entegrasyonu)

Worker CMS, [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) desteğiyle AI araçlarından doğrudan yönetilebilir. Claude Desktop, Claude Code, Cursor ve diğer MCP uyumlu istemciler ile içerik oluşturma, düzenleme, analiz ve site yönetimi yapılabilir.

### Çalışma Şekli

MCP sunucusu Worker'ın içine gömülüdür. Her deployment otomatik olarak `/mcp` endpoint'ini sunar:

```
https://workercms.com/mcp      (POST - JSON-RPC 2.0)
```

Tek bir `super_admin` JWT token'ı ile tüm siteleri yönetebilirsiniz. Her tool çağrısında `site_id` parametresi ile hedef site belirlenir.

### Bağlantı Kurulumu

**Claude Desktop / Claude Code:**
```json
{
  "mcpServers": {
    "workercms": {
      "type": "streamable-http",
      "url": "https://workercms.com/mcp",
      "headers": {
        "Authorization": "Bearer <super_admin_jwt_token>"
      }
    }
  }
}
```

### Mevcut Tool'lar (20)

| Grup | Tool'lar | Açıklama |
|------|----------|----------|
| **Siteler** | `cms_list_sites`, `cms_get_site` | Tüm siteleri listele, detay görüntüle |
| **Yazılar** | `cms_list_posts`, `cms_get_post`, `cms_create_post`, `cms_update_post`, `cms_delete_post` | İçerik CRUD |
| **Medya** | `cms_list_media` | Medya kütüphanesi |
| **Taksonomiler** | `cms_list_taxonomies`, `cms_create_taxonomy` | Kategori/etiket yönetimi |
| **Yorumlar** | `cms_list_comments`, `cms_moderate_comment` | Yorum moderasyonu |
| **Analitik** | `cms_analytics_overview`, `cms_analytics_popular` | Site istatistikleri |
| **Ayarlar** | `cms_get_settings`, `cms_update_settings` | Site yapılandırması |
| **Eklentiler** | `cms_list_plugins`, `cms_toggle_plugin` | Eklenti yönetimi |
| **Arama** | `cms_search` | FTS5 tam metin arama |

### Örnek Kullanım

```
"Site 1'deki son 5 yazıyı listele"
"Yeni bir blog yazısı oluştur: başlık 'Merhaba Dünya', taslak olarak kaydet"
"Site 2'nin analytics verilerini göster"
"Bekleyen yorumları onayla"
```

### Yerel MCP Sunucusu (Alternatif)

Proje ayrıca `mcp/` dizininde yerel çalışan bir MCP sunucusu da içerir (stdio transport). Detaylar için `mcp/` dizinine bakın.

---

## Kısa Kod Motoru

Kısa kodlar, yazılara ve sayfalara dinamik içerik gömmeyi sağlar. Motor `[kisakod attr="deger"]` söz dizimini ayrıştırıp HTML render eder.

| Kısa Kod | Açıklama |
|----------|----------|
| `[slider]` | Görsel slider/karusel |
| `[galeri]` | Medya galeri ızgarası |
| `[video]` | Gömülü video oynatıcı |
| `[son-yazilar]` | Son yazılar listesi |
| `[kategori]` | Kategori listesi |
| `[menu]` | Navigasyon menüsü görüntüleme |
| `[widget]` | Widget ekleme |
| `[iletisim-formu]` | İletişim formu |
| `[sosyal-medya]` | Sosyal paylaşım butonları |
| `[arama-formu]` | Arama formu |
| `[ayirici]` | Görsel ayırıcı/çizgi |
| `[bosluk]` | Dikey boşluk |
| `[ozel-html]` | Özel HTML bloğu |
| `[yazi]` | Tekil yazı gömme |

---

## Veritabanı Şeması

Tam ilişkisel bütünlüğe sahip 30+ tablo:

```
sites ──┬── site_domains      (çoklu domain desteği)
        ├── posts ──┬── post_meta         (genişletilebilir meta veri)
        │           ├── post_taxonomies   (kategori/etiket bağlantıları)
        │           ├── comments          (iç içe yorumlar)
        │           ├── revisions         (sürüm geçmişi)
        │           └── seo_scores        (SEO analizi)
        ├── taxonomies                    (kategoriler + etiketler)
        ├── media                         (R2 dosya referansları)
        ├── menus ── menu_items           (hiyerarşik navigasyon)
        ├── widgets                       (kenar çubuğu/footer)
        ├── settings                      (site kapsamlı ayarlar)
        ├── page_views                    (sunucu tarafı analitik)
        ├── post_revisions                (içerik sürüm geçmişi)
        ├── content_types                 (özel içerik tipi şemaları)
        ├── posts_fts                     (FTS5 tam metin arama indeksi)
        ├── search_logs                   (arama sorgusu analitik)
        ├── plugin_execution_logs         (eklenti çalışma logları)
        ├── site_plugins                  (site bazında eklenti aktivasyonu)
        ├── redirects                     (URL yönlendirmeleri)
        └── api_keys                      (harici erişim)

users ──┬── user_sites        (site başına rol)
        └── api_keys

global_settings                (sistem geneli varsayılanlar)
plugins                        (eklenti kaydı)
short_urls                     (global URL kısaltıcı)
seo_services                   (SEO entegrasyonları)
```

### Temel Tasarım Kalıpları
- **Çoklu kiracılık (Multi-tenancy)** — tüm içerik tablolarında `site_id` yabancı anahtar
- **Çoklu dil (i18n)** — `language` + `translation_group` alanları
- **Ayar kalıtımı** — site ayarları → global ayarlar → sabit varsayılanlar
- **Esnek hiyerarşi** — yazılar, taksonomiler, yorumlar, menü öğelerinde `parent_id`
- **R2 entegrasyonu** — dosya yolları yerine `r2_key` referansları
- **FTS5 arama** — BM25 sıralama ile ağırlıklı tam metin arama (başlık 10x, özet 5x, içerik 1x)
- **Edge cache** — KV cache-aside pattern ile sık sorguların edge'de önbelleğe alınması
- **Eklenti sandbox** — izin tabanlı hook gate + Workers for Platforms V8 isolate izolasyonu
- **Stratejik indeksleme** — sık sorgulanan sütunlarda 30+ indeks

---

## Kurulum

### Gereksinimler

- **Node.js** — v18 veya üstü
- **npm** — v9 veya üstü
- **Cloudflare hesabı** — ücretsiz katman yeterli
- **Wrangler CLI** — global kurulum veya npx ile

---

### Adım 1: Repoyu Klonla

```bash
git clone https://github.com/victories/Worker-Cms.git
cd Worker-Cms
```

### Adım 2: Bağımlılıkları Kur

```bash
# Backend bağımlılıkları
npm install

# Admin paneli bağımlılıkları
cd admin
npm install
cd ..
```

### Adım 3: Cloudflare'e Giriş Yap

```bash
npx wrangler login
```

Tarayıcı açılacak. Cloudflare hesabınla giriş yap ve Wrangler'ı yetkilendir.

### Adım 4: Cloudflare Kaynaklarını Oluştur

#### D1 Veritabanı Oluştur

```bash
npx wrangler d1 create cms-db
```

Çıktıdaki `database_id` değerini kopyala.

#### R2 Bucket Oluştur

```bash
npx wrangler r2 bucket create cms-media
```

### Adım 5: `wrangler.toml` Yapılandır

`wrangler.toml` dosyasını kendi değerlerinle düzenle:

```toml
name = "wp-cms"
main = "src/index.ts"
compatibility_date = "2025-02-14"
compatibility_flags = ["nodejs_compat"]
workers_dev = true

# Özel domain'lerini buraya ekle (isteğe bağlı)
# routes = [
#   { pattern = "blog.senindomain.com/*", zone_name = "senindomain.com" }
# ]

[vars]
JWT_SECRET = "rastgele-64-karakter-hex-olustur"
ADMIN_DOMAIN = "worker-adin.subdomain.workers.dev"
RESEND_API_KEY = "re_senin_resend_api_key"   # İsteğe bağlı: e-posta özellikleri için

[[d1_databases]]
binding = "DB"
database_name = "cms-db"
database_id = "database-id-ni-buraya-yapistir"

[[r2_buckets]]
binding = "R2"
bucket_name = "cms-media"

[site]
bucket = "./admin/dist"
```

> **JWT secret üretmek için:**
> ```bash
> openssl rand -hex 32
> ```

### Adım 6: Veritabanını Başlat

```bash
# Şemayı remote D1'e uygula
npx wrangler d1 execute cms-db --remote --file=src/db/schema.sql

# (İsteğe bağlı) Demo verileri yükle
npx wrangler d1 execute cms-db --remote --file=src/db/seed-demo.sql
```

### Adım 7: Admin Panelini Derle

```bash
cd admin
npm run build
cd ..
```

### Adım 8: Deploy Et

```bash
npx wrangler deploy
```

CMS artık şu adreste yayında: `https://worker-adin.subdomain.workers.dev`

- **Admin paneli:** `https://worker-adin.subdomain.workers.dev/admin/`
- **Herkese açık site:** `https://worker-adin.subdomain.workers.dev/`

### Adım 9: İlk Admin Kullanıcını Oluştur

Admin paneli giriş sayfasından kayıt ol veya API kullan:

```bash
curl -X POST https://worker-adin.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ornek.com",
    "password": "guvenli-sifren",
    "display_name": "Admin"
  }'
```

Ardından D1 konsoluyla super_admin'e yükselt:

```bash
npx wrangler d1 execute cms-db --remote \
  --command="UPDATE users SET role = 'super_admin' WHERE email = 'admin@ornek.com'"
```

### Adım 10: Özel Domain Ekle (İsteğe Bağlı)

1. Cloudflare paneline git → Workers & Pages → worker'ını seç
2. Özel domain ekle (örn. `blog.senindomain.com`)
3. Admin panelinden domain'i siteye ekle (Siteler → Site Ayarları → Domain'ler)
4. `wrangler.toml`'a route ekle:

```toml
routes = [
  { pattern = "blog.senindomain.com/*", zone_name = "senindomain.com" }
]
```

5. Tekrar deploy et: `npx wrangler deploy`

---

### Yerel Geliştirme

```bash
# Worker geliştirme sunucusunu başlat (backend)
npm run dev

# Başka bir terminalde admin geliştirme sunucusunu başlat (frontend)
cd admin
npm run dev
```

Worker `http://localhost:8787` adresinde, admin Vite sunucusu `http://localhost:5173` adresinde çalışır.

Yerel veritabanı için:

```bash
# Yerel D1 veritabanını oluştur
npx wrangler d1 execute cms-db --local --file=src/db/schema.sql

# Demo verileri yükle
npx wrangler d1 execute cms-db --local --file=src/db/seed-demo.sql
```

---

### Faydalı Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Yerel geliştirme sunucusunu başlat |
| `npm run deploy` | Cloudflare Workers'a deploy et |
| `npm run db:migrate` | Şemayı remote D1'e uygula |
| `npm run db:migrate:local` | Şemayı yerel D1'e uygula |
| `npm run db:seed` | Remote D1'e demo veri yükle |
| `npm run db:seed:local` | Yerel D1'e demo veri yükle |
| `cd admin && npm run build` | Admin panelini production için derle |
| `cd admin && npm run dev` | Admin Vite geliştirme sunucusunu başlat |

---

## Lisans

Bu proje özel ve tescillidir.
