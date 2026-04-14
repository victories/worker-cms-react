# Full React SSR Migration — Worker CMS

**Tarih:** 2026-04-15
**Durum:** Onaylandı — Faz -1 başlatılacak
**Kapsam:** Tüm public render layer (landing + publisher temaları) Hono JSX'ten gerçek React SSR'a taşınır. Admin zaten React — `packages/ui/` altında tek kaynaktan beslenir. Eski 5 Layout dosyası + 4 tema preset'i + layoutResolver + theme-renderer + 4 bundled plugin **silinir**. Plugin ve tema API'leri doğrudan `ReactNode` döndüren v2 kontratlarına taşınır — aktif kullanıcı olmadığı için geri uyumluluk shim'ine gerek yok.

**Kritik deploy kararı:** Bu bir **yeni repo + yeni Cloudflare Worker** migration'ıdır. Üç katmanda da sıfır dokunma:
- **Local:** Mevcut `C:\Users\Administrator\CLAUDECODE\WP-WORKER\` klasörü olduğu gibi kalır. Yeni klasör kardeş dizinde oluşturulur: `C:\Users\Administrator\CLAUDECODE\WP-WORKER-V2\` (veya kullanıcının tercih ettiği farklı bir yol).
- **GitHub:** Mevcut repo (varsa) dokunulmaz. Yeni private repo açılır.
- **Cloudflare:** Mevcut `wp-cms` Worker + `cms-db` D1 + `cms-media` R2 dokunulmaz. Yeni `wp-cms-v2` Worker + yeni D1 + yeni R2 yaratılır.

Seed SQL ile örnek site boş deploy'da hazır çalışır duruma gelir. İki ortam paralel yaşar — yeni proje stabil olduğunda DNS cutover'ı (veya yeni domain) manuel yapılır.

---

## 1. Bağlam ve motivasyon

### 1.1 Hedef
Worker CMS'i, dışarıdan gelen tema ve plugin yazarlarına React ekosistemini (shadcn/ui, Radix, lucide, React Hook Form, vb.) doğrudan kullanabilecekleri bir platform haline getirmek. Tek zihinsel model (React), admin ve public arasında tek tasarım dili, tek component kaynağı.

### 1.2 Mevcut durum (keşif sonucu)
- **Public render**: Hono JSX + elle yazılmış inline CSS blokları. 4 tema layout dosyası toplam **2704 satır** (Layout.tsx 671, LayoutModern.tsx 682, LayoutVelvet.tsx 802, LayoutPublisher.tsx 549), ayrıca LayoutDebug.tsx 252 satır, AMPLayout.tsx 189 satır.
- **Public sayfa render dosyaları**: landing.tsx (401), home.tsx (265), post.tsx (392), archive.tsx (168), search.tsx (149). Tümü Hono JSX.
- **Admin**: React 19 + Vite + Tailwind + shadcn/ui. Çalışıyor. `admin/src/components/ui/*` altında 16 shadcn primitive: badge, button, card, dialog, dropdown-menu, empty-state, input, label, page-transition, select, separator, skeleton, switch, textarea, toast-notification, tooltip.
- **Plugin sistemi**: `src/lib/plugins/engine.ts` hook registry. Hook isimleri: `post.beforeSave`, `post.afterSave`, `post.beforeDelete`, `post.beforeRender`, `media.afterUpload`, `media.beforeServe`, `comment.beforeSave`, `comment.afterSave`, `page.head`, `page.bodyStart`, `page.bodyEnd`, `api.response`. Filtre hook'ları HTML **string** döner. Bundled plugin'ler (`src/plugins/contact-form/`, `seo-optimizer/`) HTML string üretir. Workers for Platforms dispatcher'ı (`dispatcher.ts`) 3rd party plugin izolasyonu için hazır.
- **Shortcode sistemi**: `src/lib/shortcodes/` — 14 built-in renderer (son-yazilar, yazi, kategori, slider, menu, ozel-html, bosluk, ayirici, arama-formu, widget, galeri, video, sosyal-medya, iletisim-formu). `processAllShortcodes(content, ctx)` post içeriği içindeki `[shortcode]` tag'lerini HTML ile değiştirir. İçerik string'de saklandığı için bu sistem **dokunulmuyor**.
- **Widget sistemi**: `src/components/WidgetRenderer.tsx`, widget tipleri: categories, recent_posts, tags, text, menu. Sidebar alanları: `sidebar`, `footer-1..4`, `header-area`. Widget'lar DB'den geliyor, JSX döner.
- **Tema DB şeması**: `themes` tablosu (css_variables JSON, layout_config JSON, google_fonts, custom_css, custom_head_html, thumbnail_r2_key, is_system), `site_themes` tablosu (site_id, theme_id, is_active, custom_overrides JSON).
- **Build pipeline**: Root `wrangler dev/deploy`, tsconfig `jsxImportSource: hono/jsx`, `compatibility_flags = ["nodejs_compat"]` zaten açık (iyi haber). Admin ayrı Vite projesi, `[site] bucket = "./admin/dist"` ile Workers Sites üzerinden servis ediliyor. `public/` klasörü boş. Admin'in `src/index.css`'inde shadcn HSL token bloğu mevcut — bu birebir kullanılacak.

### 1.3 Tasarım prensipleri
1. **Hono HTTP framework olarak kalır.** Sadece render katmanı React'e taşınır. Router, middleware, API, plugin engine core — değişmez.
2. **`react-dom/server.edge` ile streaming SSR.** `renderToReadableStream` kullanılır — Cloudflare Workers uyumlu.
3. **Paylaşılan UI paketi.** `packages/ui/` monorepo-içi, TypeScript path alias ile. Ayrı npm paketi değil.
4. **Islands selektif hydrasyon.** Sayfa tamamen SSR HTML döner, sadece interaktif component'ler (theme toggle, mobile drawer, arama) client-side yüklenir.
5. **Şemalar korunur.** `landing_config`, `widgets.config`, `menu_items`, `post_meta` — hiçbir DB şeması değişmez. `site_themes.custom_overrides` yeni shadcn token formatında yeniden başlar (aktif kullanıcı yok, mapping gereksiz).
6. **Plugin API v2 — native ReactNode.** Tek API, ReactNode döner. Eski HTML string API'si **silinir**. Bundled plugin'ler (contact-form, seo-optimizer, social-share, hero-slider) yeniden yazılır, shadcn primitive'leri kullanır. Aktif 3rd party plugin kullanıcısı yok — shim gerekmez.
7. **AMP korunur ve önemlidir.** Türkiye'deki internet yasakları nedeniyle AMP, engellenen içeriklere erişim için aktif kullanımda. `AMPLayout.tsx` ve `routes/public/amp/*` **dokunulmaz**, elle yazılmış Hono JSX olarak kalır. AMP'in katı CSS kısıtları (sadece `<style amp-custom>`, utility class runtime yok) Tailwind ile uyumsuz olduğu için ayrı kalması zaten doğru karar.
8. **Sıfır dokunma production.** Mevcut `wp-cms` Worker'a, mevcut `cms-db` D1'e, mevcut `cms-media` R2'ye hiç dokunulmaz. Tüm çalışma izole bir yeni worker üzerinde.
9. **Seed-first deploy.** İlk deploy boş bir yeni D1'e `seed.sql` yükler: 1 örnek site, default publisher tema aktif, 5 örnek post, 3 kategori, 1 menü, 3 widget, 1 admin kullanıcı. Deploy bitince workers.dev URL'i sıfırdan gezilebilir durumda olur.

---

## 2. Mimari

### 2.1 Request pipeline (yeni)

```
HTTP Request
  ↓
Hono middleware stack (siteResolver, i18n, pluginHooks, themeResolver, redirects, pageViewTracker)
  ↓
Route handler (src/routes/public/home.ts, post.ts, ...)
  ↓
Data fetching (getSiteTheme, getPublicPosts, getSidebarData, vb — değişmedi)
  ↓
Plugin filter hooks (page.head, page.bodyStart, page.bodyEnd → ReactNode[] topla)
  ↓
renderPage(<Shell><PublisherLayout><Page/></PublisherLayout></Shell>, opts)
  ↓
react-dom/server.edge.renderToReadableStream()
  ↓
Streaming Response (HTML + <link rel="stylesheet" href="/assets/publisher.css">)
```

### 2.2 Klasör yapısı (geçiş sonrası)

```
WP-WORKER/
├── packages/
│   └── ui/                           # YENİ — admin + public ortak shadcn primitives
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── avatar.tsx
│       ├── separator.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── switch.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── tooltip.tsx
│       ├── skeleton.tsx
│       ├── container.tsx             # public-specific: max-w wrapper
│       ├── nav-menu.tsx              # site menü primitive
│       ├── prose.tsx                 # post içeriği typography wrapper
│       ├── lib/
│       │   └── utils.ts              # cn() helper (admin/src/lib/utils.ts'den taşındı)
│       └── tokens/
│           └── design-tokens.css     # admin/src/index.css'den HSL bloğu taşındı
│
├── src/                              # Worker (Hono) — mevcut yapı büyük ölçüde korunur
│   ├── index.ts                      # Hono app entry (değişmez, render import'ları hariç)
│   ├── types.ts
│   ├── middleware/                   # hepsi aynen kalır
│   ├── routes/
│   │   ├── api/                      # tamamı aynen (değişiklik yok)
│   │   └── public/                   # handler'lar sadeleşir
│   │       ├── landing.ts            # EX-landing.tsx — artık JSX yok, renderPage çağrısı
│   │       ├── home.ts               # EX-home.tsx
│   │       ├── post.ts               # EX-post.tsx
│   │       ├── archive.ts            # EX-archive.tsx
│   │       ├── page.ts               # EX-dynamic sayfası (statik sayfalar)
│   │       ├── search.ts             # EX-search.tsx
│   │       ├── feed.tsx              # KORUNUR (XML, Hono JSX)
│   │       ├── sitemap.tsx           # KORUNUR (XML)
│   │       ├── git.ts                # KORUNUR (URL shortener)
│   │       └── amp/                  # TAMAMEN KORUNUR (ayrı dünya)
│   │           ├── home.tsx
│   │           ├── post.tsx
│   │           ├── page.tsx
│   │           └── dynamic.tsx
│   │
│   ├── ssr/                          # YENİ — public React SSR ağacı
│   │   ├── shell.tsx                 # <html><head>...<body> doctype + head
│   │   ├── layouts/
│   │   │   └── PublisherLayout.tsx   # Header + Main + Sidebar + Footer slotları
│   │   ├── pages/
│   │   │   ├── Landing.tsx           # landing_config → sayfa
│   │   │   ├── Home.tsx              # blog home veya statik anasayfa
│   │   │   ├── Post.tsx              # tek yazı
│   │   │   ├── Page.tsx              # statik sayfa
│   │   │   ├── Archive.tsx           # kategori/etiket/yazar
│   │   │   └── Search.tsx
│   │   ├── components/
│   │   │   ├── SEOHead.tsx           # meta/og/jsonld — React'e port
│   │   │   ├── PostCard.tsx          # shadcn Card ile, React'e port
│   │   │   ├── Pagination.tsx        # React'e port
│   │   │   ├── PostContent.tsx       # processedHtml → dangerouslySetInnerHTML
│   │   │   ├── WidgetRenderer.tsx    # widget tipi → React component switch
│   │   │   ├── MenuRenderer.tsx      # nav tree → React
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ThemeStyles.tsx       # palette + custom_overrides → <style>:root{...}
│   │   │   └── PluginSlot.tsx        # plugin hook çıktısını React'e yerleştirme
│   │   ├── islands/                  # client-side hydrated
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── MobileDrawer.tsx
│   │   │   ├── SearchOverlay.tsx
│   │   │   └── island-registry.ts    # island adı → component map
│   │   └── ad-slots/                 # reklam yerleşimleri (config ile)
│   │       └── AdSlot.tsx
│   │
│   ├── client/                       # YENİ — hydration entry noktaları (esbuild bundle)
│   │   ├── publisher-entry.tsx       # tüm publisher island'larını hydrate et
│   │   └── landing-entry.tsx         # landing'in theme toggle'ını hydrate et
│   │
│   ├── lib/
│   │   ├── ssr.ts                    # YENİ — renderPage() helper, streaming wrapper
│   │   ├── public-db.ts              # DEĞİŞMEZ
│   │   ├── plugins/
│   │   │   ├── engine.ts             # küçük genişletme: ReactNode filter desteği
│   │   │   ├── react-bridge.ts       # YENİ — HTML string ↔ ReactNode shim
│   │   │   ├── types.ts              # YENİ hook tiplerinin eklenmesi
│   │   │   ├── dispatcher.ts         # DEĞİŞMEZ
│   │   │   ├── sandbox.ts            # DEĞİŞMEZ
│   │   │   └── ...                   # diğer plugin dosyaları DEĞİŞMEZ
│   │   ├── shortcodes/               # DEĞİŞMEZ (HTML string processor)
│   │   ├── themes/                   # YENİ klasör — eski 4 theme lib dosyasını yer alır
│   │   │   ├── palettes.ts           # shadcn HSL palette tanımları
│   │   │   ├── engine.ts             # loadActiveTheme, applyOverrides
│   │   │   └── types.ts
│   │   ├── i18n/                     # DEĞİŞMEZ
│   │   └── ... (diğer libs DEĞİŞMEZ)
│   │
│   ├── plugins/                      # bundled plugin kodları (iç plugin'ler)
│   │   ├── contact-form/             # HTML üretmeye devam eder (shim ile çalışır)
│   │   ├── hero-slider/
│   │   ├── seo-optimizer/
│   │   └── social-share/
│   │
│   └── db/                           # DEĞİŞMEZ
│       └── migrations/
│           └── 2026-04-16-shadcn-theme-migration.sql   # YENİ
│
├── public-styles/                    # YENİ — public Tailwind pipeline
│   ├── input.css                     # @tailwind base/components/utilities + design-tokens import
│   └── tailwind.config.ts            # content: src/ssr/**, packages/ui/**
│
├── public/
│   └── assets/                       # wrangler [site] veya static asset bucket
│       ├── publisher.css             # build output, gitignored
│       └── client/
│           ├── publisher.js          # client entry bundle, gitignored
│           └── landing.js            # gitignored
│
├── scripts/
│   ├── build-public-css.mjs          # YENİ — Tailwind CLI call
│   ├── build-client.mjs              # YENİ — esbuild islands
│   ├── migrate-themes.mjs            # YENİ — DB theme_id mapping
│   ├── sync-domains.js               # DEĞİŞMEZ
│   └── fix-external-images.ts        # DEĞİŞMEZ
│
├── admin/                            # DEĞİŞMEZ (sadece @ui alias ekleme)
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/                   # re-exports from @ui/* veya silinir
│   │   └── ...
│   └── vite.config.ts                # alias eklemesi
│
├── tsconfig.json                     # jsxImportSource değişir: hono/jsx → react
├── package.json                      # react, react-dom, tailwind, esbuild eklenir
└── wrangler.toml                     # [site] korunur, build hooks eklenir
```

### 2.3 Veri akışı: örnek `/` (home) isteği

1. `src/routes/public/home.ts` handler çalışır.
2. `Promise.all` ile data çekilir: `getSiteTheme`, `getPublicPosts`, `getSidebarData`, `getHomepageSettings`, `getAnalyticsSettings`, `getRichSnippetsSettings`, `hasWhiteLabel`, `getMenuByLocation`. **Değişmez.**
3. Plugin hook'ları ReactNode array'i döndürecek şekilde çalıştırılır:
   ```ts
   const headNodes: ReactNode[] = await pluginEngine.collectReactNodes('page.head', site);
   const bodyStartNodes: ReactNode[] = await pluginEngine.collectReactNodes('page.bodyStart', site);
   const bodyEndNodes: ReactNode[] = await pluginEngine.collectReactNodes('page.bodyEnd', site);
   ```
4. Post içeriği için shortcode işleme: `processAllShortcodes(postContent, ctx)` → HTML string döner. `<PostContent html={processedHtml} />` component'i bunu `dangerouslySetInnerHTML` ile render eder.
5. Tema CSS değişkenleri: `loadActiveTheme` + `mergeOverrides` → `<ThemeStyles vars={...} />` component'i `<style>:root{...}</style>` basar.
6. React tree:
   ```tsx
   <Shell
     lang={lang}
     headNodes={headNodes}
     bodyStartNodes={bodyStartNodes}
     bodyEndNodes={bodyEndNodes}
     cssBundle="/assets/publisher.css"
     clientBundle="/assets/client/publisher.js"
     themeClass={themeClass}
   >
     <SEOHead title={...} description={...} jsonLd={...} />
     <ThemeStyles vars={mergedVars} />
     <PublisherLayout
       site={site}
       navItems={navItems}
       sidebarData={sidebarData}
       whiteLabel={whiteLabel}
     >
       <Home posts={posts} categories={categories} page={page} totalPages={...} />
     </PublisherLayout>
   </Shell>
   ```
7. `renderPage(tree)` içinde `renderToReadableStream`, output'u `<!doctype html>` prefix'i ile birleştirip `new Response(stream, {headers: 'text/html'})` döner.
8. Client'ta `publisher.js` bundle'ı yüklenir, `islands/` altındaki component'ler `hydrateRoot` ile canlanır — diğer her şey statik HTML.

### 2.4 React SSR Worker bundle riski
- React 19 + react-dom/server.edge minified: ~135 KB
- Mevcut worker bundle (tahmini): ~500 KB (Hono + rotalar + plugin engine + D1 + R2 sorguları + şortcode renderer'lar)
- Toplam hedef: **~700 KB** (Workers free 1MB, paid 10MB — rahat)
- Ölçüm: Faz 0 checkpoint'inde `wrangler deploy --dry-run` ile doğrulanır, 1MB'ı geçerse esbuild tree-shake + `react-dom/server.edge` ile minimal export

---

## 3. Plugin API v2 — ReactNode-native, tek API

### 3.1 Temiz masa
Aktif 3rd party plugin kullanıcısı olmadığı için geri uyumluluk gerekli değil. Eski HTML string hook'ları (`page.head` string → string, `post.beforeRender` string → string) **silinir**. Tek API, ReactNode döner, tipli ve composable.

### 3.2 Yeni hook signatures (`src/lib/plugins/types.ts`)
```ts
import type { ReactNode } from 'react';
import type { Post, Media, Comment, Site } from '../../types';

export interface PluginHooks {
  // Data hook'ları (değişmedi — render'la ilgili değil)
  'post.beforeSave':    (post: Partial<Post>) => Partial<Post> | Promise<Partial<Post>>;
  'post.afterSave':     (post: Post) => void | Promise<void>;
  'post.beforeDelete':  (postId: number) => void | Promise<void>;
  'media.afterUpload':  (media: Media) => void | Promise<void>;
  'media.beforeServe':  (url: string) => string | Promise<string>;
  'comment.beforeSave': (comment: Partial<Comment>) => Partial<Comment> | Promise<Partial<Comment>>;
  'comment.afterSave':  (comment: Comment) => void | Promise<void>;
  'api.response':       (data: any, endpoint: string) => any | Promise<any>;

  // Render hook'ları — hepsi ReactNode
  'ui.head':            (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.bodyStart':       (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.bodyEnd':         (nodes: ReactNode[], site: Site) => ReactNode[] | Promise<ReactNode[]>;
  'ui.postContent':     (children: ReactNode, post: Post) => ReactNode | Promise<ReactNode>;

  // Slot-based UI injection — tema tarafından sağlanan yerleşim noktalarına plugin render
  'ui.slot.headerRight':   (site: Site) => ReactNode | Promise<ReactNode>;
  'ui.slot.sidebarTop':    (site: Site) => ReactNode | Promise<ReactNode>;
  'ui.slot.sidebarBottom': (site: Site) => ReactNode | Promise<ReactNode>;
  'ui.slot.footerStart':   (site: Site) => ReactNode | Promise<ReactNode>;
  'ui.slot.footerEnd':     (site: Site) => ReactNode | Promise<ReactNode>;
  'ui.slot.postHeader':    (post: Post) => ReactNode | Promise<ReactNode>;
  'ui.slot.postFooter':    (post: Post) => ReactNode | Promise<ReactNode>;
}

export type HookName = keyof PluginHooks;
```

### 3.3 Collector (`src/lib/plugins/collectors.ts`)
Basit wrapper'lar — handler'lar tek satırla ReactNode array'i alır:

```ts
import type { ReactNode } from 'react';
import { pluginEngine } from './engine';
import type { Site, Post } from '../../types';

export const collectHeadNodes = (site: Site) =>
  pluginEngine.executeFilter('ui.head', [] as ReactNode[], site);

export const collectBodyStartNodes = (site: Site) =>
  pluginEngine.executeFilter('ui.bodyStart', [] as ReactNode[], site);

export const collectBodyEndNodes = (site: Site) =>
  pluginEngine.executeFilter('ui.bodyEnd', [] as ReactNode[], site);

export const wrapPostContent = (children: ReactNode, post: Post) =>
  pluginEngine.executeFilter('ui.postContent', children, post);

export const collectSlot = (slot: `ui.slot.${string}`, ctx: any) =>
  pluginEngine.executeFilter(slot as any, null, ctx);
```

### 3.4 Slot rendering pattern
`PublisherLayout` içinde slot çağrıları tema tarafından yapılır:
```tsx
<header>
  <Container>
    <Logo />
    <NavMenu items={navItems} />
    {headerRightSlot}  {/* route handler'da pre-fetched */}
    <ThemeToggle />
  </Container>
