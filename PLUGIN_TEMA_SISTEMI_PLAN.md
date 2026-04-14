# Worker CMS — Plugin & Tema Sistemi Entegrasyon Planı

## Genel Bakış

Bu doküman, mevcut Worker CMS'e remote plugin ve config-driven tema sistemi entegre etmek için detaylı teknik planı içerir. Sistem, plugin geliştiricilerinin kendi Cloudflare hesaplarında Worker deploy edip senin CMS'inle iletişim kurmasına olanak tanır. Tema sistemi ise tamamen veritabanı tabanlı (config-driven) çalışır.

---

## MİMARİ GENEL GÖRÜNÜM

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ana CMS Worker (Hono)                        │
│                                                                   │
│  İstek gelir → Middleware zinciri → Site çözümle → Tema yükle    │
│                                                                   │
│  ┌──────────────────────┐    ┌─────────────────────────────┐     │
│  │  Config-Driven Tema   │    │   Plugin Hook Çalıştırıcı    │     │
│  │  • CSS Variables      │    │                               │     │
│  │  • Layout Templates   │    │  1. Config pluginler (D1)    │     │
│  │  • Font/Renk ayarları │    │     → JSON manifest yorumla  │     │
│  │  • D1'den okunur      │    │     → 0ms, güvenli           │     │
│  └──────────────────────┘    │                               │     │
│                               │  2. Remote pluginler (fetch)  │     │
│                               │     → Kullanıcının Worker'ı  │     │
│                               │     → Structured data al     │     │
│                               │     → Sanitize + CMS render  │     │
│                               │     → Timeout: 3s            │     │
│                               └─────────────────────────────┘     │
│                                                                   │
│  SSR Render: Tema CSS + Plugin Hook çıktıları → HTML yanıt       │
└──────────────┬──────────────────────────────┬────────────────────┘
               │                              │
          ┌────▼─────┐              ┌─────────▼──────────┐
          │ D1 (tema  │              │ Remote Plugin       │
          │ + config  │              │ Worker'ları         │
          │ plugin    │              │ (kullanıcı hesabı)  │
          │ verileri) │              │                     │
          └──────────┘              └─────────────────────┘
```

---

## FAZ 1: VERİTABANI DEĞİŞİKLİKLERİ

### 1.1 Yeni Tablolar

```sql
-- ============================================================
-- TEMA SİSTEMİ
-- ============================================================

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  author TEXT DEFAULT '',
  css_variables TEXT NOT NULL DEFAULT '{}',
  layout_config TEXT NOT NULL DEFAULT '{}',
  templates TEXT NOT NULL DEFAULT '{}',
  google_fonts TEXT DEFAULT '[]',
  custom_css TEXT DEFAULT '',
  custom_head_html TEXT DEFAULT '',
  thumbnail_r2_key TEXT,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_themes_slug ON themes(slug);

CREATE TABLE IF NOT EXISTS site_themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  custom_overrides TEXT DEFAULT '{}',
  installed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
  UNIQUE(site_id, theme_id)
);

CREATE INDEX idx_site_themes_site ON site_themes(site_id);
CREATE INDEX idx_site_themes_active ON site_themes(site_id, is_active);

-- ============================================================
-- PLUGIN SİSTEMİ (genişletilmiş)
-- ============================================================

CREATE TABLE IF NOT EXISTS plugin_components (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  plugin_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  component_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  default_config TEXT DEFAULT '{}',
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE,
  UNIQUE(plugin_id, component_id)
);

CREATE INDEX idx_plugin_components_plugin ON plugin_components(plugin_id);

CREATE TABLE IF NOT EXISTS plugin_hooks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  plugin_id TEXT NOT NULL,
  hook_name TEXT NOT NULL,
  priority INTEGER DEFAULT 10,
  component_id TEXT,
  config_content TEXT,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX idx_plugin_hooks_name ON plugin_hooks(hook_name);
CREATE INDEX idx_plugin_hooks_plugin ON plugin_hooks(plugin_id);

