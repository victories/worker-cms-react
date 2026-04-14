# Plugin & Tema Sandbox Izolasyonu - Workers for Platforms

## Context
Mevcut plugin sistemi tum pluginleri ana Worker process'inde calistiriyor. Pluginler:
- Ana uygulamanin tum scope'una erisebilir
- Sinirsiz CPU/memory kullanabilir
- Keyfi HTTP istekleri yapabilir
- Birbirlerinin verisini bozabilir

EmDash CMS'in sandboxed plugin sistemi ilham kaynagi. Cloudflare **Workers for Platforms** (dispatch namespaces) kullanarak gercek V8 isolate izolasyonu saglayacagiz.

## Mevcut Durum Analizi

### Mevcut Plugin Mimarisi
- **Engine**: `src/lib/plugins/engine.ts` - Singleton, Map<HookName, Handler[]>
- **Middleware**: `src/middleware/pluginHooks.ts` - Her request'te DB'den aktif pluginleri yukler
- **4 built-in plugin**: seo-optimizer, social-share, contact-form, hero-slider
- **Kisitlama**: CF Workers'da dynamic import yok, pluginler statik registry'de
- **Sorun**: Pluginler ana process'te calisiyor, izolasyon yok

### Plugin Hook Arayuzu (korunacak)
```
post.beforeSave(post) -> post        // Filter: post verisini degistir
post.afterSave(post) -> void         // Action: post kaydedildikten sonra
post.beforeRender(html, post) -> html // Filter: render HTML'i degistir
page.head(html, site) -> html        // Filter: <head>'e ekle
page.bodyStart(html, site) -> html   // Filter: <body> basina ekle
page.bodyEnd(html, site) -> html     // Filter: </body> oncesine ekle
comment.beforeSave(comment) -> comment
media.afterUpload(media) -> void
```

## Workers for Platforms ile Sandbox Mimarisi

### Nasil Calisir
```
[Request] -> [Ana Worker (wp-cms)]
                |
                +-- pluginHooksMiddleware
                |     |
                |     +-- env.DISPATCHER.get("plugin-seo-optimizer")
                |     |     \-> [Izole V8 Isolate] -> JSON sonuc doner
                |     |
                |     +-- env.DISPATCHER.get("plugin-social-share")
                |     |     \-> [Izole V8 Isolate] -> JSON sonuc doner
                |     |
                |     +-- Sonuclari birlestir, devam et
                |
                +-- Route handler (icerik render)
```

### Temel Bilesenler

**1. Dispatch Namespace** (plugin container)
- `plugins` adinda bir namespace olusturulur
- Her plugin bu namespace icine ayri bir Worker olarak deploy edilir
- Default olarak "untrusted mode" - tam izolasyon

**2. Dynamic Dispatch Worker** (ana wp-cms worker'imiz)
- `env.DISPATCHER.get("plugin-slug")` ile plugin Worker'i cagirir
- Custom limits belirler: `{ cpuMs: 10, subRequests: 5 }`
- Plugin'e sadece gerekli veriyi JSON olarak gonderir
- Plugin'den donen JSON'u validate eder

**3. User Workers** (plugin kodlari)
- Her plugin kendi izole V8 isolate'inde calisir
- Sadece kendisine gonderilen veriyi gorebilir
- Ana DB'ye, R2'ye, diger plugin'lere erisemez
- CPU/subrequest limitleri zorunlu

### Avantajlar
| Ozellik | Mevcut | Workers for Platforms |
|---------|--------|----------------------|
| Izolasyon | Yok (ayni process) | Tam V8 isolate |
| CPU Limit | Yok | cpuMs: 10-50ms (plan bazli) |
| Network | Sinirsiz fetch | subRequests: 0-5 (kontrol edilir) |
| DB Erisim | Potansiyel | Imkansiz (binding yok) |
| Hata Izolasyonu | try/catch | Process seviyesi |
| Dynamic Plugin | Imkansiz (static import) | API ile deploy |
| 3. Parti Plugin | Imkansiz | Mumkun (marketplace) |

---

## Implementasyon Plani

### Faz 1: Altyapi - Dispatch Namespace ve Wrangler Config

**1.1 Dispatch namespace olustur (CF API ile)**
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/dispatch/namespaces" \
  -H "Authorization: Bearer {token}" \
  -d '{"name": "plugins"}'
```

**1.2 wrangler.workercms.toml'a dispatch binding ekle**
```toml
[[dispatch_namespaces]]
binding = "DISPATCHER"
namespace = "plugins"
```

**1.3 wrangler.girisadresi.toml'a da ayni binding**

**1.4 src/types.ts'e Bindings'e DISPATCHER ekle**
```ts
interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
  DISPATCHER: DispatchNamespace; // yeni
}
```

### Faz 2: Plugin Worker Sablonu

**2.1 Yeni dosya: `src/lib/plugins/worker-template.ts`**

Her plugin Worker'in uymasi gereken arayuz:
```ts
// Plugin Worker'in export etmesi gereken handler
export default {
  async fetch(request: Request): Promise<Response> {
    const { hook, args, settings } = await request.json();

    // Hook'a gore islem yap
    switch (hook) {
      case 'post.beforeRender':
        const [html, post] = args;
        const result = processContent(html, post, settings);
        return Response.json({ result });

      case 'page.head':
        const [headHtml, site] = args;
        const headResult = injectHead(headHtml, site, settings);
        return Response.json({ result: headResult });

      default:
        return Response.json({ result: args[0] }); // passthrough
    }
  }
}
```

**2.2 Yeni dosya: `src/lib/plugins/dispatcher.ts`**

Ana Worker'dan plugin Worker'lari cagiran katman:
```ts
async function dispatchToPlugin(
  dispatcher: DispatchNamespace,
  pluginSlug: string,
  hook: string,
  args: any[],
  settings: Record<string, any>,
  limits: { cpuMs: number; subRequests: number }
): Promise<any> {
  try {
    const worker = dispatcher.get(`plugin-${pluginSlug}`, {}, { limits });
    const response = await worker.fetch(new Request('https://plugin.internal/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hook, args: sanitizeArgs(hook, args), settings }),
    }));

    if (!response.ok) throw new Error(`Plugin ${pluginSlug} returned ${response.status}`);
    const data = await response.json();
    return data.result;
  } catch (err) {
    console.error(`Plugin ${pluginSlug} dispatch error:`, err.message);
    return args[0]; // fallback: orijinal degeri dondur
  }
}