</header>
```
Route handler slot içeriklerini pre-fetch eder ve prop olarak geçirir (React 19 async component'leri Workers SSR'da olgun değil — explicit pre-fetch daha güvenli).

### 3.5 Bundled plugin'ler yeniden yazılır
Eski `src/plugins/*/index.ts` dosyaları (contact-form, seo-optimizer, social-share, hero-slider) tamamen yeniden yazılır. Her biri React component export eder, shadcn primitive'leri kullanır:

- **contact-form** (`src/plugins/contact-form/index.tsx`): Shadcn `<Card>`, `<Input>`, `<Textarea>`, `<Button>` ile form. `ui.postContent` hook'unda post HTML'i içinde `[contact-form]` shortcode'u bulursa React component ile değiştirir. Client-side submit bir island olarak hydrate edilir.
- **seo-optimizer**: `ui.head` hook'unda meta tag'ler ve JSON-LD ReactNode olarak döndürür.
- **social-share**: `ui.slot.postFooter` hook'unda shadcn Button grid'i (Twitter, Facebook, WhatsApp, LinkedIn share).
- **hero-slider**: Shortcode renderer kalır (HTML string üretir, post content içinde görünür), ama stil shadcn token'larına uygun.

### 3.6 Workers for Platforms dispatcher
`src/lib/plugins/dispatcher.ts` 3rd party plugin izolasyonu için korunur ama **MVP'de kullanılmaz** (aktif 3rd party plugin yok). Kod durur, ileride plugin marketplace açıldığında kullanılır. MVP'de sadece bundled plugin'ler çalışır.

---

## 4. Tema API v2 — Kullanıcı kurulabilir tema

### 4.1 Mevcut durum → hedef
**Mevcut:** 4 layout dosyası + 4-8 preset. Tema seçimi `layoutResolver.ts`'de hardcoded switch. Kullanıcı yükleyemez.

**Hedef:** Tema = `packages/ui`'daki primitive'leri kullanarak yazılmış bir React component + manifest + CSS tokens. Sistem dahili ("built-in") tema veya 3rd party kurulabilir tema olarak deploy edilebilir. Bu fazla bölümü MVP'de **tek bir built-in tema** ile başlar (`default-publisher`), 3rd party tema kurulumu Faz 8+ olarak planlanır.

### 4.2 Tema manifest şeması (`themes` tablosuna eklenir, mevcut sütunlarla uyumlu)
`themes.layout_config` JSON zaten var. Yeni alan ekleriz (migration değil, json içinde):
```json
{
  "manifest_version": 2,
  "entry": "publisher",
  "slots": ["headerRight", "sidebarTop", "sidebarBottom", "footerEnd", "postFooter"],
  "palette_variants": ["neutral", "zinc", "slate", "rose", "blue", "emerald"],
  "features": { "darkMode": true, "search": true, "adSlots": { "top": true, "mid": true } }
}
```

### 4.3 Theme engine (`src/lib/themes/engine.ts`)
```ts
import { PublisherLayout } from '../../ssr/layouts/PublisherLayout';

const THEME_REGISTRY: Record<string, React.ComponentType<any>> = {
  'default-publisher': PublisherLayout,
};

export async function loadActiveThemeComponent(db, siteId) {
  const { slug } = await loadActiveTheme(db, siteId);
  return THEME_REGISTRY[slug] || THEME_REGISTRY['default-publisher'];
}
```

3rd party tema kurulumu ileride — tema kodu R2'ye yüklenir, dynamic import + allow-list ile yüklenir. MVP'de **sadece built-in `default-publisher`** var.

### 4.4 Palette sistemi
`src/lib/themes/palettes.ts`:
```ts
export const PALETTES = {
  neutral: { light: { '--background': '0 0% 100%', ... }, dark: { ... } },
  zinc:    { light: { ... }, dark: { ... } },
  slate:   { ... },
  rose:    { ... },
  blue:    { ... },
  emerald: { ... },
  violet:  { ... },
  stone:   { ... },
};
```
Bu HSL değerleri shadcn'in resmi palette'lerinden alınır, `admin/src/index.css`'dekilerle birebir uyumludur.

### 4.5 Per-site override
`site_themes.custom_overrides` JSON'u korunur. İçerik şu anki format (`{primary_color: '#...'}`) yeni format (`{'--primary': 'H S% L%'}`) olarak migrate edilir. Migration script eski key'leri yeni HSL formuna çevirir.

---

## 5. Faz planı

### Faz -1 — Yeni repo + yeni Cloudflare Worker kurulumu

**Amaç:** Mevcut production'a dokunmadan, izole bir çalışma ortamı oluşturmak. Mevcut kodu yeni repoya kopyalamak ve boş bir Cloudflare Worker'da çalışır hale getirmek.

**Önkoşullar (kullanıcıdan alınacak bilgi):**
- GitHub kullanıcı/org adı (örn. `username` veya `orgname`)
- Yeni repo adı (öneri: `worker-cms-react`, veya kullanıcı seçimi)
- Yeni Cloudflare Worker adı (öneri: `wp-cms-v2`)
- Yeni D1 database adı (öneri: `cms-db-v2`)
- Yeni R2 bucket adı (öneri: `cms-media-v2`)
- Workers.dev subdomain adı (Cloudflare account settings'ten gelir)

**Yapılacaklar:**
1. **GitHub private repo oluştur:**
   ```bash
   gh repo create {owner}/{repo-name} --private --description "Worker CMS — React SSR"
   ```
2. **Çalışma kopyası hazırla:**
   ```bash
   mkdir ../WP-WORKER-V2 && cd ../WP-WORKER-V2
   rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' ../WP-WORKER/ .
   git init && git add . && git commit -m "chore: initial import from WP-WORKER"
   git branch -M master
   git remote add origin https://github.com/{owner}/{repo-name}.git
   git push -u origin master
   ```
3. **Yeni wrangler.toml:** mevcut `wrangler.toml`'u kopyala, sadece şunlar değişir:
   ```toml
   name = "wp-cms-v2"
   compatibility_date = "2026-04-15"
   compatibility_flags = ["nodejs_compat"]
   workers_dev = true
   # mevcut [[routes]] custom_domain blokları KALDIRILIR — yeni worker sadece workers.dev subdomain'inde çalışır
   # [triggers] cron'u da KAPATILIR — cron'lar eski worker'da kalır
   ```
4. **Yeni D1 database:**
   ```bash
   wrangler d1 create cms-db-v2
   # Çıktıdaki database_id yeni wrangler.toml'a yazılır
   ```
5. **Yeni R2 bucket:**
   ```bash
   wrangler r2 bucket create cms-media-v2
   ```
6. **Şema yükle:**
   ```bash
   wrangler d1 execute cms-db-v2 --remote --file=src/db/schema.sql
   ```
7. **Seed hazırla ve yükle:** `src/db/seed.sql` yeni örnek veri ile güncellenir (bkz. Bölüm 13). İlk faz için mevcut seed'de ne varsa onunla başlar, Faz 5'te genişletilir.
   ```bash
   wrangler d1 execute cms-db-v2 --remote --file=src/db/seed.sql
   ```
8. **İlk deploy:**
   ```bash
   wrangler deploy
   ```
   Çıktıda `https://wp-cms-v2.{account}.workers.dev` URL'i gelir.
9. **Sanity check:** URL ziyaret edilir, mevcut Hono JSX render ile eski tasarımdaki site görünür. Bu taban noktası (baseline) — buradan sonraki fazlar React'e taşır.
10. **İlk commit push:**
    ```bash
    git add . && git commit -m "chore: baseline deploy on new worker" && git push
    ```

**Checkpoint:**
- `https://wp-cms-v2.{account}.workers.dev` açılır, seed verisiyle bir örnek site görünür.
- Mevcut production `wp-cms` Worker'a **hiçbir değişiklik gitmedi** (git log ile doğrulanabilir — eski repo dokunulmadı).
- Yeni repo GitHub'da özel olarak mevcut.

**Silinecek:** yok. Non-destructive faz.

**Not:** Bu fazdan sonraki tüm fazlar yeni repo (`WP-WORKER-V2/`) içinde çalışır. Mevcut `WP-WORKER/` hiç dokunulmaz.

---

### Faz 0 — Temel altyapı (1 iş günü)

**Amaç:** React SSR + Tailwind CSS + client bundling Worker'da çalışsın.

**Yapılacaklar:**
1. `package.json` root'a ekle: `react@19`, `react-dom@19`, `@types/react`, `@types/react-dom`, `tailwindcss@3`, `@tailwindcss/typography`, `postcss`, `autoprefixer`, `esbuild`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
2. `tsconfig.json` güncelle: `jsxImportSource: "react"` (hono/jsx'ten). Hono JSX kullanan dosyalar (feed.tsx, sitemap.tsx, amp/*) kendi per-file pragma'sı ile işaretlenir: `/** @jsxImportSource hono/jsx */`.
3. `wrangler.toml` değişmez (compat flag zaten var).
4. Oluştur: `public-styles/input.css`, `public-styles/tailwind.config.ts`, `packages/ui/tokens/design-tokens.css` (admin'den kopyalanır).
5. Oluştur: `scripts/build-public-css.mjs` — Tailwind CLI çağrısı, output `public/assets/publisher.css`.
6. Oluştur: `scripts/build-client.mjs` — esbuild, `src/client/*-entry.tsx` → `public/assets/client/*.js`, minified, external: react/react-dom hariç.
7. Oluştur: `src/lib/ssr.ts`:
   ```ts
   import { renderToReadableStream } from 'react-dom/server.edge';
   export async function renderPage(element: ReactElement): Promise<Response> {
     const stream = await renderToReadableStream(element, { bootstrapModules: [] });
     return new Response(stream, { headers: { 'content-type': 'text/html; charset=utf-8' } });
   }
   ```
8. Oluştur: `src/ssr/shell.tsx` — `<html lang><head>...<body>` döküman iskelet component.
9. Oluştur: `src/routes/public/ssr-test.ts` — basit Hono handler: `return renderPage(<html><body><h1>Hello SSR</h1></body></html>)`.
10. `npm run build:css && npm run build:client && wrangler dev` → `/ssr-test` tarayıcıda "Hello SSR" gösterir.

**Checkpoint:**
- `wrangler deploy --dry-run` Worker bundle boyutunu rapor eder (< 1MB beklenir).
- `/ssr-test` HTML döner, view source'ta tam HTML görülür (SPA değil).
- `public/assets/publisher.css` oluşuyor.

**Silinecek:** hiçbir şey (non-destructive faz).

---

### Faz 1 — Paylaşılan UI paketi (`packages/ui/`)

**Amaç:** Admin'deki shadcn component'lerini tek kaynağa taşımak, public'in kullanabilmesini sağlamak.

**Yapılacaklar:**
1. `packages/ui/` klasör oluştur.
2. Admin'den taşı: `admin/src/components/ui/*.tsx` → `packages/ui/*.tsx`. 16 component birebir kopyalanır. Admin'in `lib/utils.ts` (cn helper) → `packages/ui/lib/utils.ts`.
3. Admin'de `admin/src/components/ui/` dizini kaldırılır. Admin'in tüm import'ları (`@/components/ui/button` → `@ui/button`) find-and-replace ile güncellenir.
4. `tsconfig.json` root + `admin/tsconfig.json` path alias:
   ```json
   "paths": { "@ui/*": ["packages/ui/*"], "@/*": ["./src/*"] }
   ```
5. `admin/vite.config.ts` alias:
   ```ts
   resolve: { alias: { '@ui': path.resolve(__dirname, '../packages/ui'), '@': path.resolve(__dirname, './src') } }
   ```
6. Admin tailwind config `content` path'ine `../packages/ui/**/*.tsx` eklenir.
7. Public tarafı için public-styles tailwind config'ine `packages/ui/**/*.tsx` + `src/ssr/**/*.tsx` eklenir.
8. `packages/ui/tokens/design-tokens.css` oluştur — shadcn HSL `:root` ve `.dark` blokları (admin'den).
9. Public için ekstra primitive'ler:
   - `packages/ui/container.tsx` — `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` wrapper
   - `packages/ui/prose.tsx` — typography stil wrapper (tailwind typography plugin'i kullanılır)
   - `packages/ui/nav-menu.tsx` — site menü primitive

**Checkpoint:**
- `cd admin && npm run build` hatasız tamamlanır.
- Admin tarayıcıda açılır, görsel regresyon yok.

**Silinecek:**
- `admin/src/components/ui/` (içerik `packages/ui/`'ya taşındı)
- `admin/src/lib/utils.ts` (içerik `packages/ui/lib/utils.ts`'e taşındı)

---

### Faz 2 — SSR helper + Shell + PublisherLayout iskeleti

**Amaç:** Layout component'lerini React'te yeniden yazmak, ama henüz route'lara bağlamamak.

**Yapılacaklar:**
1. `src/ssr/shell.tsx` — tam döküman iskelet:
   - `<html lang={lang} className={themeClass}>`
   - `<head>`: meta, title, CSS link, `headNodes.map(...)`, analytics head
   - `<body>`: `bodyStartNodes`, `{children}`, `bodyEndNodes`, client script tag
2. `src/ssr/layouts/PublisherLayout.tsx` — shadcn primitive'leri kullanan tek tema:
   - `<Header>`: logo/site adı, `<NavMenu items={navItems}/>`, `<PluginSlot name="headerRight"/>`, `<ThemeToggle/>`, mobile drawer trigger
   - `<main>`: `{children}` + opsiyonel `<Sidebar widgets={sidebarData.sidebar}/>` (tema ayarına göre layout)
   - `<Footer>`: 4 widget kolonu + copyright satırı + powered by (white label kontrolü)
3. `src/ssr/components/Header.tsx`, `Footer.tsx`, `Sidebar.tsx`.
4. `src/ssr/components/SEOHead.tsx` — mevcut `src/components/SEOHead.tsx`'in React portu.
5. `src/ssr/components/PostCard.tsx` — shadcn Card tabanlı, mevcut `src/components/PostCard.tsx` portu.
6. `src/ssr/components/Pagination.tsx` — port.
7. `src/ssr/components/PostContent.tsx`:
   ```tsx
   export function PostContent({ html }: { html: string }) {
     return <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
   }
   ```
8. `src/ssr/components/WidgetRenderer.tsx` — widget type switch, mevcut `src/components/WidgetRenderer.tsx`'in React portu.
9. `src/ssr/components/MenuRenderer.tsx` — nav tree recursive render.
10. `src/ssr/components/ThemeStyles.tsx`:
    ```tsx
    export function ThemeStyles({ vars }: { vars: Record<string, string> }) {
      const css = ':root{' + Object.entries(vars).map(([k,v]) => `${k}:${v}`).join(';') + '}';
      return <style dangerouslySetInnerHTML={{ __html: css }} />;
    }
    ```
11. Basit island'ları ekle: `src/ssr/islands/ThemeToggle.tsx`, `MobileDrawer.tsx`, `SearchOverlay.tsx`.
12. `src/client/publisher-entry.tsx`:
    ```tsx
    import { hydrateRoot } from 'react-dom/client';
    import { ThemeToggle } from '../ssr/islands/ThemeToggle';
    document.querySelectorAll('[data-island="theme-toggle"]').forEach(el => {
      hydrateRoot(el, <ThemeToggle />);
    });
    // same for mobile-drawer, search-overlay
    ```
13. `src/routes/public/ssr-test.ts` güncellenir: tam `<Shell><PublisherLayout>...</PublisherLayout></Shell>` render eder, mock data ile.

**Checkpoint:**
- `/ssr-test` tam layout'u gösterir, nav, widget, footer dahil.
- Tailwind sınıfları CSS'te bulunur (view source'ta bu class'ları kullanan kurallar var).
- Theme toggle butonuna tıklanır, dark mode açılır (island çalışıyor).

**Silinecek:** yok.

---

### Faz 3 — Landing sayfası

**Amaç:** `/landing` route'unu tamamen React SSR'a taşımak.

**Yapılacaklar:**
1. `src/ssr/pages/Landing.tsx` yeni React component. Mevcut `landing_config` JSON şemasını prop olarak alır. Bölümler:
   - `<Nav>` — sticky, backdrop-blur, logo + menu + `<ThemeToggle/>` + CTA buton
   - `<Hero>` — `font-heading` başlık, muted subtitle, Button varyantları (primary + outline), hero-stats grid, dekoratif grid background
   - `<Features>` — `grid grid-cols-1 md:grid-cols-3 gap-6` + shadcn `<Card>` + lucide ikon
   - `<Pricing>` — Card grid, highlighted varyantı `ring-2 ring-primary`, enterprise card'ı outline
   - `<Testimonials>` — Card + Avatar + yıldız ikonları
   - `<CTA>` — accent band, button
   - `<Footer>` — border-t, link grid
2. `src/routes/public/landing.ts` (uzantı `.tsx` → `.ts`): mevcut data loading mantığı korunur (landing_config çekme, packages pricing merge). Son satır:
   ```ts
   return renderPage(
     <Shell lang="tr" cssBundle="/assets/publisher.css" clientBundle="/assets/client/landing.js" themeClass="dark">
       <Landing config={config} />
     </Shell>
   );
   ```
3. `src/client/landing-entry.tsx` — sadece ThemeToggle hydrate.
4. `scripts/build-client.mjs` `landing-entry.tsx`'i de bundle eder.
5. Mevcut `src/routes/public/landing.tsx` silinir (landing.ts ile değiştirildi).

**Checkpoint:**
- `/landing` yeni tasarımla açılır.
- Admin'deki mevcut `landing_config` verisi tüm alanlarda görünür.
- View source: tam SSR HTML, JS devre dışı bırakılsa bile sayfa tam (SEO testi).
- Lighthouse mobile: performans ≥ 85.

**Silinecek:**
- `src/routes/public/landing.tsx` (401 satır)

---

### Faz 4 — Post ve sayfa render (en büyük faz)

**Amaç:** Home, Post, Archive, Search, Page route'larını React SSR'a taşımak.

**Yapılacaklar:**
1. `src/ssr/pages/Home.tsx` — posts grid + pagination. Homepage ayarına göre ya post listesi ya da static page render eder (bu mantık handler'da).
2. `src/ssr/pages/Post.tsx` — breadcrumb, title, meta (author, date, read time), featured image, `<PostContent html={processed}/>`, taxonomies, comments section, related posts.
3. `src/ssr/pages/Page.tsx` — statik sayfa (CMS page).
4. `src/ssr/pages/Archive.tsx` — kategori/etiket/yazar başlığı + posts grid + pagination.
5. `src/ssr/pages/Search.tsx` — query input + sonuç listesi + "no results" empty state.
6. Her handler (`src/routes/public/home.ts`, `post.ts`, `archive.ts`, `search.ts`, `page.ts`) yeniden yazılır:
   - Data fetching MANTIĞI korunur (tüm Promise.all çağrıları, setting okumaları, plugin hook invocation'ları)
   - Shortcode processing korunur (`processAllShortcodes` post içeriği için)
   - `getLayoutComponent(template)` → SILINIR, yerine direkt `PublisherLayout` import
   - Sonunda `renderPage(<Shell>...<PublisherLayout>...<Page .../></PublisherLayout></Shell>)` döner
7. `src/lib/plugins/react-bridge.ts` oluştur — `collectHeadNodes`, `collectBodyStartNodes`, `collectBodyEndNodes`, `wrapPostContent` fonksiyonları. Handler'lar bunları çağırır.
8. Content layout (`src/lib/layout.ts` → shortcode içeren page layout JSON) — mevcut HTML üretir, `PostContent` ile render edilir. Kod değişmez.

**Dikkat edilecekler:**
- `LayoutDebug.tsx`'ın debug query param (`?lay`) mantığı Home handler'ında vardır — yeni bir `src/ssr/pages/LayoutDebug.tsx` ile yer değiştirir veya tamamen silinir (bu developer-only debug view, MVP için silinebilir).
- Post içeriğindeki `wp-float-left`, `wp-cover` gibi WordPress-style class'lar `packages/ui/prose.tsx` içinde stil almalıdır (admin'in `index.css`'inden bu kurallar taşınır).
- Plugin hook'larının HTML string dönüşleri köprü üzerinden ReactNode'a çevrilir — mevcut contact-form, seo-optimizer, social-share plugin'leri ÇALIŞMAYA DEVAM EDER.

**Checkpoint:**
- Test sitesinde `/`, `/post-slug`, `/category/foo`, `/?s=term`, statik sayfa — hepsi render olur.
- View source: tam HTML, tüm meta tag'ler (SEO), JSON-LD var.
- contact-form plugin aktif bir sitede `/iletisim` sayfasında form çalışır (eski HTML string hook'u üzerinden).
- Shortcode'lu bir post içeriği (`[son-yazilar sayi=6]` vb.) doğru render olur.

**Silinecek:**
- `src/routes/public/home.tsx` (eski)
- `src/routes/public/post.tsx` (eski)
- `src/routes/public/archive.tsx` (eski)
- `src/routes/public/search.tsx` (eski)
- `src/components/LayoutDebug.tsx` (252 satır — debug view silindi veya rewriten)

---

### Faz 5 — Theme engine + seed güncelleme

**Amaç:** Eski 4 tema layout dosyasını silmek, palette sistemine geçmek, seed.sql'e sıfırdan birkaç görünüm + örnek veri koymak.

**Yapılacaklar:**
1. `src/lib/themes/palettes.ts` — 8 shadcn palette (neutral, zinc, slate, stone, rose, blue, emerald, violet). Her biri light + dark HSL değerleri. Kaynak: [ui.shadcn.com/themes](https://ui.shadcn.com/themes).
2. `src/lib/themes/engine.ts` — `loadActiveTheme(db, siteId)`, `applyPaletteOverrides(palette, overrides)`, `buildThemeStyles(merged)`.
3. `src/lib/themes/types.ts` — `Palette`, `ThemeManifest` tipleri.
4. `src/lib/public-db.ts` içindeki `getSiteTheme` — yeni tipi döner, eski `SiteTheme` interface kaldırılır.
5. **Seed'i temiz yeniden yaz** — eski 4 tema (starter/modern/velvet/publisher) satırları SILINIR, yerine tek `default-publisher` teması eklenir:
   ```sql
   DELETE FROM themes;
   DELETE FROM site_themes;

   INSERT INTO themes (id, name, slug, description, version, css_variables, layout_config, is_system)
   VALUES ('default-publisher', 'Default Publisher', 'default-publisher',
           'shadcn/ui tabanlı varsayılan tema — 8 palette varyantı',
           '2.0.0',
           '{"--background":"0 0% 100%","--foreground":"222.2 84% 4.9%","--primary":"221.2 83.2% 53.3%","--primary-foreground":"210 40% 98%","--secondary":"210 40% 96.1%","--muted":"210 40% 96.1%","--accent":"210 40% 96.1%","--border":"214.3 31.8% 91.4%","--ring":"221.2 83.2% 53.3%","--radius":"0.5rem"}',
           '{"manifest_version":2,"entry":"publisher","palette_variants":["neutral","zinc","slate","stone","rose","blue","emerald","violet"]}',
           1);

   INSERT INTO site_themes (id, site_id, theme_id, is_active, custom_overrides)
   VALUES (lower(hex(randomblob(8))), 1, 'default-publisher', 1, '{"palette":"neutral"}');
   ```
6. **Migration script'i gerekmez.** Aktif kullanıcı olmadığı için eski `custom_overrides` JSON'larını map etme ihtiyacı yok — yeni seed ile sıfırdan başlanır.
7. **Seed örnek görünümler:** 2-3 alt tema varyantı sunmak için admin'den palette seçilebilir şekilde kurgu. `seed.sql`'e birkaç örnek site eklenebilir (bkz. Bölüm 13), her biri farklı palette ile:
   - Site 1: Default Publisher + neutral palette
   - (opsiyonel) Site 2: Default Publisher + rose palette — pembe görünüm örneği
   - (opsiyonel) Site 3: Default Publisher + emerald palette — yeşil görünüm örneği

**Checkpoint:**
- `wrangler d1 execute cms-db-v2 --remote --file=src/db/seed.sql` tekrar çalıştırılınca seed verisi yüklenir.
- `https://wp-cms-v2.{account}.workers.dev` açılır, örnek site Default Publisher teması ile render edilir.
- Admin'den palette değiştirildiğinde (Faz 6'da) site rengi anında değişir.