CREATE TABLE IF NOT EXISTS plugin_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  hook_name TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX idx_plugin_logs_site ON plugin_logs(site_id);
CREATE INDEX idx_plugin_logs_created ON plugin_logs(created_at);
```

### 1.2 Mevcut Tabloları Güncelle (Migration)

```sql
-- migration: 005_plugin_theme_system.sql
ALTER TABLE plugins ADD COLUMN plugin_type TEXT DEFAULT 'builtin';
ALTER TABLE plugins ADD COLUMN endpoint_url TEXT;
ALTER TABLE plugins ADD COLUMN api_secret TEXT;
ALTER TABLE plugins ADD COLUMN manifest TEXT DEFAULT '{}';
ALTER TABLE plugins ADD COLUMN review_status TEXT DEFAULT 'approved';
ALTER TABLE plugins ADD COLUMN verified INTEGER DEFAULT 0;
ALTER TABLE plugins ADD COLUMN risk_score INTEGER DEFAULT 0;
ALTER TABLE plugins ADD COLUMN author TEXT DEFAULT '';
ALTER TABLE plugins ADD COLUMN version TEXT DEFAULT '1.0.0';
ALTER TABLE plugins ADD COLUMN homepage_url TEXT;
ALTER TABLE plugins ADD COLUMN icon_url TEXT;
```

---

## FAZ 2: PLUGIN PROTOKOLÜ

### 2.1 Plugin Manifest Formatı

Remote plugin geliştiricisinin sağlaması gereken manifest:

```json
{
  "slug": "complaint-system",
  "name": "Müşteri Şikayet Sistemi",
  "version": "1.2.0",
  "author": "Mehmet Kaya",
  "description": "Müşteri şikayetlerini takip ve yönetim sistemi",
  "homepage": "https://github.com/mehmet/complaint-plugin",
  "icon": "https://example.com/icon.png",
  "endpoint": "https://complaint-plugin.mehmet.workers.dev",

  "components": [
    {
      "id": "complaint-list",
      "type": "table",
      "name": "Şikayet Listesi",
      "description": "Tüm şikayetleri tablo halinde gösterir"
    },
    {
      "id": "complaint-form",
      "type": "form",
      "name": "Şikayet Formu",
      "description": "Yeni şikayet oluşturma formu"
    },
    {
      "id": "complaint-stats",
      "type": "stats",
      "name": "Şikayet İstatistikleri",
      "description": "Özet istatistikler"
    }
  ],

  "hooks": {
    "dashboard": { "component": "complaint-stats", "priority": 5 },
    "sidebar": { "component": "complaint-stats", "priority": 10 }
  },

  "shortcodes": [
    { "tag": "sikayet-formu", "component": "complaint-form" },
    { "tag": "sikayet-listesi", "component": "complaint-list" }
  ],

  "settings_schema": [
    { "key": "email_notifications", "label": "E-posta Bildirimleri", "type": "boolean", "default": true },
    { "key": "admin_email", "label": "Yönetici E-postası", "type": "text", "required": true },
    { "key": "max_complaints_per_page", "label": "Sayfa Başına Şikayet", "type": "number", "default": 20 }
  ],

  "permissions": ["read_site_info", "read_users_public"]
}
```

### 2.2 CMS → Plugin İstek Formatı

```typescript
// POST https://complaint-plugin.mehmet.workers.dev
// Headers: X-CMS-Secret, X-CMS-Hook, X-CMS-Version, X-CMS-Request-Id
{
  "action": "render_component",
  "hook": "post_after_content",
  "component_id": "complaint-form",
  "context": {
    "site_id": "abc123",
    "site_name": "Blog Adı",
    "language": "tr",
    "request_url": "https://blog.com/iletisim",
    "user_role": null
  },
  "settings": { "email_notifications": true, "admin_email": "admin@x.com" },
  "params": { "page": 1 }
}
```

### 2.3 Plugin → CMS Yanıt Formatı (Structured Data)

Plugin ASLA ham HTML döndürmez. Yapılandırılmış veri döner, CMS kendi temasıyla render eder.

```json
{
  "status": "ok",
  "component": "complaint-form",
  "type": "form",
  "data": {
    "title": "Şikayet Formu",
    "submit_action": "/api/plugin-proxy/complaint-system/submit",
    "fields": [
      { "name": "customer_name", "label": "Ad Soyad", "type": "text", "required": true },
      { "name": "email", "label": "E-posta", "type": "email", "required": true },
      { "name": "category", "label": "Kategori", "type": "select",
        "options": [
          { "value": "shipping", "label": "Kargo" },
          { "value": "product", "label": "Ürün" }
        ]
      },
      { "name": "message", "label": "Şikayetiniz", "type": "textarea", "required": true, "rows": 6 }
    ],
    "submit_label": "Şikayeti Gönder",
    "success_message": "Şikayetiniz alındı."
  }
}
```

### 2.4 Desteklenen Bileşen Tipleri

| Tip | Plugin Sağlar | CMS Render Eder |
|-----|---------------|-----------------|
| `table` | columns[], rows[], pagination | Tema stilinde HTML tablo |
| `form` | fields[], submit_action | CMS proxy'li güvenli form |
| `stats` | items[] (label, value, trend) | Kart grid, renkli gösterim |
| `chart` | type, labels, datasets | SVG veya CSS bar chart |
| `list` | items[] (title, subtitle, badge) | Tema stilinde liste |
| `card` | title, content, image, actions | Kart bileşeni |

---

## FAZ 3: GÜVENLİK KATMANI

### 3.1 Güvenlik Akışı

```
Plugin yanıtı (JSON)
    │
    ├─ KATMAN 1: Tip Kontrolü (JSON mı? Boyut < 512KB?)
    ├─ KATMAN 2: Şema Doğrulama (bilinen type? zorunlu alanlar?)
    ├─ KATMAN 3: İçerik Sanitize (escapeHtml, URL doğrulama, script/event tespiti)
    ├─ KATMAN 4: CMS Render (kendi temasıyla HTML üret)
    └─ KATMAN 5: CSP Header (script-src 'self', frame-src 'none')
