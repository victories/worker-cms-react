# Theme Studio — drag-drop layout + shadcn token editor

**Tarih:** 2026-04-20
**Durum:** Plan onayı bekliyor (yeni oturumda başlanacak)
**Kapsam:** Mevcut tema sistemini söküp, shadcn token tabanlı stil düzenleyici + sürükle-bırak layout builder ile değiştirmek. Renkler, fontlar, radius/spacing'in canlı önizlemeyle düzenlendiği bir Style Editor; header/body/footer (ve diğer bölgeler) için kolon yapısı + slot içeriklerinin sürüklenip bırakılarak tasarlandığı bir Layout Builder.

**Tetikleyici:** workercms.com/admin/themes ve /admin/settings/theme tema seçimini "aktif" duruma alamıyor — mevcut tema sistemi bozuk ve sınırlı. Kullanıcı renk + font kontrolü, ek olarak header/footer kolon yerleşimi tasarımı istiyor.

---

## 1. Mevcut Durum (keşif sonucu)

### Silinecek dosyalar

| Katman | Dosya | Satır |
|---|---|---|
| Admin: tema mağazası | [admin/src/pages/themes/ThemeStore.tsx](../../admin/src/pages/themes/ThemeStore.tsx) | 231 |
| Admin: tema özelleştirici | [admin/src/pages/themes/ThemeCustomizer.tsx](../../admin/src/pages/themes/ThemeCustomizer.tsx) | 437 |
| Admin: palette seçici | [admin/src/pages/themes/PaletteSelector.tsx](../../admin/src/pages/themes/PaletteSelector.tsx) | 246 |
| Admin: tema ayarları (eski) | [admin/src/pages/settings/ThemeSettings.tsx](../../admin/src/pages/settings/ThemeSettings.tsx) | 849 |

**Toplam silinecek admin kodu:** ~1763 satır

### Korunacak / yeniden kullanılacak

| Katman | Dosya | Yapacağı |
|---|---|---|
| Backend: theme engine | [src/lib/themes/engine.ts](../../src/lib/themes/engine.ts) | `loadActiveTheme` mantığı korunur, schema değişir (`themes/site_themes` → `site_design`) |
| Backend: 22+ palette | [src/lib/themes/palettes.ts](../../src/lib/themes/palettes.ts) | "Preset" katalog olarak kalır, kullanıcı bunlardan birini seçip override eder |
| Backend: types | [src/lib/themes/types.ts](../../src/lib/themes/types.ts) | `CssVars`, `Palette` tipleri korunur; `ActiveTheme` → `ActiveDesign` olarak genişletilir |
| Middleware | [src/middleware/themeResolver.ts](../../src/middleware/themeResolver.ts) | `loadActiveDesign` çağrısına geçer |
| SSR layout | [src/ssr/layouts/PublisherLayout.tsx](../../src/ssr/layouts/PublisherLayout.tsx) | Sabit header/sidebar/footer yapısı dinamik `<RegionRenderer>`'a refactor olur |
| SSR komponent'leri | [src/ssr/components/](../../src/ssr/components/) (Header/Footer/Sidebar/MenuRenderer/WidgetRenderer/ThemeStyles) | Her biri "slot" haline gelir, RegionRenderer altında çağrılır |
| DB tabloları | `themes`, `site_themes` | İlk fazda dokunulmaz (data var, geri dönüş kolaylığı için). Faz 6'da migrate + drop. |

---

## 2. Hedef Mimari

### İki ortogonal kavram