**Silinecek:**
- `src/components/Layout.tsx` (671 satır) ✂
- `src/components/LayoutModern.tsx` (682 satır) ✂
- `src/components/LayoutVelvet.tsx` (802 satır) ✂
- `src/components/LayoutPublisher.tsx` (549 satır) ✂
- `src/components/WidgetRenderer.tsx` (100 satır — portu `src/ssr/components/` altında) ✂
- `src/components/PostCard.tsx` (85 satır — portu `src/ssr/components/`) ✂
- `src/components/Pagination.tsx` (47 satır — portu `src/ssr/components/`) ✂
- `src/components/SEOHead.tsx` (81 satır — portu `src/ssr/components/`) ✂
- `src/lib/layoutResolver.ts` (38 satır) ✂
- `src/lib/theme-renderer.ts` (19 satır) ✂
- `src/lib/themePresets.ts` (eski preset tanımları, yeni `palettes.ts` ile değiştirildi) ✂
- `src/lib/themeEngine.ts` (yeni `src/lib/themes/engine.ts` ile değiştirildi) ✂

**Toplam silinen: ~3074 satır Hono JSX + inline CSS.**

---

### Faz 6 — Admin tema seçim UI güncellemesi

**Amaç:** Admin panelindeki tema seçim ekranını palette sistemine uydurmak.

