# worker-ai-bot ↔ WorkerCms Integration — Status & Roadmap

**Tarih:** 2026-04-20
**Durum:** Faz 1-2 canlı; Faz 3+ açık (theme studio bittikten sonra devam)
**Kapsam:** bot.workercms.com (cms-hub) ile workercms.com / girisadresi.org / thinktmed / vb. WorkerCms instance'ları arasında çift yönlü içerik akışı.

> **Terminoloji:** Kullanıcı "worker-ai-bot" dediğinde **cms-hub** kastediliyor. Domain `bot.workercms.com`, kod tabanı adı `cms-hub`. İki taraf:
> - **WorkerCms** = `worker-cms-react` repo, `wp-cms` Cloudflare worker, workercms.com / girisadresi.org / thinktmed.com / tersnet.com / smaille.com / beluga-giris.net hizmet ediyor
> - **worker-ai-bot** = `cms-hub` repo, `cms-hub` Cloudflare worker, bot.workercms.com hizmet ediyor

---

## 1. Tamamlanan İşler (canlı)

### A — WorkerCms tarafı (worker-cms-react)

**Migration `023_user_scoped_api_keys.sql`** uygulandı (workercms cms-db + girisadresi cms-db):
- `api_keys` tablosu yeniden kuruldu: `scope` (`'site'` | `'user'`), `site_id` nullable, CHECK constraint
- SHA-256 hash → tek satır lookup (PBKDF2 yerine)
- Mevcut key'lerin tümü `wcms_` prefix ile yeni format

**Yeni middleware:** [`userApiKeyAuth`](../../src/middleware/auth.ts)
- `X-API-Key` veya `Authorization: Bearer` ile key kabul eder
- Hem scope='user' hem scope='site' key'leri kabul eder
- `c.var.user`, `c.var.apiKeyScope`, `c.var.apiKeySiteId` set eder

**Yeni route grubu:** [`/api/external/*`](../../src/routes/api/external.ts) — userApiKeyAuth
- `GET /me` — kullanıcı bilgisi (auth probe)
- `GET /sites` — kullanıcının erişebildiği siteler (scope='site' ise sadece bağlı site)
- `GET /sites/:id/categories|tags` — taksonomi listesi
- `POST /sites/:id/posts` — içerik oluştur (categories/tags string slug ile auto-create)
- `POST /sites/:id/media` — multipart upload, R2'ye yazar, public URL döner

**Yeni route grubu:** [`/api/account/*`](../../src/routes/api/external.ts) — JWT
- `GET /keys`, `POST /keys`, `DELETE /keys/:id` — kullanıcının kendi user-scoped key'leri

**Admin UI değişiklikleri:**
- [API Anahtarları sayfası](../../admin/src/pages/settings/ApiKeys.tsx): "Bu Site" / "Hesabım (Tüm Siteler)" tab toggle
- Account tab'ında bilgilendirme banner'ı: "worker-ai-bot bu anahtarı kullanır"

### B — worker-ai-bot tarafı (cms-hub)

**Migration `0015_workercms_platform.sql`** uygulandı (cms-hub-db):
- `sites` tablosuna `workercms_remote_site_id INTEGER` + `workercms_base_url TEXT` + indeks

**Adapter interface genişletildi:** [`_base.ts`](../../../cms-hub/worker/src/adapters/_base.ts)
- `platform: 'wordpress' | 'xenforo' | 'workercms'`

**Yeni adapter:** [`WorkerCmsAdapter`](../../../cms-hub/worker/src/adapters/workercms/index.ts)
- `testConnection()` — `/api/external/me` çağırır
- `listSites()` — `/api/external/sites`
- `listCategories(siteId)`, `listTags(siteId)` — taksonomi listesi
- `createPost(siteId, input)` — `POST /api/external/sites/:id/posts`
- `uploadMedia(siteId, file)` — multipart, `POST /api/external/sites/:id/media`