```

### 3.2 Güvenlik Dosyası: src/lib/pluginSecurity.ts

```
Fonksiyonlar:
- escapeHtml(str)              → HTML entity escape
- sanitizePluginData(data)     → Recursive tüm stringleri escape
- validatePluginResponse(res)  → Tip ve şema kontrolü
- validateUrl(url)             → Sadece http/https izin ver
- stripDangerousPatterns(str)  → script, event handler, data URI temizle
- checkResponseSize(body)      → Max 512KB
- generateApiSecret()          → Plugin kayıt sırasında secret üret
- verifyPluginSignature(req)   → Gelen plugin isteklerini doğrula
```

### 3.3 Form Proxy Sistemi

Plugin formlarının action URL'si ASLA doğrudan plugin'e gitmez:

```
Kullanıcı formu POST → /api/plugin-proxy/:slug/submit (CMS endpoint)
  → CSRF token kontrolü
  → reCAPTCHA (varsa)
  → Rate limiting
  → Field validation (manifest kurallarına göre)
  → Sanitize edilmiş veriyi plugin Worker'ına ilet
  → Plugin işler, JSON yanıt döner
  → CMS kullanıcıya sonucu gösterir
```

### 3.4 Plugin'e GÖNDERİLMEYEN Veriler

```
✗ JWT token / session bilgisi
✗ Kullanıcı e-postaları (sadece role)
✗ Veritabanı bilgileri
✗ API secret'lar
✗ Diğer pluginlerin bilgileri
✗ Admin URL
✗ Environment değişkenleri
✗ Cloudflare hesap bilgileri
```

---

## FAZ 4: TEMA SİSTEMİ

### 4.1 Tema JSON Yapısı

```json
{
  "css_variables": {
    "colors": {
      "--bg-primary": "#ffffff",
      "--bg-secondary": "#f8f9fa",
      "--text-primary": "#212529",
      "--text-secondary": "#6c757d",
      "--accent": "#0d6efd",
      "--accent-hover": "#0b5ed7",
      "--border-color": "#dee2e6",
      "--success": "#198754",
      "--warning": "#ffc107",
      "--danger": "#dc3545"
    },
    "typography": {
      "--font-heading": "'Inter', sans-serif",
      "--font-body": "'Inter', sans-serif",
      "--font-mono": "'JetBrains Mono', monospace",
      "--font-size-base": "16px",
      "--line-height": "1.6",
      "--heading-weight": "700"
    },
    "spacing": {
      "--spacing-sm": "8px",
      "--spacing-md": "16px",
      "--spacing-lg": "24px",
      "--spacing-xl": "32px",
      "--content-max-width": "1200px",
      "--sidebar-width": "300px"
    },
    "borders": {
      "--border-radius": "8px",
      "--border-radius-sm": "4px",
      "--border-width": "1px"
    }
  },
  "layout_config": {
    "header_style": "standard",
    "sidebar_position": "right",
    "sidebar_enabled": true,
    "footer_style": "three-column",
    "post_card_style": "card",
    "post_card_columns": 1,
    "show_featured_image": true,
    "show_author": true,
    "show_date": true,
    "show_excerpt": true,
    "comments_style": "threaded"
  },
  "google_fonts": ["Inter:400,500,600,700"],
  "custom_css": ""
}
```

### 4.2 Dahili Temalar

| Slug | Açıklama |
|------|----------|
| `default-light` | Temiz, beyaz arka plan, mavi aksan |
| `default-dark` | Koyu tema, yumuşak kontrastlar |
| `developer` | Monospace fontlar, terminal hissi |
| `magazine` | Gazete tarzı, çok kolonlu |
| `minimal` | Minimum süsleme, içerik odaklı |

---

## FAZ 5: YENİ DOSYALAR

```
src/
├── lib/
│   ├── pluginSecurity.ts        ← [YENİ] Güvenlik fonksiyonları
│   ├── pluginExecutor.ts        ← [YENİ] Remote plugin çağrı motoru
│   ├── pluginRenderer.ts        ← [YENİ] Plugin bileşen → HTML renderer
│   ├── themeEngine.ts           ← [YENİ] Tema CSS/layout üretici
│   └── componentSchemas.ts      ← [YENİ] Bileşen tip doğrulama şemaları
├── middleware/
│   ├── pluginHooks.ts           ← [GÜNCELLE] Remote plugin desteği
│   └── themeResolver.ts         ← [YENİ] Aktif tema middleware
├── routes/api/
│   ├── plugins.ts               ← [GÜNCELLE] Remote plugin CRUD
│   ├── themes.ts                ← [YENİ] Tema API
│   └── pluginProxy.ts           ← [YENİ] Plugin form proxy
├── components/
│   ├── pluginComponents/        ← [YENİ] Bileşen HTML şablonları
│   │   ├── TableComponent.tsx
│   │   ├── FormComponent.tsx
│   │   ├── StatsComponent.tsx
│   │   ├── ChartComponent.tsx
│   │   ├── ListComponent.tsx
│   │   └── CardComponent.tsx
│   └── ThemeLayout.tsx          ← [YENİ] Tema-duyarlı layout