**Yapılacaklar:**
1. `admin/src/pages/themes/ThemeStore.tsx` — eski 4 tema kartı kaldırılır, tek "Default Publisher" card + palette grid gösterir. Her palette kartı canlı renk swatch'i gösterir.
2. `admin/src/pages/themes/ThemeCustomizer.tsx` — custom_overrides form alanları shadcn token isimleriyle hizalanır (primary, secondary, background, foreground, muted, accent, border, destructive).
3. `admin/src/pages/themes/PaletteSelector.tsx` — palette listesini `packages/ui/tokens/design-tokens.css`'den veya `src/lib/themes/palettes.ts`'den okur.
4. API route `src/routes/api/themes.ts` — mevcut endpoint'ler korunur ama döndürdüğü veri yeni `palettes` listesini de içerir.
5. `admin/src/pages/settings/LandingSettings.tsx` — dokunulmaz. Şema değişmedi.

**Checkpoint:**
- Admin panelinden tema sayfası açılır, Default Publisher + 8 palette seçeneği görünür.
- Bir palette seçilir → veritabanında `site_themes.custom_overrides` güncellenir → site yeniden açıldığında yeni renkte görünür.
- Mevcut custom renk override'ı olan site hâlâ o renkte.

**Silinecek:** admin tarafında tema seçimi artık 4 preset referansı ilerletmiyorsa, eski import'lar temizlenir.