**Sites route'a eklendi (sub-router pattern):** [`/api/app/sites/workercms/*`](../../../cms-hub/worker/src/routes/sites.ts)
- `POST /test` — anahtar doğrulama
- `POST /discover` — site preview (kayıt yapmaz)
- `POST /connect` — discover + tüm siteleri içe aktar (bir sites row'u her remote site için)
- `POST /refresh` — base_url'e göre re-sync (yeni ekle, mevcut update; orphan döner)

**Sub-router gerekçesi:** Inline `sitesRoutes.post('/workercms/test')` Hono'da `/:id/test` route'uyla çakışıyordu (`id='workercms'` → "Site bulunamadı"). Sub-router olarak `sitesRoutes.route('/workercms', wcmsRoutes)` ile çakışma kalktı.

**`/:id/categories`, `/:id/tags`, `/:id/test` platform-aware:** workercms platform için WorkerCmsAdapter kullanır (önceden WordPressAdapter'a wcms creds verince `creds.site_url.replace` undefined üzerinde patlıyordu).

**dispatch.ts workercms branch:**
- Featured image: cms-hub R2'den indirir, `WorkerCmsAdapter.uploadMedia` ile hedefe yükler, `featured_image_id` set eder
- Body images: her birini upload eder, `body_html` içindeki `<img src>`'leri yeni public URL'e rewrite eder
- `createPost` ile içeriği gönderir
- categories/tags numerik ID veya string slug olarak iletilir (string ise wcms tarafı auto-create eder)

**Frontend:**
- [AddSite](../../../cms-hub/frontend/src/pages/app/AddSite.tsx) — WordPress / WorkerCms platform seçici. WCMS akışı: base_url + wcms_ key → Test / Listele / "Bağla ve Tümünü İçe Aktar". Inline emerald success card (alert YASAK — feedback memory'de).
- [Sites](../../../cms-hub/frontend/src/pages/app/Sites.tsx) — workercms bağlantısı varsa tepede tek bir kart, her base_url için "Yenile" butonu (orphan sayısını gösterir). Site kartlarında WorkerCms badge + Sparkles ikon.

### C — Tek seferde dağıtılmış bug fix'ler

| # | Sorun | Çözüm |
|---|---|---|
| 1 | "Bağlantı Testi" → "Site bulunamadı" | Hono route conflict — workercms sub-router |
| 2 | site-scoped key external API'de reddediliyor | userApiKeyAuth her iki scope'u kabul eder, requireSiteAccess scope='site' için bağlı site_id kontrolü |
| 3 | WorkerCms site seçince "reading 'replace'" hatası | `/:id/categories|tags|test` platform-aware |
| 4 | `window.alert()` ile başarı mesajı | Inline emerald success card (memory'ye feedback eklendi: alert/confirm yasak) |
| 5 | Öne çıkan resim gönderilmedi | `uploadMedia` + `featured_image_id` |
| 6 | Body resimleri bot.workercms.com'u hotlink ediyor | Her body image hedef R2'sine yüklenir, `<img src>` rewrite |
| 7 | API Erişimi addon'u 36500 gün görünüyordu | `addon-api-30` → 30 düzeltildi; admin formdaki kök sebep ([Packages.tsx](../../../cms-hub/frontend/src/pages/platform/Packages.tsx)) patch'lendi (initial.duration_days korunuyor) |
| 8 | Kategori adı değişince slug değişmiyordu | [taxonomies.ts](../../src/routes/api/taxonomies.ts) PUT slug rules: missing → keep, '' → regenerate, dolu → use |

### Son canlı sürümler (2026-04-20)

| Worker | Domain | Version ID |
|---|---|---|
| `wp-cms` (workercms) | workercms.com + thinktmed/tersnet/smaille | `d08811a2-b120-4d78-9645-d91c3e805166` |
| `wp-cms` (girisadresi) | girisadresi.org + beluga-giris.net | `e51a4068-374b-421e-b83e-1dcb1eb6a66a` |
| `cms-hub` | bot.workercms.com | `e5c93fb6-14c5-416f-ae55-9f3aefe49f12` |

---

## 2. Açık İşler (Theme Studio bittikten sonra)

### Faz 3 — Periodic refresh (opsiyonel)
Şu an refresh manuel ("Yenile" butonu). Cron ile her N dakikada otomatik refresh isteyen kullanıcı varsa eklenebilir. Düşük öncelik.

### Faz 4 — Orphan cleanup UI
`/workercms/refresh` endpoint orphan listesi döner (uzakta yok ama lokal'de var). Frontend'de bunlar için "Sil" butonu + onay dialog'u eklenmeli. Şu an sadece sayı gösteriliyor.

### Faz 5 — Per-site key (opsiyonel iyileştirme)
Şu an site-scoped key zaten çalışıyor (Faz 1'de eklendi). UI'da "WorkerCms admin'den site-scoped key'le bağlan → tek site içe aktarılır" akışı belirginleşmeli. Şu an sadece dokümante edilmiş değil.

### Faz 6 — Editor user akışı + permission
Site-scoped key'ler editor rolündeki kullanıcılar için. Şu an key oluşturma UI'sı admin+ rolü gerektiriyor. Editor'ün kendi key'ini oluşturabilmesi için requireRole değişikliği lazım. Düşük öncelik — admin oluşturup verir.

### Faz 7 — Bulk content dispatch
Birden çok WorkerCms site'a aynı anda içerik gönderme (cms-hub'da [Bulk.tsx](../../../cms-hub/frontend/src/pages/app/Bulk.tsx) var, workercms platform'a uyarlanmalı).

### Faz 8 — Two-way sync (gelecek)
WorkerCms tarafından silinen post'lar cms-hub'da işaretlensin (webhook veya polling). Mevcut tek yön: cms-hub → WorkerCms.

---

## 3. Bilinen Edge Case'ler / Test Notları

- **Slug çakışması:** wcms tarafında `ensureUniqueSlug` çalışıyor, cms-hub'tan gönderilen slug zaten var ise `-2`, `-3` suffix ekleniyor. Test edildi.
- **Site limiti:** `getOrgFeatures.max_sites` discover'da kontrol ediliyor, limiti aşan siteler `skipped: 'site_limit_reached'` döner.
- **Boş içerik:** body_html boşsa dispatch hatası "Content body is empty" döner, status 'failed' olur.
- **Refresh idempotent:** Aynı remote_id zaten kayıtlıysa update, yoksa insert. Asla iki row aynı (org_id, base_url, remote_id) için.
- **Encryption:** WorkerCms creds (`{ base_url, api_key }`) cms-hub'ın `INTERNAL_ENCRYPTION_KEY` ile encrypt ediliyor. Her workercms platform site row'u kendi kopyasını saklar (denormalized — tek connection 6 site = 6 row, 6 encrypted creds). Aynı key'i değiştirince hepsini güncelleyen toplu rotate UI yok (Faz 4 polish).

---

## 4. Faydalı Komutlar / Referanslar

**Cloudflare hesapları:**
- workercms: `violently@gmail.com` / account `70599852dfb9a6bfd74b8f3514761d8a`
- girisadresi: `bahiscisiteleri@gmail.com` / account `fe12fb64676256a9902eccf074137746`
- API key'leri her wrangler.*.toml dosyasının başında comment olarak var

**D1 database id'leri:**
- workercms cms-db: `212c6de5-e0a7-4566-a2e4-840cb19c4507`
- girisadresi cms-db: `c1db2c1e-84df-4c76-b3c7-890ca1b8f276`
- cms-hub cms-hub-db: `3582dc96-cb98-4ece-802f-efaced66464e`

**Test için manuel user-scoped key oluşturma (DB'ye direkt INSERT):**
```bash
RAW="wcms_$(python -c 'import secrets; print(secrets.token_hex(32))')"
HASH=$(printf "%s" "$RAW" | python -c "import sys,hashlib; print(hashlib.sha256(sys.stdin.read().encode()).hexdigest())")
PREFIX="${RAW:0:12}"
# user_id'yi users tablosundan seç (örn. id=3 hasan@hasangul.com)
# INSERT INTO api_keys (scope, user_id, name, key_hash, key_prefix, permissions)
#   VALUES ('user', 3, 'test', '$HASH', '$PREFIX', 'read,write')
```