admin/src/pages/
├── ThemeManager.tsx              ← [YENİ] Tema yönetimi
├── ThemeCustomizer.tsx           ← [YENİ] Canlı tema özelleştirici
└── PluginStore.tsx               ← [YENİ] Plugin mağazası
```

---

## FAZ 6: API ENDPOINT'LERİ

### Tema API
```
GET    /api/themes                → Tüm temaları listele
POST   /api/themes                → Yeni tema yükle
GET    /api/themes/:id            → Tema detayı
PUT    /api/themes/:id            → Tema güncelle
DELETE /api/themes/:id            → Tema sil
POST   /api/themes/:id/activate   → Temayı uygula
POST   /api/themes/:id/preview    → Canlı önizleme
PUT    /api/themes/:id/customize  → Site bazında override
GET    /api/themes/active          → Aktif tema
```

### Plugin API (genişletilmiş)
```
POST   /api/plugins/install-remote  → Remote plugin kaydet
POST   /api/plugins/install-config  → Config plugin yükle
POST   /api/plugins/:id/test        → Sağlık kontrolü
GET    /api/plugins/:id/logs         → Çağrı logları
POST   /api/plugins/:id/verify      → Admin onayı
POST   /api/plugin-proxy/:slug/:action → Form proxy
```

### Plugin Kayıt Akışı
```
1. Admin panelinde Worker URL girilir
2. CMS → GET /.well-known/cms-manifest.json (manifest oku)
3. Manifest doğrulanır (zorunlu alanlar, bileşen tipleri)
4. CMS api_secret üretir → POST /.well-known/cms-register
5. Plugin secret'ı kendi env'inde saklar
6. CMS, plugin kaydını D1'e yazar (review_status: 'pending')
7. Super_admin onaylar → aktif
```

---

## FAZ 7: HOOK NOKTALARI

```
head_start          → <head> başı
head_end            → </head> öncesi (analytics, CSS)
body_start          → <body> sonrası (bildirim barı)
body_end            → </body> öncesi (chat widget)
header_before       → Header üstü (duyuru barı)
header_after        → Header altı (breadcrumb)
content_before      → Ana içerik öncesi
content_after       → Ana içerik sonrası
post_before_title   → Başlık öncesi
post_after_title    → Başlık sonrası
post_before_content → İçerik öncesi
post_after_content  → İçerik sonrası (paylaşım, form)
post_before_comments → Yorumlar öncesi
post_after_comments  → Yorumlar sonrası
sidebar_before      → Kenar çubuğu başı
sidebar_after       → Kenar çubuğu sonu
footer_before       → Footer başı
footer_after        → Footer sonu
dashboard           → Admin dashboard widget
```

---

## FAZ 8: REMOTE PLUGIN GELİŞTİRİCİ ŞABLONU

Plugin geliştiricisinin kendi hesabında deploy edeceği minimum Worker:

```typescript
// src/index.ts
import { Hono } from 'hono';