---

### Faz 7 — Plugin API v2 + bundled plugin'lerin yeniden yazımı

**Amaç:** Plugin engine'i ReactNode API'sine taşımak, bundled plugin'leri (contact-form, seo-optimizer, social-share, hero-slider) React + shadcn ile yeniden yazmak. Eski string API silinir.

**Yapılacaklar:**
1. `src/lib/plugins/types.ts` tamamen yeniden yazılır (bkz. Bölüm 3.2). Eski string hook'lar (`page.head`, `page.bodyStart`, `page.bodyEnd`, `post.beforeRender`) **silinir**, yerlerine `ui.head`, `ui.bodyStart`, `ui.bodyEnd`, `ui.postContent` gelir.
2. `src/lib/plugins/collectors.ts` oluştur (bkz. Bölüm 3.3).
3. Route handler'lar slot içeriklerini pre-fetch eder, prop olarak PublisherLayout'a geçirir:
   ```ts
   const [headerRight, sidebarTop, sidebarBottom, footerEnd] = await Promise.all([
     collectSlot('ui.slot.headerRight', site),
     collectSlot('ui.slot.sidebarTop', site),
     collectSlot('ui.slot.sidebarBottom', site),
     collectSlot('ui.slot.footerEnd', site),
   ]);
   ```