// Hassas alanlari temizle - plugin'e sadece gerekli veri gider
function sanitizeArgs(hook: string, args: any[]): any[] {
  // post objesinden password, author bilgisi vb. cikar
  // site objesinden credentials cikar
  // ...
}
```

### Faz 3: Middleware Guncelleme

**3.1 Degisiklik: `src/middleware/pluginHooks.ts`**

Iki modlu calisma: built-in pluginler hala statik, 3. parti pluginler dispatch uzerinden.

```ts
for (const plugin of activePlugins) {
  const mod = pluginRegistry[plugin.entry_point];
  if (mod) {
    // Built-in plugin: mevcut yontem (hizli, ayni process)
    mod.register(pluginEngine, settings);
  } else if (c.env.DISPATCHER) {
    // 3. parti plugin: dispatch namespace uzerinden (izole)
    registerDispatchedPlugin(pluginEngine, c.env.DISPATCHER, plugin, settings);
  }
}
```

`registerDispatchedPlugin` her hook icin bir wrapper kaydeder:
```ts
function registerDispatchedPlugin(engine, dispatcher, plugin, settings) {
  const hooks = JSON.parse(plugin.hooks || '[]');
  const permissions = JSON.parse(plugin.permissions || '[]');
  const limits = getLimitsForPlugin(plugin); // plan bazli

  for (const hook of hooks) {
    engine.register(plugin.slug, hook, async (...args) => {
      return dispatchToPlugin(dispatcher, plugin.slug, hook, args, settings, limits);
    });
  }
}
```

### Faz 4: Plugin Deploy API

**4.1 Degisiklik: `src/routes/api/plugins.ts`**

Yeni endpoint: `POST /api/plugins/deploy` (super_admin)
- Plugin kodunu body'den al
- CF API ile dispatch namespace'e Worker olarak deploy et
- DB'ye plugin kaydini ekle
- Manifest'ten hooks ve permissions parse et

```ts
// CF API ile plugin deploy
async function deployPluginWorker(
  accountId: string, apiToken: string,
  namespace: string, pluginSlug: string, code: string
) {
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/dispatch/namespaces/${namespace}/scripts/plugin-${pluginSlug}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${apiToken}` },
      body: code, // veya FormData ile metadata
    }
  );
}
```

Yeni endpoint: `DELETE /api/plugins/:slug/undeploy` (super_admin)
- CF API ile Worker'i namespace'den sil

### Faz 5: Admin UI - Plugin Marketplace & Upload

**5.1 admin/src/pages/plugins/PluginList.tsx guncellemesi**
- "Plugin Yukle" butonu (kod dosyasi upload)
- Her plugin icin: izinler badge, CPU limit gosterge, deploy durumu
- Aktif/pasif toggle

**5.2 Yeni: admin/src/pages/plugins/PluginUpload.tsx**
- Plugin kodu (JS/TS) upload
- Manifest.json upload veya inline tanimlama
- Permissions secimi (checklist)
- Hook secimi
- "Deploy" butonu -> API'ye gonder

### Faz 6: Guvenlik Katmani

**6.1 Plugin Validasyonu (deploy oncesi)**
- Manifest.json schema validasyonu
- Yasakli API kullanimlari kontrol (eval, Function constructor, import)
- Boyut limiti (max 1MB)
- Hook uyumlulugu kontrolu

**6.2 Runtime Guvenlik**
- Custom limits: plan bazli CPU (free:10ms, pro:20ms, enterprise:50ms)
- SubRequest limitleri (free:0, pro:5, enterprise:50)
- Response boyut limiti (max 256KB)
- Timeout handling (dispatcher.get timeout)

**6.3 Outbound Worker (opsiyonel, ileri seviye)**
- Plugin'lerin disariya yapabilecegi HTTP isteklerini kontrol et
- Domain whitelist/blacklist
- wrangler.toml'da outbound worker tanimla

---

## Kritik Dosyalar

### Yeni Dosyalar
| Dosya | Aciklama |
|-------|----------|
| `src/lib/plugins/dispatcher.ts` | Dispatch namespace ile plugin cagirma |
| `src/lib/plugins/worker-template.ts` | Plugin Worker sablonu |
| `src/lib/plugins/validator.ts` | Plugin kod validasyonu (deploy oncesi) |
| `admin/src/pages/plugins/PluginUpload.tsx` | Plugin yukleme UI |

### Degistirilecek Dosyalar
| Dosya | Degisiklik |
|-------|-----------|
| `wrangler.workercms.toml` | dispatch_namespaces binding |
| `wrangler.girisadresi.toml` | dispatch_namespaces binding |
| `src/types.ts` | Bindings'e DISPATCHER ekle |
| `src/middleware/pluginHooks.ts` | Iki modlu calisma (built-in + dispatched) |
| `src/routes/api/plugins.ts` | Deploy/undeploy endpoint'leri |
| `admin/src/pages/plugins/PluginList.tsx` | Deploy durumu, limit gosterge |
| `admin/src/lib/api.ts` | deployPlugin, undeployPlugin metodlari |

---

## Dogrulama

1. Dispatch namespace olustur, test plugin deploy et
2. Ana worker'dan dispatch ile plugin cagir, sonuc donmesini dogrula
3. CPU limit asiminda exception firlatildigini test et
4. Plugin hata firlattiginda ana worker'in etkilenmedigini dogrula
5. Built-in pluginler hala eskisi gibi calisiyor mu (regression)
6. Admin panelden plugin yukleme ve aktiflesme akisi

---

## Onemli Notlar

- Workers for Platforms **paid plan** gerektirir (Workers Paid + WfP eklentisi)
- Her plugin Worker bir subrequest sayilir (istek basina max 50 free / 10000 paid)
- Built-in 4 plugin icin dispatch kullanmaya gerek yok (performans icin statik kalsin)
- Dispatch namespace basina **sinirsiz** Worker deploy edilebilir
- Plugin Worker'lar ~5ms cold start (V8 isolate, container degil)

---

# (TAMAMLANDI) FTS5 Search + Visual Schema Builder

Asagidaki bolumler zaten implement edildi ve deploy edildi.

## FAZA 1: FTS5 Full-Text Search (en dusuk risk, en yuksek etki)

### 1.1 Migration: `src/db/migrations/018_fts5_search.sql`
- `posts_fts` FTS5 virtual table (title, content, excerpt) - `tokenize='porter unicode61'`
- `posts_fts_map` mapping table (rowid, post_id, site_id, language, status) - site bazli filtreleme icin
- `search_logs` table (site_id, query, results_count, language, created_at)
- Schema.sql guncelleme

### 1.2 Yeni dosya: `src/lib/search.ts`
- `stripHtml(html)` - icerikten HTML etiketleri temizle
- `indexPost(db, post)` - FTS5 indexe ekle/guncelle (posts_fts + posts_fts_map)
- `deindexPost(db, postId)` - indexten sil
- `searchPostsFTS(db, siteId, query, lang, page, perPage)` - BM25 siralama ile arama (agirliklar: title=10, content=1, excerpt=5)
- `rebuildIndex(db, siteId?)` - tum indexi yeniden olustur (100'lu batch)
- `logSearch(db, siteId, query, count, lang)` - arama logu

### 1.3 Degisiklik: `src/lib/public-db.ts` (satir 567-599)
- `searchPosts` fonksiyonunu FTS5 ile degistir
- FTS5 tablo yoksa LIKE fallback kalsın

### 1.4 Degisiklik: `src/routes/api/posts.ts`
- POST (yeni post): `waitUntil(indexPost(...))`
- PUT (guncelle): `waitUntil(indexPost(...))`
- DELETE: `waitUntil(deindexPost(...))`
- GET search parametresi: FTS5 subquery kullan, hata durumunda LIKE fallback
- Yeni endpoint: `POST /api/posts/rebuild-search-index` (admin only)

### 1.5 Degisiklik: `src/routes/public/search.tsx`
- `waitUntil(logSearch(...))` ile arama logla

---

## FAZA 2: Plugin Sandbox Izolasyonu

### 2.1 Migration: `src/db/migrations/019_plugin_sandbox.sql`
- `plugins` tablosuna `permissions` TEXT kolonu ekle
- `plugin_execution_logs` tablosu (site_id, plugin_slug, hook, duration_ms, status, error_message, created_at)
- Mevcut pluginlerin permissions alanlarini guncelle (UPDATE)

### 2.2 Yeni dosya: `src/lib/plugins/permissions.ts`
Izin tanimlari:
```
posts:read, posts:write, media:read, media:write,
settings:read, settings:write, comments:read, comments:write,
http:fetch, page:inject
```
- `HOOK_REQUIRED_PERMISSIONS` map: her hook icin gerekli izinler
  - `post.beforeSave` -> `['posts:read', 'posts:write']`
  - `post.afterSave` -> `['posts:read']`
  - `post.beforeRender` -> `['posts:read']`
  - `page.head/bodyStart/bodyEnd` -> `['page:inject']`
  - `comment.beforeSave` -> `['comments:read', 'comments:write']`
  - `media.afterUpload` -> `['media:read']`
- `PERMISSION_DESCRIPTIONS` - UI icin aciklamalar
- `validatePermissions(perms)` - gecerlilik kontrolu

### 2.3 Yeni dosya: `src/lib/plugins/sandbox.ts`
`SandboxedPluginContext` sinifi:
- Constructor: pluginSlug, permissions[], pluginEngine ref, timeoutMs=5000
- `register(hook, handler, priority)`:
  1. Hook icin gerekli izinleri kontrol et (HOOK_REQUIRED_PERMISSIONS)
  2. Izin yoksa -> warning log, registration atla
  3. Handler'i `safeHandler` ile sar: try/catch, timing olcumu
  4. Gercek engine.register'a delegate et
- `createPluginSandbox(slug, perms, engine)` factory fonksiyonu

### 2.4 Degisiklik: `src/middleware/pluginHooks.ts` (satir 56-65)
```ts
// ONCE:
mod.register(pluginEngine, settings);
// SONRA:
const permissions = plugin.permissions ? JSON.parse(plugin.permissions) : [];
const sandbox = createPluginSandbox(plugin.slug, permissions, pluginEngine);
mod.register(sandbox, settings);
```
pluginRegistry tip tanimini `SandboxedPluginContext` ile uyumlu yap.

### 2.5 Degisiklik: `src/lib/plugins/types.ts`
- `PluginPermission` type ekle
- `PluginManifest.permissions` tipini `PluginPermission[]` yap

### 2.6 4 built-in plugin (tip degisikligi - mantik ayni)
- `src/plugins/seo-optimizer/index.ts`
- `src/plugins/social-share/index.ts`
- `src/plugins/contact-form/index.ts`
- `src/plugins/hero-slider/index.ts`
Register fonksiyonu parametre tipi: `typeof pluginEngine` -> `SandboxedPluginContext`

### 2.7 Degisiklik: `src/routes/api/plugins.ts`
- POST: `permissions` alanini body'den al, validate et, DB'ye kaydet
- GET: permissions alanini response'a ekle

### 2.8 Admin UI degisiklikleri
- `admin/src/pages/plugins/PluginList.tsx`: Her plugin icin izin badge'leri (read=mavi, write=amber, fetch=turuncu)
- `admin/src/pages/plugins/PluginSettings.tsx`: "Gerekli Izinler" bolumu

---

## FAZA 3: Visual Schema Builder

### 3.1 Migration: `src/db/migrations/020_content_types.sql`
```sql
CREATE TABLE content_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  name_singular TEXT,
  name_plural TEXT,
  description TEXT,
  icon TEXT DEFAULT 'file-text',
  fields TEXT NOT NULL DEFAULT '[]',  -- JSON field definitions
  supports TEXT DEFAULT '["title","editor","excerpt","thumbnail"]',
  taxonomies TEXT DEFAULT '["category","tag"]',
  has_archive INTEGER DEFAULT 1,
  is_hierarchical INTEGER DEFAULT 0,
  menu_position INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active',
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, slug),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
CREATE INDEX idx_content_types_site ON content_types(site_id, status);
```

### 3.2 Yeni dosya: `src/lib/content-types.ts`
TypeScript interfaceleri:
- `ContentTypeField`: key, label, type (FieldType), required, default_value, placeholder, description, options[], validation{min,max,pattern,message}, position, width(full/half)
- `FieldType`: text | textarea | richtext | number | date | datetime | select | multiselect | checkbox | radio | image | file | color | url | email | relation
- `ContentType`: DB tablo aynasi
- `validateFieldDefinitions(fields)` - key uniqueness, gecerli tipler
- `getFieldDefaults(type)` - alan tipi varsayilanlari
- `validatePostMeta(meta, fields)` - meta validasyonu

### 3.3 Yeni dosya: `src/routes/api/content-types.ts`
Hono router (authMiddleware, requireRole('admin'), requireSite):
- `GET /` - Site icerik tiplerini listele (+ sanal 'post', 'page')
- `GET /:slug` - Tek icerik tipi
- `POST /` - Yeni olustur (slug validasyonu, 'post'/'page' yasak)
- `PUT /:slug` - Guncelle
- `DELETE /:slug` - status='inactive' yap

### 3.4 Degisiklik: `src/index.ts`
Route kaydi: `app.route('/api/content-types', contentTypesRoutes)`

### 3.5 Degisiklik: `src/routes/api/posts.ts`
- POST/PUT: Custom post_type ise content_types'dan field schema yukle, meta validasyonu yap
- GET /:id: Custom tip ise `content_type_fields` response'a ekle

### 3.6 Admin UI - Field Components
- `admin/src/components/fields/DynamicField.tsx` - FieldType'a gore dogru input render et (switch)
- `admin/src/components/fields/RelationField.tsx` - Aranabilir post dropdown
- `admin/src/components/fields/MediaPickerField.tsx` - Gorsel/dosya secici (mevcut featured image pattern'i yeniden kullan)

### 3.7 Admin UI - Content Type Yonetimi
- `admin/src/pages/content-types/ContentTypeList.tsx` - Liste (isim, slug, alan sayisi, durum badge)
- `admin/src/pages/content-types/ContentTypeEditor.tsx`:
  - Sol panel: Genel ayarlar (isim, slug, ikon, destekler, taksonomiler)
  - Sag panel: Alan builder (sirali liste, yukari/asagi, alan ekleme modali, inline duzenle)
  - Alan ekleme: alan tipi kartlari grid, her biri icin ayar formu

### 3.8 Degisiklik: `admin/src/pages/posts/PostEditor.tsx`
- Custom post_type icin content_types'dan field schema fetch et
- "Custom Fields" bolumu render et (DynamicField componentleri)
- Save'de customMeta'yi meta objesine merge et

### 3.9 Degisiklik: `admin/src/lib/api.ts`
- `getContentTypes()`, `getContentType(slug)`, `createContentType(data)`, `updateContentType(slug, data)`, `deleteContentType(slug)`

### 3.10 Degisiklik: `admin/src/App.tsx`
Yeni route'lar: `/content-types`, `/content-types/new`, `/content-types/:slug/edit`, `/content/:type`, `/content/:type/new`, `/content/:type/:id`

### 3.11 Degisiklik: `admin/src/components/layout/Sidebar.tsx`
Content types'i fetch edip sidebar'a dinamik nav item ekle

---

## Dosya Ozeti

### Yeni Dosyalar (12)
| Dosya | Aciklama |
|-------|----------|
| `src/db/migrations/018_fts5_search.sql` | FTS5 migration |
| `src/db/migrations/019_plugin_sandbox.sql` | Plugin sandbox migration |
| `src/db/migrations/020_content_types.sql` | Content types migration |
| `src/lib/search.ts` | FTS5 arama kutuphanesi |
| `src/lib/plugins/permissions.ts` | Izin tanimlari ve haritasi |
| `src/lib/plugins/sandbox.ts` | Sandboxed plugin context |
| `src/lib/content-types.ts` | Icerik tipi kutuphanesi |
| `src/routes/api/content-types.ts` | Content types API |
| `admin/src/components/fields/DynamicField.tsx` | Dinamik alan render |
| `admin/src/components/fields/RelationField.tsx` | Iliski alani |
| `admin/src/components/fields/MediaPickerField.tsx` | Medya secici |
| `admin/src/pages/content-types/ContentTypeList.tsx` | CT liste sayfasi |
| `admin/src/pages/content-types/ContentTypeEditor.tsx` | CT editor sayfasi |

### Degistirilecek Dosyalar (14)
| Dosya | Degisiklik |
|-------|-----------|
| `src/db/schema.sql` | Yeni tablolar |
| `src/lib/public-db.ts` | searchPosts -> FTS5 |
| `src/lib/plugins/types.ts` | PluginPermission tipi |
| `src/lib/plugins/engine.ts` | - (degismez, sandbox sarar) |
| `src/middleware/pluginHooks.ts` | Sandbox entegrasyonu |
| `src/routes/api/posts.ts` | FTS5 index + custom type validasyonu |
| `src/routes/api/plugins.ts` | Permissions alani |
| `src/routes/public/search.tsx` | Arama loglama |
| `src/index.ts` | content-types route kaydi |
| `src/plugins/*/index.ts` (x4) | Parametre tipi guncelleme |
| `admin/src/lib/api.ts` | Content type API metodlari |
| `admin/src/App.tsx` | Yeni route'lar |
| `admin/src/pages/posts/PostEditor.tsx` | Dinamik custom fields |
| `admin/src/pages/plugins/PluginList.tsx` | Izin badge'leri |
| `admin/src/components/layout/Sidebar.tsx` | Dinamik nav |

---

## FAZA 4: KV Caching Layer (Yuksek Oncelik)

### Neden?
Suan sadece statik asset cache var. Her public sayfa istegi DB'ye gidiyor. KV ile edge caching buyuk performans kazandirır.

### 4.1 KV Namespace Binding

**wrangler.workercms.toml & wrangler.girisadresi.toml:**
```toml
[[kv_namespaces]]
binding = "CACHE"
namespace_id = "..."
```

**src/types.ts:** `Bindings`'e `CACHE?: KVNamespace` ekle (optional - olmadan da calissin)

### 4.2 Yeni dosya: `src/lib/cache.ts`
```ts
// Site bazli cache key: "site:{siteId}:{prefix}:{hash}"
function cacheKey(siteId: number, prefix: string, ...parts: string[]): string

async function cacheGet<T>(kv: KVNamespace, key: string): Promise<T | null>
async function cacheSet(kv: KVNamespace, key: string, value: any, ttlSeconds: number): Promise<void>
async function cacheDelete(kv: KVNamespace, key: string): Promise<void>

// Prefix bazli toplu silme (KV list + delete)
async function cachePurge(kv: KVNamespace, siteId: number, prefix?: string): Promise<void>

// Cache-aside pattern wrapper
async function cached<T>(
  kv: KVNamespace | undefined, key: string, ttl: number,
  fetcher: () => Promise<T>
): Promise<T>
```

### 4.3 Cache Stratejisi
| Veri | TTL | Invalidation Tetikleyici |
|------|-----|--------------------------|
| Public sayfa HTML | 5 dk | Post save/delete |
| Site theme/settings | 10 dk | Settings update |
| Menu/sidebar data | 10 dk | Menu update |
| FTS5 search sonuclari | 2 dk | Post save/delete |
| Analytics overview | 5 dk | - (TTL expire) |
| Content type fields | 30 dk | Content type update |
| Plugin listesi | 15 dk | Plugin activate/deactivate |

### 4.4 Cache Invalidation Entegrasyonu
- `src/routes/api/posts.ts` POST/PUT/DELETE -> `cachePurge(kv, siteId, 'page')` + `cachePurge(kv, siteId, 'search')`
- `src/routes/api/settings.ts` PUT -> `cachePurge(kv, siteId, 'theme')`
- `src/routes/api/menus.ts` PUT -> `cachePurge(kv, siteId, 'menu')`
- `src/routes/api/plugins.ts` activate/deactivate -> `cachePurge(kv, siteId, 'plugin')`
- `src/routes/api/content-types.ts` POST/PUT/DELETE -> `cachePurge(kv, siteId, 'ctype')`

### 4.5 Degisiklik: `src/lib/public-db.ts`
En cok kullanilan fonksiyonlari `cached()` wrapper ile sar:
- `getSiteTheme()` -> cached 10dk
- `searchPosts()` -> cached 2dk
- `getMenuByLocation()` -> cached 10dk
- `getSidebarData()` -> cached 10dk

### Dosyalar
| Dosya | Aciklama |
|-------|----------|
| `src/lib/cache.ts` | **Yeni** - Cache utility |
| `wrangler.workercms.toml` | KV binding |
| `wrangler.girisadresi.toml` | KV binding |
| `src/types.ts` | CACHE binding (optional) |
| `src/lib/public-db.ts` | cached() wrapper ekle |
| `src/routes/api/posts.ts` | Cache invalidation |
| `src/routes/api/settings.ts` | Cache invalidation |
| `src/routes/api/menus.ts` | Cache invalidation |

---

## FAZA 5: Page View Recording (Orta Oncelik)

### Neden?
`page_views` tablosu ve analytics dashboard mevcut ama frontend'den view kaydetme mekanizmasi yok. Analytics bos.

### 5.1 Degisiklik: `src/routes/api/analytics.ts`

Yeni endpoint: `POST /api/analytics/pageview` (auth gerektirmez, site bazli)
```ts
// Body: { path: string, referrer?: string, post_id?: number }
// Otomatik: IP (cf-connecting-ip), country (request.cf?.country), user_agent
// Rate limit: IP basina dakikada 30 pageview
// Bot filtreleme: known bot user-agent'lari atla
// waitUntil ile async insert (response bekletmez)
```

### 5.2 Server-Side Tracking (daha guvenilir)

Public route handler'larinda `waitUntil` ile otomatik kayit:
```ts
// src/middleware/pageViewTracker.ts (yeni middleware)
// Her public GET isteginde:
// 1. Bot mu kontrol et (user-agent)
// 2. Static asset mi? (.js, .css, .png vs.) -> atla
// 3. waitUntil(db.prepare('INSERT INTO page_views...'))
```

Bu yaklasim JS-disabled ziyaretcileri de yakalar ve adblock'tan etkilenmez.

### Dosyalar
| Dosya | Aciklama |
|-------|----------|
| `src/middleware/pageViewTracker.ts` | **Yeni** - Server-side tracking |
| `src/routes/api/analytics.ts` | pageview POST endpoint (optional client-side) |
| `src/index.ts` | Middleware kaydi (public route'lar icin) |

---

## FAZA 6: Content Revision History (Orta Oncelik)

### Neden?
Icerik degisiklik gecmisi CMS icin kritik. Yanlislikla degistirilen/silinen icerik kurtarilamaz.

### 6.1 Migration: `src/db/migrations/021_post_revisions.sql`
```sql
CREATE TABLE post_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  site_id INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  meta TEXT,              -- JSON: post_meta snapshot
  revision_type TEXT DEFAULT 'manual',  -- manual | autosave
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
CREATE INDEX idx_revisions_post ON post_revisions(post_id, created_at DESC);
```

### 6.2 Yeni dosya: `src/lib/revisions.ts`
```ts
async function createRevision(db, post, userId, type='manual'): Promise<number>
async function getRevisions(db, postId, limit=20): Promise<Revision[]>
async function getRevision(db, revisionId): Promise<Revision | null>
async function restoreRevision(db, revisionId, userId): Promise<void>
  // 1. Mevcut post'un snapshot'ini revision olarak kaydet
  // 2. Secilen revision'in degerlerini post'a yaz
  // 3. FTS5 index guncelle
async function cleanupRevisions(db, postId, keepCount=50): Promise<void>
  // En yeni keepCount revision haric tumunu sil
```

### 6.3 Degisiklik: `src/routes/api/posts.ts`
- PUT (guncelleme): degisiklik oncesi `waitUntil(createRevision(db, existing, userId, 'manual'))`
- Yeni endpoint: `GET /api/posts/:id/revisions` - revision listesi (editor+)
- Yeni endpoint: `GET /api/posts/:id/revisions/:revId` - tek revision detay
- Yeni endpoint: `POST /api/posts/:id/revisions/:revId/restore` - geri yukle (admin+)
- Yeni endpoint: `POST /api/posts/:id/autosave` - autosave revision (5 dk interval, eski autosave'leri temizle)

### 6.4 Admin UI
- `admin/src/pages/posts/PostEditor.tsx`: Sag sidebar'a "Revizyonlar" paneli
  - Revision listesi (tarih, yazar)
  - "Geri Yukle" butonu (onay diyalogu)
  - Basit diff gosterimi (karakter sayisi farki)

### Dosyalar
| Dosya | Aciklama |
|-------|----------|
| `src/db/migrations/021_post_revisions.sql` | **Yeni** - Revision tablosu |
| `src/lib/revisions.ts` | **Yeni** - Revision islemleri |
| `src/routes/api/posts.ts` | Revision kaydi + 4 yeni endpoint |
| `admin/src/pages/posts/PostEditor.tsx` | Revizyonlar paneli |
| `admin/src/lib/api.ts` | getRevisions, restoreRevision metodlari |

---

## FAZA 2 Eki: Plugin Execution Logging

### Neden?
`plugin_execution_logs` tablosu migration'da tanimli ama loglama kodu detaylandirilmamis.

### Ek 2.A: Loglama implementasyonu

`src/lib/plugins/sandbox.ts` icindeki `safeHandler` wrapper'a eklenmeli:
```ts
async function logPluginExecution(
  db: D1Database, siteId: number, pluginSlug: string,
  hook: string, durationMs: number,
  status: 'success' | 'error' | 'timeout',
  errorMessage?: string
): Promise<void> {
  await db.prepare(
    `INSERT INTO plugin_execution_logs
     (site_id, plugin_slug, hook, duration_ms, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(siteId, pluginSlug, hook, durationMs, status, errorMessage || null).run();
}
```

`dispatcher.ts` (Workers for Platforms): dispatch sonrasi da ayni loglama.

### Ek 2.B: Cleanup cron
`src/index.ts` scheduled handler'a ekle:
```ts
// 30 gun'den eski plugin loglarini sil
await env.DB.prepare(
  "DELETE FROM plugin_execution_logs WHERE created_at < datetime('now', '-30 days')"
).run();
```

### Ek 2.C: Admin UI
- Yeni endpoint: `GET /api/plugins/:slug/logs?days=7` (admin+)
- `admin/src/pages/plugins/PluginLogs.tsx`: **Yeni** sayfa
  - Tablo: tarih, hook, sure(ms), durum badge (success/error/timeout)
  - Filtreleme: plugin, hook, status, tarih
  - Ozet: ortalama sure, hata orani, toplam cagri

### Dosyalar
| Dosya | Aciklama |
|-------|----------|
| `src/lib/plugins/sandbox.ts` | logPluginExecution entegrasyonu |
| `src/lib/plugins/dispatcher.ts` | Dispatch loglama |
| `src/routes/api/plugins.ts` | `GET /:slug/logs` endpoint |
| `src/index.ts` | Log cleanup cron |
| `admin/src/pages/plugins/PluginLogs.tsx` | **Yeni** - Log sayfasi |

---

## FAZA Outbound Worker (Ileri Seviye - WfP ile birlikte)

### Neden?
3. parti plugin'ler `http:fetch` izniyle disariya istek yapabilir. Domain kontrolu olmadan veri sizintisi riski var.

### Outbound Filter Worker
**Yeni Worker: `workers/plugin-outbound-filter/index.ts`**
```ts
export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const allowList = env.allow_list; // dispatch parameter olarak gelir

    // Yasakli hedefler (her zaman engelle)
    if (isInternalIP(url.hostname)) return new Response('Blocked', { status: 403 });
    if (url.hostname === 'localhost') return new Response('Blocked', { status: 403 });
    if (url.hostname.endsWith('.internal')) return new Response('Blocked', { status: 403 });

    // Plugin'in allowed_domains listesine gore kontrol
    if (allowList && !matchesDomain(url.hostname, JSON.parse(allowList))) {
      return new Response('Domain not allowed', { status: 403 });
    }

    // Response boyut limiti (256KB)
    const response = await fetch(request);
    // ... boyut kontrolu
    return response;
  }
}
```

### wrangler.workercms.toml eki:
```toml
[[dispatch_namespaces]]
binding = "DISPATCHER"
namespace = "plugins"
outbound = { service = "plugin-outbound-filter", parameters = ["allow_list"] }
```

### DB degisikligi:
`plugins` tablosuna `allowed_domains TEXT` kolonu (JSON array)

### Admin UI:
`PluginSettings.tsx`'e "Izin Verilen Domainler" tag input alani

---

## Guncellenmiş Faz Sirasi (Onerilen Implementasyon Sirasi)

| Sira | Faz | Durum | Oncelik |
|------|-----|-------|---------|
| 1 | FTS5 Full-Text Search | ✅ Bitti | - |
| 2 | Plugin Sandbox (permissions + logging) | ❌ Yapilacak | Yuksek |
| 3 | Visual Schema Builder | ✅ Bitti | - |
| 4 | KV Caching Layer | ❌ Yapilacak | Yuksek |
| 5 | Page View Recording | ❌ Yapilacak | Orta |
| 6 | Content Revision History | ❌ Yapilacak | Orta |
| 7 | Workers for Platforms + Outbound | ❌ Yapilacak | Dusuk (paid plan) |

---

## Dogrulama

### FTS5 Search Test (✅ Bitti)
1. Migration calistir, rebuild-search-index endpoint'ini cagir
2. Mevcut LIKE aramasiyla ayni sonuclari verdigini dogrula
3. Turkce kelime koklerinde (porter stemming) dogru calistigini test et
4. BM25 siralama: baslikta gecen terim daha ust sirada mi?

### Plugin Sandbox Test
1. Manifest'te olmayan bir hook'a register etmeye calis -> skip edilmeli
2. Plugin hata firlatirsa -> catch edilmeli, diger pluginler etkilenmemeli
3. Admin panelde izin badge'leri gorunmeli
4. Plugin execution log'lari DB'ye yaziliyor mu?
5. 30 gun'den eski loglar cron ile temizleniyor mu?

### Visual Schema Builder Test (✅ Bitti)
1. Admin panelden yeni icerik tipi olustur (orn: "Urun")
2. Alanlar ekle (fiyat:number, renk:color, gorsel:image)
3. PostEditor'da bu alanlar gorunmeli
4. Post kaydettiginde post_meta'ya dogru yazilmali
5. Sidebar'da yeni icerik tipi gorunmeli

### KV Caching Test
1. KV namespace olustur, binding dogrula
2. Public sayfa ilk istek -> DB, ikinci istek -> KV cache
3. Post kaydet -> cache purge -> ucuncu istek -> DB (taze veri)
4. TTL suresi dolunca otomatik refresh
5. CACHE binding olmadan da calistigindan emin ol (graceful degradation)

### Page View Recording Test
1. Public sayfaya istek at -> page_views'a kayit ekleniyor mu?
2. Bot user-agent'lari filtreleniyor mu?
3. Static asset istekleri (.js, .css) kayit OLMADIGINDAN emin ol
4. Analytics dashboard'da veriler gorunuyor mu?

### Content Revision History Test
1. Post guncelle -> revision olusur mu?
2. Revision listesi dogru sirada mi? (en yeni ust)
3. Restore: eski revision'i yukle -> post guncellenir + yeni revision olusur mu?
4. Cleanup: 50'den fazla revision varsa eski olanlar temizleniyor mu?
5. Autosave: 5 dk interval, eski autosave'ler temizleniyor mu?