interface Env { CMS_API_SECRET: string; DB: D1Database; }
const app = new Hono<{ Bindings: Env }>();

// Manifest
app.get('/.well-known/cms-manifest.json', (c) => c.json({ /* manifest */ }));

// Kayıt
app.post('/.well-known/cms-register', async (c) => {
  const { api_secret } = await c.req.json();
  // secret'ı sakla
  return c.json({ status: 'registered' });
});

// Ana endpoint
app.post('/', async (c) => {
  if (c.req.header('X-CMS-Secret') !== c.env.CMS_API_SECRET) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const { action, component_id, settings, params } = await c.req.json();

  if (action === 'health_check') return c.json({ status: 'ok' });

  if (action === 'render_component') {
    // component_id'ye göre structured data döndür
  }

  if (action === 'handle_form') {
    // form verisini işle
  }
});

export default app;
```

---

## FAZ 9: UYGULAMA TAKVİMİ

| Adım | Süre | İçerik |
|------|------|--------|
| 1. Veritabanı | 1 gün | Migration SQL, tablo oluşturma |
| 2. Güvenlik | 1 gün | pluginSecurity.ts, CSP, sanitize |
| 3. Tema Motoru | 2 gün | themeEngine, themeResolver, 5 dahili tema |
| 4. Plugin Motoru | 2 gün | pluginExecutor, pluginRenderer, proxy |
| 5. Plugin API | 1 gün | CRUD, kayıt akışı, health check |
| 6. Admin Paneli | 3 gün | Tema yönetimi, özelleştirici, plugin mağazası |
| 7. Test & Docs | 1 gün | Örnek plugin, geliştirici dokümanı |
| **Toplam** | **~11 gün** | |

---

## NOTLAR

1. **Workers for Platforms** — İleride sandbox izolasyonu için eklenebilir
2. **Plugin Marketplace** — İleride merkezi katalog oluşturulabilir
3. **Cache** — Remote plugin yanıtları Workers Cache API ile cache'lenebilir
4. **Rate Limiting** — Plugin Worker'larına istekler de rate limit'e tabi
5. **Auto-disable** — Çok yavaş veya hatalı plugin otomatik devre dışı