4. `PublisherLayout` slot prop'larını render eder (async component değil — pre-fetched).
5. **Bundled plugin'ler yeniden yazılır:**

   **contact-form** (`src/plugins/contact-form/index.tsx`):
   - Eski `buildContactFormHtml` + inline `<script>` yaklaşımı silinir
   - Yeni: React component export eder, `<Card>`, `<Input>`, `<Textarea>`, `<Button>`, `<Label>` primitive'leri kullanır
   - Hook: `ui.postContent` → post HTML içinde `[contact-form]` shortcode'u bulunursa yerine React component konur
   - Client-side submit için `src/ssr/islands/ContactFormIsland.tsx` — `data-island="contact-form"` ile hydrate
   - Manifest (`manifest.json`) güncellenir: hooks = `["ui.postContent"]`
   - captcha/reCAPTCHA mantığı korunur

   **seo-optimizer** (`src/plugins/seo-optimizer/index.tsx`):
   - Eski HTML meta tag injection silinir
   - Yeni: `ui.head` hook'unda ReactNode array'ine ek meta tag'ler ve JSON-LD pusher
   - Tip güvenli, composition-friendly

   **social-share** (`src/plugins/social-share/index.tsx`):
   - Yeni: `ui.slot.postFooter` hook'unda shadcn `<Button>` grid (Twitter/X, Facebook, WhatsApp, LinkedIn, Copy Link ikonları lucide-react'ten)
   - Client-side share logic için küçük bir island

   **hero-slider** (`src/plugins/hero-slider/index.tsx`):
   - Shortcode renderer korunur (post content içinde string ile işlenir)
   - Ama stil tamamen shadcn token'larıyla yeniden yazılır
   - Client-side slide logic mevcut işleyişini korur

6. Plugin dokümantasyonu (`docs/plugin-development.md`) **yeni baştan yazılır** — sadece v2 API anlatılır, v1 yok.

**Checkpoint:**
- Tüm bundled plugin'ler seed verisinde aktif
- contact-form aktif bir site'ta `[contact-form]` shortcode'u olan sayfa açılır, shadcn stilli form görünür, submit backend'e ulaşır
- seo-optimizer meta tag'leri view source'ta doğru yerde
- social-share post footer'ında shadcn butonları ile görünür
- hero-slider shortcode'u olan post'ta slider çalışır

**Silinecek:**
- `src/plugins/contact-form/index.ts` (eski HTML string versiyon)
- `src/plugins/seo-optimizer/index.ts`
- `src/plugins/social-share/index.ts`
- `src/plugins/hero-slider/index.ts`
- Eski plugin hook isimleri `types.ts` içinden: `page.head`, `page.bodyStart`, `page.bodyEnd`, `post.beforeRender`

---

### Faz 8 — Final temizlik

**Amaç:** "Gereksiz hiçbir kod parçası kalmasın" — son denetim ve silme turu.

**Yapılacaklar:**
1. `src/components/` klasöründe sadece AMP ile ilgili dosyalar kalır:
   - `AMPLayout.tsx` — KORUNUR (AMP ayrı dünya, Türkiye yasakları için kritik)
   - `ErrorPage.ts` — KORUNUR (Hono JSX error sayfası, index.ts kullanıyor)
   - Diğer her şey bu faz sonunda silinmiş olmalı.
2. `src/index.ts`'te render ile ilgili eski import'lar temizlenir (`getLayoutComponent`, `LayoutDebug` vb. kaldırılır; `renderErrorPage` korunur).
3. `tsconfig.json`'da `jsxImportSource: "react"` global default olur. AMP route'ları (`src/routes/public/amp/*.tsx`), `feed.tsx`, `sitemap.tsx` dosyalarında per-file pragma: `/** @jsxImportSource hono/jsx */`.
4. `src/types.ts` içinde `SiteTheme` interface'in eski layout_config alanları (header_style, post_card_style, nav_style, vb.) kaldırılır — yerini `ThemeManifest` alır.
5. `src/lib/plugins/types.ts` içinden eski hook isimleri (`page.head`, `page.bodyStart`, `page.bodyEnd`, `post.beforeRender`) tamamen silinir. Sadece v2 API kalır.
6. `src/lib/plugins/engine.ts` içinde eski hook referansları kalmadığından emin ol, tipler güncellenir.
7. README.md güncellenir:
   - Teknoloji yığını: "Frontend: React 19 SSR + Tailwind + shadcn/ui (admin + public unified)"
   - Plugin yazım örnekleri güncellenir (v2 API)
   - Tema yazım bölümü eklenir (ThemeManifest v2)
8. `admin/package.json`'dan `packages/ui`'ya taşınan bağımlılıklar duplicate değilse temizlenir.
9. `docs/` altındaki eski plan dosyaları arşive alınır (veya silinir) — bu planın uygulaması tamamlandığında kaldıkları yere bırakılır, referans için.

**Checkpoint:**
- `tsc --noEmit` hatasız.
- `grep -r "from 'hono/jsx'" src/` sadece: `feed.tsx`, `sitemap.tsx`, `amp/*.tsx`, `ErrorPage.ts` ile eşleşir.
- `grep -r "LayoutModern\|LayoutVelvet\|LayoutPublisher\|layoutResolver\|theme-renderer\|themePresets\|themeEngine" src/` → **0 match**.
- `grep -r "page\.head\|page\.bodyStart\|page\.bodyEnd\|post\.beforeRender" src/` → **0 match** (sadece yeni `ui.head`, `ui.bodyStart`, vb.).
- Worker bundle < 1MB (`wrangler deploy --dry-run`).
- `https://wp-cms-v2.{account}.workers.dev` üzerinde tüm sayfa tipleri (home, post, archive, search, page, landing, AMP) çalışır.