1. **Style** — renkler, fontlar, radius/spacing (shadcn HSL/OKLCH token'ları)
2. **Layout** — bölge yapısı (header/body/footer'da hangi bileşen, hangi sütunda, ne genişlikte)

İkisi de tek bir tabloya gider:

```sql
CREATE TABLE site_design (
  site_id INTEGER PRIMARY KEY,
  style_tokens TEXT NOT NULL DEFAULT '{}',   -- shadcn HSL token map + fontlar
  layout_config TEXT NOT NULL DEFAULT '{}',  -- region tree (Header/Body/Footer/...)
  custom_css TEXT DEFAULT '',
  google_fonts TEXT DEFAULT '[]',
  preset_slug TEXT,                           -- başlangıç preset'i (override edilebilir)
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);
```

### `style_tokens` JSON şekli

```json
{
  "light": {
    "--background": "0 0% 100%",
    "--foreground": "240 10% 4%",
    "--primary": "240 6% 10%",
    "--primary-foreground": "0 0% 98%",
    "--accent": "240 5% 96%",
    "--muted": "240 5% 96%",
    "--border": "240 6% 90%",
    "--radius": "0.5rem"
  },
  "dark": { ... },
  "fonts": {
    "sans": "Inter",
    "heading": "Inter",
    "mono": "JetBrains Mono"
  },
  "google_fonts": ["Inter:400,500,600,700", "JetBrains Mono:400"]
}
```

### `layout_config` JSON şekli

```json
{
  "header": {
    "type": "row",
    "padding": "md",
    "sticky": true,
    "columns": [
      { "width": 25, "slots": [{ "id": "logo", "props": {} }] },
      { "width": 50, "slots": [{ "id": "menu", "props": { "menu_id": 1 } }] },
      { "width": 25, "slots": [
        { "id": "search", "props": {} },
        { "id": "user-actions", "props": {} }
      ] }
    ]
  },
  "body": {
    "type": "row",
    "columns": [
      { "width": 70, "slots": [{ "id": "main-content", "props": {} }] },
      { "width": 30, "slots": [
        { "id": "widget:recent-posts", "props": { "count": 5 } },
        { "id": "widget:categories", "props": {} }
      ] }
    ]
  },
  "footer": {
    "type": "row",
    "columns": [
      { "width": 25, "slots": [{ "id": "widget:about", "props": {} }] },
      { "width": 25, "slots": [{ "id": "widget:categories", "props": {} }] },
      { "width": 25, "slots": [{ "id": "widget:recent-posts", "props": {} }] },
      { "width": 25, "slots": [{ "id": "widget:newsletter", "props": {} }] }
    ]
  }
}
```

Her **column** %-bazlı genişlik (toplam 100). Mobile'da otomatik dikey stack — Faz 1'de hardcoded, Faz 6'da per-breakpoint editor.

### Slot Registry

`src/ssr/slots/` altında:

```ts
// src/ssr/slots/index.ts
import { LogoSlot } from './LogoSlot';
import { MenuSlot } from './MenuSlot';
import { SearchSlot } from './SearchSlot';
import { UserActionsSlot } from './UserActionsSlot';
import { MainContentSlot } from './MainContentSlot';
import { WidgetRecentPostsSlot, WidgetCategoriesSlot, WidgetTagsSlot, WidgetCustomHtmlSlot, WidgetNewsletterSlot, WidgetAboutSlot } from './widgets';

export const slotRegistry: Record<string, ComponentType<any>> = {
  'logo': LogoSlot,
  'menu': MenuSlot,
  'search': SearchSlot,
  'user-actions': UserActionsSlot,
  'main-content': MainContentSlot,
  'widget:recent-posts': WidgetRecentPostsSlot,
  'widget:categories': WidgetCategoriesSlot,
  'widget:tags': WidgetTagsSlot,
  'widget:custom-html': WidgetCustomHtmlSlot,
  'widget:newsletter': WidgetNewsletterSlot,
  'widget:about': WidgetAboutSlot,
};
```

Her slot React component'i, props olarak slot'un kendi config'ini alır + render context'ini.

### Region Renderer

```tsx
function RegionRenderer({ config, children }: { config: RegionConfig; children?: ReactNode }) {
  return (
    <div className={cn('region', `region-padding-${config.padding}`, config.sticky && 'sticky top-0 z-50')}>
      <div className="container mx-auto flex flex-col md:flex-row gap-6">
        {config.columns.map((col, i) => (
          <div key={i} style={{ flex: `0 0 ${col.width}%` }} className="space-y-4">
            {col.slots.map((slot, j) => {
              const Comp = slotRegistry[slot.id];
              if (!Comp) return null;
              if (slot.id === 'main-content') return <Fragment key={j}>{children}</Fragment>;
              return <Comp key={j} {...slot.props} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 3. Faz Planı

### Faz 1 — Temizlik (30 dk)

**Yapılacaklar:**
- Sidebar'dan "Görünüm > Temalar" + "Görünüm > Tema Ayarları" girişlerini kaldır
- App.tsx'ten `/themes`, `/themes/customize`, `/settings/theme` route'larını kaldır
- 4 admin tema sayfasını sil
- `admin/src/lib/api.ts`'ten tema metodlarını sil
- i18n'den tema string'lerini sil
- `themes`/`site_themes` tabloları **dokunulmaz**, schema.sql'de kalır
- `PublisherLayout.tsx` mevcut sabit yapısını kullanmaya devam eder (gerileme yok)
- `themeResolver` middleware **çalışmaya devam eder** — eski tema verisini okur, ileride yenisine göç edilecek

**Doğrulama:** Build + deploy + sitelerin görünümü değişmedi (workercms/girisadresi smoke), admin'de tema menüleri kayboldu.

---

### Faz 2 — Yeni şema + backend (1-2 saat)

**Yeni dosyalar:**
- `src/db/migrations/0XXX_site_design.sql` — `site_design` tablosu
- `src/lib/themes/design.ts` — `loadActiveDesign(db, siteId)`, `saveActiveDesign(db, siteId, payload)`, default seed
- `src/routes/api/design.ts` — `GET /api/design`, `PUT /api/design`, `POST /api/design/reset` (preset uygula)

**Schema'ya ek:** `site_design` (yukarıda), 3 prod DB'ye uygulanır (workercms, girisadresi).

**Default tokens:** mevcut `palettes.ts`'teki ilk palette ile başlanır, kullanıcı override edene kadar default olarak servis edilir.

**Default layout_config:** mevcut `PublisherLayout.tsx`'in sabit yapısını JSON'a çevir (header: logo + menu + search; body: main + sidebar; footer: 4 widget col).

**Middleware:** `themeResolver` → `designResolver` (yeni dosya değil, mevcudunu güncelle):
```ts
const design = await loadActiveDesign(db, siteId);
c.set('activeDesign', design);
```

**`Variables` tipi:** `activeDesign?: ActiveDesign` ekle.

**Doğrulama:** `curl /api/design` token+layout JSON döner. Default seed devrede.

---

### Faz 3 — Style Editor UI (2-3 saat)

**Yeni dosya:** `admin/src/pages/design/StyleEditor.tsx`

**Bileşenler:**
- **Sol panel — Tema Preset'leri:** mevcut palettes.ts'ten gelen 22 preset thumbnail + "Custom" seçeneği
- **Orta panel — Token editor:**
  - Light/Dark mode toggle
  - Color sections (sürüklenip açılan accordion):
    - Background colors: --background, --foreground, --card, --card-foreground, --popover, --popover-foreground
    - Brand colors: --primary, --primary-foreground, --secondary, --secondary-foreground, --accent, --accent-foreground
    - Status: --destructive, --destructive-foreground, --muted, --muted-foreground
    - Borders: --border, --input, --ring
  - Her token için **HSL color picker** (shadcn'in mevcut format'ına uygun)
  - **Font selectors:** Sans / Heading / Mono — Google Fonts API'den arama (`@/components/design/GoogleFontPicker.tsx` yeni)
  - **Radius slider:** --radius (0 - 1.5rem)
- **Sağ panel — Live preview:** iframe, sitenin homepage'ini gerçek zamanlı render eder, postMessage ile token güncellenir

**Live preview yöntemi:**
1. Iframe `src` = `https://<site>/?design_preview=1` (veya benzeri query)
2. Public route bu query'yi görünce `<style>` blok ekler ve `window.addEventListener('message')` ile token güncellemelerini dinler
3. Admin tarafta kullanıcı slider/picker oynattıkça `iframe.contentWindow.postMessage({ tokens: {...} }, '*')`
4. Save → PUT /api/design

**Yeni dependencies:**
- `react-colorful` (~3KB) — HSL color picker

---

### Faz 4 — Layout Builder UI (4-6 saat, en büyük parça)

**Yeni dosyalar:**
- `admin/src/pages/design/LayoutBuilder.tsx`
- `admin/src/components/design/RegionEditor.tsx`
- `admin/src/components/design/ColumnEditor.tsx`
- `admin/src/components/design/SlotPalette.tsx`
- `admin/src/components/design/SlotConfigPanel.tsx`

**Yeni dependency:**
- `@dnd-kit/core` + `@dnd-kit/sortable` (~30KB) — drag-drop

**UI yapısı:**
```
┌─────────────────────────────────────────────────────────────┐
│ Bölge sekmesi: [Header] [Body] [Footer]    [Önizle] [Kaydet]│
├──────────┬──────────────────────────────────┬───────────────┤
│ Slot     │  Region canvas                   │ Slot config   │
│ palette  │  ┌──────────────────────────┐    │               │
│          │  │ Col 25%  │ Col 50% │ 25% │    │ Seçili slot:  │
│ • Logo   │  │ ┌──────┐ │ ┌─────┐ │ ... │    │   Logo        │
│ • Menu   │  │ │ Logo │ │ │Menu │ │     │    │               │
│ • Search │  │ └──────┘ │ └─────┘ │     │    │ Genişlik:     │
│ • User   │  └──────────────────────────┘    │ [slider 25%]  │
│ • Widget │  + Yeni kolon ekle               │               │
│   ...    │                                  │ Mobil: [hide] │
│          │                                  │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

**Drag-drop akışı:**
- Sol palette'ten bir slot drag → kolona drop
- Aynı kolon içinde slot'ları sürükleyerek sıralama
- Kolonlar arası slot taşıma
- Kolon genişliklerini slider veya manual input
- "+ Yeni Kolon" butonu (max 4-6 kolon)
- "Kolonu Sil" — slot'ları yandaki kolona taşır

**Slot config panel:** Seçili slot için ayarlar:
- Logo: resim seçici, alt text, link target
- Menu: menu_id seçici (mevcut menus'tan)
- Search: placeholder text, ikon seçimi
- Widget'lar: içerik türüne göre özel config (örn. RecentPosts: count, kategori filtresi)

**Save:** Tüm region tree → `PUT /api/design { layout_config: {...} }`

**Live preview:** Aynı iframe yaklaşımı, postMessage ile layout JSON gönder.

---

### Faz 5 — SSR refactor (2-3 saat)

**Yapılacak:**
1. `src/ssr/slots/` altına slot bileşenleri:
   - LogoSlot.tsx — site logosu (settings.logo_url'den)
   - MenuSlot.tsx — MenuRenderer wrap
   - SearchSlot.tsx — arama formu
   - UserActionsSlot.tsx — login/profile butonları
   - MainContentSlot.tsx — children render (her sayfada içerik buraya)
   - widgets/ klasörü altında WidgetRecentPostsSlot, WidgetCategoriesSlot, vb.
2. `src/ssr/components/RegionRenderer.tsx` — yukarıdaki RegionRenderer mantığı
3. `src/ssr/layouts/PublisherLayout.tsx` refactor:
   - design varsa `<RegionRenderer config={design.layout_config.header}/>` + body + footer
   - design yoksa fallback: mevcut sabit Header/Sidebar/Footer (geri dönüş)
4. `<ThemeStyles>` yeni token formatına uyumlandırılır (light + dark map'leri)

**Backward-compat:** İlk Faz 5 bittiğinde, design tablosu boş olan siteler eski PublisherLayout'u görür. Faz 6'da default seed otomatik uygulanır.

---

### Faz 6 — Polish + cutover (açık uçlu)

- **Default seed:** Tüm mevcut sitelere bir kerelik default `site_design` row'u INSERT (eski theme verisinden migrate edilebilir)
- **Tema preset'leri:** "Modern Blog", "Magazine", "Minimal", "Dark", "Two-Sidebar" — hazır layout + style preset'leri
- **Export/import:** Design JSON'u indir + başka siteye yükle
- **Preview cihaz mode:** Desktop / Tablet / Mobile preview toggle
- **Per-breakpoint layout:** Mobile için ayrı kolon yapısı (Faz 6+)
- **Eski `themes` ve `site_themes` tablolarını drop**

---

## 4. Karar Noktaları (yeni oturumda netleşecek)

1. **Drag-drop:** `@dnd-kit/core` (öneri) veya `react-dnd`. dnd-kit modern ve accessible.
2. **Live preview:** iframe (gerçek SSR — daha doğru) vs admin-içi mock (hızlı ama eksik). **iframe öneri**.
3. **Backward-compat:** Default seed otomatik mı, yoksa kullanıcı her sitede manuel mi onaylıyor? **Otomatik öneri**.
4. **Slot bileşen seti:** Başlangıç set yeterli mi (Logo/Menu/Search/UserActions/MainContent + 6 widget), yoksa Hero/CTA/Gallery/Embed gibi şeyleri de Faz 4'e dahil mi?
5. **Mobile responsive:** Faz 1'de tek-axis ("hide on mobile") yetsin mi, yoksa per-breakpoint ayrı layout?
6. **Plugin entegrasyonu:** Mevcut plugin sistemi slot kaydı yapabilsin mi (3rd party widget'lar için)?

---

## 5. Tahmini iş yükü

| Faz | Tahmin | Açıklama |
|---|---|---|
| 1 — Temizlik | 30 dk | Düşük risk, hemen başlar |
| 2 — Backend + şema | 1-2 saat | Migration + 3 prod'a apply |
| 3 — Style Editor | 2-3 saat | Color pickers + font picker + iframe preview |
| 4 — Layout Builder | **4-6 saat** | En büyük parça, dnd-kit + slot config UI |
| 5 — SSR refactor | 2-3 saat | RegionRenderer + slot komponentleri |
| 6 — Polish | açık uçlu | Preset'ler, migrate, mobile breakpoint |

**Toplam aktif iş: ~10-15 saat** (parça parça, kullanıcı onayı arasında).

---

## 6. Risk + dikkat noktaları

1. **3 prod live siteyi bozmamak:** Her faz sonu workercms, girisadresi (beluga), thinktmed'de smoke test. SSR refactor'ı (Faz 5) en riskli — backward-compat şart.
2. **D1 migration'ları 3 hesaba apply:** workercms (violently@), girisadresi (bahiscisiteleri@), root0x94 — sonuncusu silindi, sadece 2 kaldı. cms-hub-db dokunulmaz (worker-ai-bot'un kendi DB'si).
3. **Eski tema verisi:** `themes` tablosunda muhtemelen `is_system=1` preset'leri var. Faz 6'da migrate edilirken kaybolmasın.
4. **Bundle boyutu:** dnd-kit + react-colorful + Google Fonts picker → ~50KB ek admin bundle. Acceptable.
5. **iframe live preview CORS:** `?design_preview=1` query'sinde public sayfa Access-Control header'ları kontrol edilmeli, postMessage origin doğrulamalı.

---

## 7. Cloudflare deploy hatırlatma

Üç prod'a deploy:
```bash
# workercms (violently@gmail.com)
CLOUDFLARE_API_KEY=7c650e21a44b53fc06df20926aca1d727e13f \
  CLOUDFLARE_EMAIL=violently@gmail.com \
  CLOUDFLARE_API_TOKEN="" \
  npx wrangler deploy -c wrangler.workercms.toml

# girisadresi (bahiscisiteleri@gmail.com)
CLOUDFLARE_API_KEY=cfk_cNVIH66vLKI9DtyBZpMjWDENesrsVKbleb34J2Cv48a7c0ce \
  CLOUDFLARE_EMAIL=bahiscisiteleri@gmail.com \
  CLOUDFLARE_API_TOKEN="" \
  npx wrangler deploy -c wrangler.girisadresi.toml
```

D1 migration'lar Cloudflare REST API ile (FTS5 yüzünden `wrangler d1 execute --remote` çalışmıyor):
```bash
# DB id'leri:
# workercms cms-db: 212c6de5-e0a7-4566-a2e4-840cb19c4507 (account 70599852dfb9a6bfd74b8f3514761d8a)
# girisadresi cms-db: c1db2c1e-84df-4c76-b3c7-890ca1b8f276 (account fe12fb64676256a9902eccf074137746)
```
