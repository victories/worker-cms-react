# Global Settings Inheritance System

**Date:** 2026-02-25
**Status:** Approved
**Scope:** General-purpose global settings with per-site override capability

---

## Problem

Multi-site CMS'de her siteye ayri ayri ayar yapmak (ornegin reCAPTCHA) olceklendirilemez. 100+ site icin tek tek yapilandirma gerekiyor.

## Solution: Settings Inheritance Model

Site-level ayar varsa onu kullan, yoksa global ayara fallback yap.

```
effective_value = site_settings[key] ?? global_settings[key] ?? hardcoded_default
```

## Data Layer

**Mevcut tablolar kullanilir — yeni tablo yok:**

- `global_settings` (key TEXT PRIMARY KEY, value TEXT) — zaten var
- `settings` (site_id INTEGER, key TEXT, value TEXT, PRIMARY KEY(site_id, key)) — zaten var

**Yeni utility:** `src/lib/settings.ts`

```typescript
getEffectiveSettings(db, siteId, keys[])  // Toplu cozumleme
getEffectiveSetting(db, siteId, key)      // Tekil cozumleme
```

Her iki fonksiyon da once site tablosuna, yoksa global tablosuna bakar.

**Site ayarini "global'e sifirla":** Ilgili site_settings kaydini silmek yeterli — otomatik olarak global deger gecerli olur.

## Backend API

### Yeni Route: `src/routes/api/global-settings.ts`

| Method | Path | Auth | Aciklama |
|--------|------|------|----------|
| GET | /api/global-settings | super_admin | Tum global ayarlari getir |
| PUT | /api/global-settings | super_admin | Toplu guncelle (upsert) |

### Mevcut Route Guncelleme: `src/routes/api/settings.ts`

**GET /api/settings** response'a ekleme:
```json
{
  "recaptcha_enabled": "true",
  "comments_enabled": "true",
  "_inherited": ["recaptcha_enabled", "recaptcha_site_key"]
}
```

`_inherited` dizisi: Deger global'den gelen (site-level override'i olmayan) key'leri belirtir.

**Yeni endpoint:** `DELETE /api/settings/:key` — Site-level override'i siler, global'e geri doner.

### Recaptcha Guncelleme

`src/lib/recaptcha.ts` icindeki `getRecaptchaSettings()` fonksiyonu inheritance utility kullanacak sekilde guncellenir.

## Admin Panel UI

### Yeni Sayfa: Global Settings (`/global-settings`)

- Sadece `super_admin` erisebilir
- Sidebar'da "Global Ayarlar" menu ogesi (Globe ikonu)
- reCAPTCHA v3 karti (ayni alanlar: enable, site key, secret key, threshold, form toggles)
- Yorum ayarlari karti
- Kaydet butonu tum siteleri etkiler

### Site Settings Guncelleme

- Global'den miras alinan ayarlarin yaninda **mor/mavi "Global" badge** gosterilir
- Badge hover'da tooltip: "Bu deger global ayarlardan alinmistir"
- Override edilmis ayarlarda badge gosterilmez
- Override edilmis ayarlarda **"Globale Sifirla"** butonu gosterilir (DELETE /api/settings/:key cagirir)
- Badge/buton icin `_inherited` dizisi kullanilir

## Inheritance Akisi

```
Kullanici site ayarlarini acar
  -> GET /api/settings (site_id ile)
  -> Backend: site_settings LEFT JOIN global_settings
  -> Response: { key: effective_value, _inherited: [...] }
  -> UI: _inherited listesindeki key'lere "Global" badge koy
  -> Kullanici ayari degistirir -> PUT /api/settings (site override olusur)
  -> Kullanici "Globale Sifirla" tiklar -> DELETE /api/settings/:key (site override silinir)
```

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Migration gerekliligi | global_settings tablosu zaten var, migration yok |
| Cache invalidation | Suan cache yok, gerek oldugunda eklenebilir |
| Super admin UX | Ayri sayfa, net ayrim |
| Backward compat | Site-level ayari olan siteler etkilenmez |