**Silinecek (bu fazda kesinleşir):**
- `src/components/LayoutDebug.tsx` (252 satır) — debug blueprint view, kullanıcı tarafından onaylı silme
- Plugin v1 hook tipleri (types.ts içinden)
- Eski plugin v1 bundled kod (Faz 7'de silindi, burada doğrulama)
- Artık kullanılmayan her türlü `hono/html` `raw()` referansı public render dosyalarında

---

### Faz 9 — Doğrulama ve performans turu

**Yapılacaklar:**
1. En az 3 test sitesi oluştur — biri boş, biri eski palette ile (migration sonrası), biri 2+ plugin aktif (contact-form + seo-optimizer).
2. Her site için sayfa tipi matrisi:
   | Sayfa | Render OK | SEO meta OK | Shortcode OK | Plugin inject OK |
   |-------|-----------|-------------|--------------|------------------|
   | / (home blog) | | | | |
   | / (home static page) | | | | |
   | /post-slug | | | | |
   | /category/slug | | | | |
   | /tag/slug | | | | |
   | /?s=query | | | | |
   | /page-slug | | | | |
   | /landing (admin domain) | — | | | |
3. **AMP regresyon:** `/post-slug?amp=1` AMP HTML döner, yeni sisteme karışmamıştır.
4. **i18n:** Çok dilli site, `/en/post-slug` ve `/post-slug` arası doğru prefix ile çalışır, hreflang alternate link'leri basılır.
5. **Plugin v1 regresyon:** contact-form'u olan site → iletişim form'u çalışır, submit backend'e ulaşır.
6. **Widget regresyon:** Sidebar widget'ları (categories, recent_posts, tags, text, menu) doğru render olur. Footer widget'ları 4 kolonda çalışır.
7. **Theme variants:** Admin'den palette değiştir, 5 saniyede site yansıtır (cache invalidation check).
8. **Dark mode:** ThemeToggle island tıklandığında `.dark` class `<html>`'e eklenir, tüm renkler geçiş yapar.
9. **Mobile drawer:** < 768px viewport'ta mobile nav çalışır.
10. **Performance:**
    - Worker bundle < 1MB (`wrangler deploy --dry-run` raporu)
    - Public CSS bundle < 80KB gzipped
    - Lighthouse mobile: landing ≥ 90 perf, ≥ 95 a11y; tek post ≥ 90 perf, ≥ 95 a11y
    - Cold start ölçümü: `wrangler dev` + `time curl localhost:8787/` — ilk çağrı < 300ms
11. **SEO koruma:**
    - `sitemap.xml` aynı URL'leri üretir
    - `feed.xml` RSS'te aynı post'lar görünür
    - JSON-LD (Article, Organization, BreadcrumbList) geçerli schema (Google Rich Results Test)

---

## 6. DOSYA SİLME LİSTESİ (tam envanter)

**Önemli:** Silme işlemleri yeni repo (`WP-WORKER-V2/`) içinde yapılır. Mevcut `WP-WORKER/` klasörüne **hiçbir silme uygulanmaz**. Aşağıdaki liste yeni repo'daki temizliği gösterir — mevcut kod tabanına dokunulmuyor.

Toplam **~6700+ satır silinecek** Hono JSX + inline CSS + legacy plugin kodu:

### Kesin silinecek (13 dosya)
| Dosya | Satır | Neden |
|-------|------:|-------|
| `src/components/Layout.tsx` | 671 | Starter tema — tek PublisherLayout'a konsolide |
| `src/components/LayoutModern.tsx` | 682 | Modern tema — konsolide |
| `src/components/LayoutVelvet.tsx` | 802 | Velvet tema — konsolide |
| `src/components/LayoutPublisher.tsx` | 549 | Publisher tema — React'e port edildi |
| `src/components/LayoutDebug.tsx` | 252 | Debug blueprint view — MVP'ye gerek yok |
| `src/components/PostCard.tsx` | 85 | Port edildi → `src/ssr/components/PostCard.tsx` |
| `src/components/Pagination.tsx` | 47 | Port edildi |
| `src/components/SEOHead.tsx` | 81 | Port edildi |
| `src/components/WidgetRenderer.tsx` | 100 | Port edildi |
| `src/routes/public/landing.tsx` | 401 | Yeniden yazıldı `src/routes/public/landing.ts` + `src/ssr/pages/Landing.tsx` |
| `src/routes/public/home.tsx` | 265 | Yeniden yazıldı `home.ts` + `Home.tsx` |
| `src/routes/public/post.tsx` | 392 | Yeniden yazıldı `post.ts` + `Post.tsx` |
| `src/routes/public/archive.tsx` | 168 | Yeniden yazıldı `archive.ts` + `Archive.tsx` |
| `src/routes/public/search.tsx` | 149 | Yeniden yazıldı `search.ts` + `Search.tsx` |
| `src/lib/layoutResolver.ts` | 38 | Tek layout var, resolver gereksiz |
| `src/lib/theme-renderer.ts` | 19 | Dispatcher gereksiz |
| `src/lib/themePresets.ts` | ~180 | Yerini `src/lib/themes/palettes.ts` alır |
| `src/lib/themeEngine.ts` | ~150 | Yerini `src/lib/themes/engine.ts` alır |
| `admin/src/components/ui/*` | ~800 | `packages/ui/` altına taşındı |
| `admin/src/lib/utils.ts` | ~5 | `packages/ui/lib/utils.ts`'e taşındı |
| `src/plugins/contact-form/index.ts` | ~300 | v1 HTML string plugin, v2 TSX yeniden yazım |
| `src/plugins/seo-optimizer/index.ts` | ~? | v1, v2 yeniden yazım |
| `src/plugins/social-share/index.ts` | ~? | v1, v2 yeniden yazım |
| `src/plugins/hero-slider/index.ts` | ~? | v1, v2 yeniden yazım |
| `src/lib/plugins/types.ts` eski hook'lar | ~15 satır | `page.head/bodyStart/bodyEnd/post.beforeRender` silinir |
| **Toplam silinen** | **~6700+ satır** | |

### Kesin korunacak
| Dosya | Neden |
|-------|-------|
| `src/components/AMPLayout.tsx` | AMP ayrı tasarım dili, Tailwind uyumsuz |
| `src/components/ErrorPage.ts` | Error page rendering (Hono'dan çağrılıyor) |
| `src/routes/public/feed.tsx` | RSS XML, Hono JSX yeterli |
| `src/routes/public/sitemap.tsx` | Sitemap XML, Hono JSX yeterli |
| `src/routes/public/git.ts` | URL shortener redirect, JSX yok |
| `src/routes/public/amp/*.tsx` | AMP dünyası ayrı kalır |
| `src/lib/layout.ts` | Page layout JSON processor (shortcode HTML) |
| `src/lib/shortcodes/**` | HTML string processor, değişmez |
| `src/lib/plugins/**` | Engine + dispatcher + sandbox korunur, sadece types + react-bridge eklenir |
| `src/plugins/**` | Bundled plugin'ler (HTML string API, shim üzerinden çalışır) |
| `src/lib/public-db.ts`, `nav-utils.ts`, `lang.ts`, `i18n/`, `sanitize.ts`, `schema.ts`, `slug.ts`, `storage.ts`, `cache.ts`, `auth.ts`, `db.ts`, `email.ts`, `settings.ts`, `search.ts`, `revisions.ts`, `content-types.ts`, `ai-*`, `contety*`, `totp.ts`, `recaptcha.ts`, `wp-import.ts`, `amp.ts`, `default-content.ts` | İş mantığı, render'dan bağımsız |
| `src/middleware/**` | Aynı |
| `src/routes/api/**` | API, değişmez |
| `admin/**` (ui klasörü hariç) | Değişmez, sadece import path'leri @ui/* olarak güncellenir |

### Yeni eklenecek (özet)
- `packages/ui/` (16 primitive + container + prose + nav-menu + lib/utils + tokens/design-tokens.css)
- `public-styles/input.css`, `public-styles/tailwind.config.ts`
- `src/ssr/shell.tsx`
- `src/ssr/layouts/PublisherLayout.tsx`
- `src/ssr/pages/{Landing,Home,Post,Page,Archive,Search}.tsx` (6 dosya)
- `src/ssr/components/{SEOHead,PostCard,Pagination,PostContent,WidgetRenderer,MenuRenderer,Header,Footer,Sidebar,ThemeStyles,PluginSlot}.tsx` (11 dosya)
- `src/ssr/islands/{ThemeToggle,MobileDrawer,SearchOverlay}.tsx` (3 dosya) + `island-registry.ts`
- `src/client/publisher-entry.tsx`, `src/client/landing-entry.tsx`
- `src/lib/ssr.ts`
- `src/lib/themes/{palettes,engine,types}.ts`
- `src/lib/plugins/react-bridge.ts`
- `src/db/migrations/2026-04-16-shadcn-theme-migration.sql`
- `scripts/build-public-css.mjs`, `scripts/build-client.mjs`, `scripts/migrate-themes.mjs`

---

## 7. Build ve deploy pipeline

### 7.1 Yeni npm scripts (root `package.json`)
```json
{
  "scripts": {
    "dev": "npm run build:assets && wrangler dev",
    "build:css": "node scripts/build-public-css.mjs",
    "build:client": "node scripts/build-client.mjs",
    "build:assets": "npm run build:css && npm run build:client",
    "build:admin": "cd admin && npm run build",
    "build": "npm run build:assets && npm run build:admin",
    "deploy": "npm run build && wrangler deploy && node scripts/sync-domains.js",
    "migrate:themes": "node scripts/migrate-themes.mjs",
    "db:migrate:local": "wrangler d1 execute cms-db --local --file=src/db/schema.sql",
    "db:migrate": "wrangler d1 execute cms-db --remote --file=src/db/schema.sql"
  }
}
```

### 7.2 Static asset servisi
`wrangler.toml` `[site] bucket = "./admin/dist"` korunur ama yeni bir yaklaşım: **Worker Assets** binding'i public/assets/ için. Alternatif: admin/dist içine public/assets kopyalamak (deploy-time script ile). En temizi:

```toml
[[assets]]
directory = "./public"
binding = "ASSETS"
```

Handler'larda `/assets/publisher.css`, `/assets/client/publisher.js` URL'leri `[site]` + `[[assets]]` sayesinde servis edilir. **Not:** wrangler.toml dual-setup ile dikkatli olunacak — mevcut `[site]` admin SPA'yı servis ediyor, yeni assets binding public CSS/JS'i verir. Çakışma olursa admin'in kendi `/admin/*` path'inde kaldığı için ayrılabilir.

### 7.3 CI/CD
Her deploy öncesi otomatik olarak:
1. `npm run build:assets` (Tailwind + islands)
2. `npm run build:admin` (Vite build)
3. `wrangler deploy`
4. `migrate:themes` sadece schema değiştiğinde (manuel tetiklenir)

---

## 8. Riskler ve azaltma

| # | Risk | Olasılık | Etki | Azaltma |
|---|------|:-:|:-:|---------|
| 1 | React SSR Worker bundle 1MB'ı geçer | Orta | Deploy fail | Faz 0 checkpoint'inde ölçüm. `react-dom/server.edge` minimal export, tree-shake. Gerekirse plugin dispatcher'ı ayrı Worker'a taşı. |
| 2 | Cold start TTFB artar | Orta | SEO/UX | Streaming SSR kullan (`renderToReadableStream`). D1 sorguları `Promise.all` ile paralel. Edge cache (KV) mevcut — kullan. |
| 3 | `nodejs_compat` gerektiren pakette Workers runtime uyumsuzluğu | Düşük | Build fail | React-dom/server.edge özellikle Workers için. Faz 0'da doğrulanır. |
| 4 | Hydration mismatch (SSR HTML ≠ ilk client render) | Orta | Console error, flicker | Island'ları sadece `useEffect` sonrası mount et. `suppressHydrationWarning` island root'unda. ThemeToggle ilk renderda `undefined` theme ile, hydrate sonrası localStorage'dan okur. |
| 5 | Eski plugin HTML string hook'ları kırılır | Düşük | Plugin regresyon | `react-bridge.ts` köprüsü HTML string'leri `dangerouslySetInnerHTML` ile React'e geçirir. bundled plugin'ler test edilir (Faz 9). |
| 6 | Site özelleştirilmiş renkler migrate sırasında kaybolur | Orta | Kullanıcı şikayeti | `migrate-themes.mjs` hex → HSL dönüşümü test edilir, dry-run raporu önce çalıştırılır. Backup DB export. |
| 7 | Widget türleri port sırasında eksik kalır | Düşük | Widget görünmez | Mevcut WidgetRenderer tam port edilir + `widget_type === 'social_media'`, `custom_html` gibi admin tarafında tanımlı tipler de eklenir (admin API'sini incele). |
| 8 | Tailwind content taraması SSR bileşenlerini kaçırır | Düşük | Stil eksik | `public-styles/tailwind.config.ts` content: `['./src/ssr/**/*.tsx', './packages/ui/**/*.tsx']`. Safelist: dinamik class'lar için (örn. palette renkler). |
| 9 | Tema değiştirdikten sonra KV cache eski CSS'i servise devam eder | Orta | Stale görünüm | `enrichThemeWithAdEmbed` / `getSiteTheme` cache key'i tema revision'ı içerir. Admin tema kaydederken cache purge çağrısı. |
| 10 | Admin'in `packages/ui` import yolu Vite ile çakışır | Düşük | Admin build fail | `vite.config.ts` alias + tsconfig paths senkronize. Faz 1 checkpoint'inde admin build test. |
| 11 | AMP route'ları yanlışlıkla yeni PublisherLayout ile render edilir | Düşük | AMP geçersiz | AMP handler'ları direkt `AMPLayout` import ediyor, `theme-renderer.ts` silindiği için `getLayoutComponent` çağrısı kalmaz. AMP test Faz 9'da. |
| 12 | Bundled plugin `contact-form`'un inline CSS'leri yeni tema ile çatışır | Düşük | Görsel | Plugin kendi style'ını inline basar — scoped, çatışma olmaz. Ama yeni palette ile uyumsuz görünebilir. Plugin v2'ye port ileride. |

---

## 9. Doğrulama checklist (Faz 9 özeti)

**Teknik:**
- [ ] `tsc --noEmit` sıfır hata
- [ ] `npm run build:assets` başarılı
- [ ] `npm run build:admin` başarılı
- [ ] `wrangler deploy --dry-run` bundle < 1MB
- [ ] `public/assets/publisher.css` < 80KB gzipped
- [ ] `public/assets/client/publisher.js` < 50KB gzipped
- [ ] `grep -r "Layout.tsx\|LayoutModern\|LayoutVelvet\|LayoutPublisher\|layoutResolver\|theme-renderer\|themePresets\|themeEngine" src/` → 0 match
- [ ] `grep -r "from 'hono/jsx'" src/` → sadece feed.tsx, sitemap.tsx, amp/*, ErrorPage.ts

**Fonksiyonel:**
- [ ] `/landing` yeni tasarım + tüm bölümler + admin config'den dolu
- [ ] Test site home `/` — post list + sidebar + footer
- [ ] Test site post `/hello-world` — tüm meta + shortcode + yorumlar
- [ ] Test site archive `/category/news` — başlık + posts + pagination
- [ ] Test site search `/?s=cms` — sonuç listesi
- [ ] Test site statik sayfa `/hakkimizda` — page layout çalışır
- [ ] AMP `/hello-world?amp=1` — AMP HTML, validator OK
- [ ] Sitemap `/sitemap.xml` — geçerli XML
- [ ] RSS `/feed.xml` — geçerli RSS
- [ ] JS disabled — tüm sayfalar fonksiyonel (SEO)
- [ ] Theme toggle tıklama → dark mode aktif
- [ ] Mobile (< 768px) — drawer menu çalışır
- [ ] Search overlay — açılır, submit çalışır

**Plugin regresyon:**
- [ ] contact-form plugin → `[contact-form]` shortcode → form görünür + çalışır
- [ ] seo-optimizer plugin → meta/jsonld enjekte olur
- [ ] social-share plugin → paylaş butonları görünür
- [ ] hero-slider plugin → slider shortcode çalışır

**Tema regresyon:**
- [ ] Migration sonrası site default palette ile açılır
- [ ] Custom override olan site orijinal renkleri korur
- [ ] Admin'den palette değiştirme → site yansıtır (< 5s)

**Performance:**
- [ ] Lighthouse /landing mobile ≥ 90 performans
- [ ] Lighthouse /post mobile ≥ 90 performans
- [ ] Lighthouse all ≥ 95 accessibility
- [ ] Cold start `/` < 300ms (wrangler dev)
- [ ] Cached `/` < 50ms (edge KV hit)

---

## 10. Faz sıralaması (özet)

```
Faz -1 — Yeni repo + yeni Worker setup (0.5 gün) [NO DELETE — baseline deploy]
Faz 0  — Temel altyapı (React+Tailwind) (1 gün)  [NO DELETE]
Faz 1  — packages/ui/ paketi             (1 gün)  [admin UI klasörü taşınır]
Faz 2  — SSR shell + PublisherLayout     (2 gün)  [NO DELETE]
Faz 3  — Landing sayfası                 (1 gün)  [landing.tsx silinir]
Faz 4  — Post/home/archive/search/page   (3-4 gün)
Faz 5  — Theme engine + seed             (2 gün)  [4 Layout + 4 theme lib SİLİNİR]
Faz 6  — Admin theme UI güncellemesi     (1 gün)
Faz 7  — Plugin API v2 + bundled rewrite (2-3 gün) [v1 plugin'ler silinir]
Faz 8  — Final temizlik                  (1 gün)  [kalan her şey silinir]
Faz 9  — Doğrulama + performans          (1-2 gün)
```

**Toplam: ~16 iş günü.** Her faz ayrı commit/branch. Tüm çalışma yeni repo (`WP-WORKER-V2/`) içinde — mevcut `WP-WORKER/` klasörüne tek karakter dahi yazılmaz.

---

## 11. Gelecek çalışma (bu planın dışında)

1. **3rd party tema kurulumu** — R2'ye yüklenen tema paketleri, dynamic import + allow-list. Faz 8+ olarak ayrı plan.
2. **3rd party plugin ReactNode dispatcher** — izole Worker'dan React component tree döndürme (JSON serialize + whitelist). Faz 7 uzantısı.
3. **React Server Components (RSC)** — Cloudflare Workers RSC desteği olgunlaştığında migration. Şu an stable SSR kullanılıyor, RSC opsiyonel upgrade.
4. **Tailwind v4** — çıktığında theme tokens süreçi sadeleşir.
5. **AMP'in shadcn diline yaklaştırılması** — elle yazılmış AMP CSS pass'i, aynı palette ile uyumlu.
6. **LayoutDebug replace** — developer ihtiyaç duyarsa yeni debug view React'le yeniden yazılır.
7. **Plugin marketplace UI** — admin'de plugin store, Workers for Platforms ile kurulum.

---

## 12. Kullanıcı kararları (2026-04-15 — onaylanmış)

| # | Soru | Karar |
|---|------|-------|
| 1 | AMP korunsun mu silinsin mi? | ✅ **Korunur.** Türkiye'deki internet yasakları nedeniyle AMP engellenen içeriklere erişim için aktif kullanımda. Dokunulmayacak. |
| 2 | LayoutDebug silinsin mi? | ✅ **Silinebilir.** Debug blueprint view, developer-only, MVP'ye gerek yok. |
| 3 | Eski palette variant'lar migrate edilsin mi? | ✅ **Gerek yok.** Mevcut temalar önemsiz, sıfırdan yeni görünümler hazırlanır. |
| 4 | Plugin v1 API deprecation süresi? | ✅ **Direkt silinir.** Aktif çok kullanıcı yok. v1 tek aşamada kaldırılır, v2-only. |
| 5 | Test sitesi verisi — production kopyası mı seed mi? | ✅ **Yeni repo + yeni Worker + seed.sql.** Deploy bittiğinde yeni adreste örnek verilerle çalışmaya hazır. |
| 6 | Deploy stratejisi — kademeli mi big bang mi? | ✅ **Yeni worker paralel yaşar.** Mevcut production'a sıfır dokunma. Yeni worker izole workers.dev subdomain'inde stabil olduktan sonra manuel cutover. |

## 13. Faz -1 kararları (onaylandı)

| Bilgi | Değer |
|-------|-------|
| Yeni local klasör yolu | `C:\Users\Administrator\CLAUDECODE\worker-cms-react` |
| GitHub kullanıcı | `victories` (gh CLI ile auth'lı) |
| Yeni private repo | `victories/worker-cms-react` |
| Cloudflare Worker adı | `wp-cms-v2` |
| Yeni D1 database adı | `cms-db-v2` |
| Yeni R2 bucket adı | `cms-media-v2` |
| Admin user email (seed) | `admin@workercms.local` (değişebilir) |
| Admin user password | Rastgele güçlü şifre üretilir |
| Örnek site adı | `Örnek Site` |
| Cloudflare API token | **Faz -1 adım 4-8 öncesi üretilecek** — kullanıcı manuel verir |

## 14. Seed.sql örnek veri spesifikasyonu

Yeni deploy'un "dolu" gözükmesi için `src/db/seed.sql` şu veriyi içermeli:

1. **1 admin kullanıcı** — email, bcrypt hash şifre, super_admin rolü
2. **1 örnek site** — name, slug, default_language=tr, domain boş (workers.dev üzerinde gezilecek)
3. **Default Publisher tema** (`themes` tablosu) + aktif `site_themes` kaydı (neutral palette)
4. **5 örnek post** — 2'si sticky, 1'i featured image'lı, çeşitli tarihlerle
5. **3 kategori** (Haberler, Teknoloji, Kültür)
6. **1 primary menü** — 4-5 öğe: Anasayfa, Kategoriler (dropdown), Hakkımızda, İletişim
7. **3 widget**:
   - Sidebar: Recent Posts (5 adet)
   - Sidebar: Categories
   - Footer-1: Text (telif hakkı)
8. **1 statik sayfa** — "Hakkımızda"
9. **1 iletişim sayfası** — `[contact-form]` shortcode'u (Faz 7'de plugin aktif olunca çalışır)
10. **Bundled plugin'ler** (`plugins` tablosuna kayıt) — contact-form, seo-optimizer, social-share, hero-slider hepsi kurulu, örnek site için aktif
11. **Landing config** (`global_settings` tablosu) — hero, features, pricing, testimonials, cta doldurulmuş (landing sayfası ilk görüntülemede dolu gelir)

Seed dosyası Faz 5 ve Faz 7 sonrasında zenginleştirilir. Faz -1'de başlangıç minimaldir (kullanıcı + 1 site + mevcut seed ne varsa).

Bu kararlar ve bilgiler onaylandıktan sonra **Faz -1 başlatılır**.
