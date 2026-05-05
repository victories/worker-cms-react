# Landing Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing 716-line `src/ssr/pages/Landing.tsx` with a section-driven, production-grade SaaS landing optimised for WP/Ghost migration with agency persona primary, blogger secondary. Preserve the existing `LandingConfig` schema (additive only), the route's DB merge logic, and the SSR-first hydration model.

**Architecture:** Compose-only `Landing.tsx` entry pulling 9 sections from `src/ssr/pages/landing/sections/`. SSR emits semantic, accessible, JS-free markup. A thin client island layer (`src/client/landing/*`) hydrates the animated wordmark, scroll-reveal observer, theme toggle, and lenis smooth scroll — all guarded by `prefers-reduced-motion`. Hybrid theme (forced-dark hero on top of either root theme) achieved via `[data-section-theme="dark"]` CSS variable scoping. No new R2 assets; visuals are CSS gradients + inline SVG. Bundle additions stay below the 850 KB worker gzip cap.

**Tech Stack:** React 19 SSR · Hono · Cloudflare Worker · Tailwind 3 · shadcn primitives · framer-motion v11 (LazyMotion + domAnimation) · lenis v1 · native `<details>` for FAQ · Space Grotesk + DM Sans (Google Fonts).

**Reference docs:**
- Design doc: `docs/plans/2026-05-05-landing-redesign-design.md`
- Design system: `docs/design/design-system/workercms/MASTER.md`
- Brief: `docs/prompts/landing-redesign.md`
- Project rules: `CLAUDE.md`

---

## Conventions and ground rules

- **Branch:** `feature/landing-redesign` (already created). Master is off-limits.
- **Verification per task** — run BOTH after each implementation step:
  ```bash
  npx tsc --noEmit                 # ≤19 baseline errors
  npm run build:assets             # Tailwind + client bundles
  ```
  If either regresses, do not commit; fix first.
- **Hard cap on the worker bundle** — checked at task 16:
  ```bash
  npx wrangler deploy --dry-run    # gzip line in output
  ```
  Must stay ≤850 KB gzip.
- **Each task ends with one atomic commit.** No batched commits.
- **Hono JSX rule** — every new file is React TSX (no per-file pragma). Route handler `src/routes/public/landing.ts` stays `.ts` + `createElement`.
- **Imports** — `@ui/*` for shadcn primitives, `@ui/lib/utils` for `cn`. Never raw hex; always `bg-primary`, `text-foreground`, etc., backed by CSS variables.
- **Two-phase visual rule** — every animated element renders its **end-state markup** server-side. Client islands replace nodes after hydration, never produce visible content the SSR didn't produce. This avoids hydration flicker and CLS.

---

## Task 1: Scaffold landing folder + SectionTheme primitive

**Files:**
- Create: `src/ssr/pages/landing/Landing.tsx` (placeholder, returns existing tree for now)
- Create: `src/ssr/pages/landing/components/SectionTheme.tsx`
- Create: `src/ssr/pages/landing/components/Icon.tsx` (extracted + extended icon map)
- Create: `src/ssr/pages/landing/sections/.gitkeep`
- Modify: `packages/ui/tokens/design-tokens.css` (add `[data-section-theme="dark"]` block)

**Step 1.1 — SectionTheme primitive**

Create `src/ssr/pages/landing/components/SectionTheme.tsx`:

```tsx
import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import { cn } from '@ui/lib/utils';

interface SectionThemeProps extends Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  theme?: 'auto' | 'dark';
  children: ReactNode;
}

export function SectionTheme({
  theme = 'auto',
  className,
  children,
  ...rest
}: SectionThemeProps) {
  return (
    <section
      data-section-theme={theme === 'dark' ? 'dark' : undefined}
      className={cn(
        'relative',
        theme === 'dark' && 'bg-background text-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </section>
  );
}
```

**Step 1.2 — Section-scoped dark CSS variables**

Append to `packages/ui/tokens/design-tokens.css` (after the existing `:root` and `.dark` blocks, before `@layer` declarations):

```css
/* Section-scoped forced dark surface — used on hero and final CTA so
   they stay theatrical regardless of the user's root theme choice. */
[data-section-theme="dark"] {
  --background: 222 47% 4%;
  --foreground: 0 0% 96%;
  --card: 222 47% 6%;
  --card-foreground: 0 0% 96%;
  --popover: 222 47% 6%;
  --popover-foreground: 0 0% 96%;
  --muted: 222 16% 14%;
  --muted-foreground: 215 20% 65%;
  --border: 220 13% 18%;
  --input: 220 13% 18%;
  /* primary / accent / destructive / ring inherit from root so brand
     stays consistent across themed sections */
}
```

**Step 1.3 — Extracted Icon component**

Create `src/ssr/pages/landing/components/Icon.tsx`. Copy the `ICONS` map and `Icon` component from current `src/ssr/pages/Landing.tsx:118-206`. Add four new icons needed by the redesign:

```tsx
// Add to ICONS map alongside existing entries:
upload: (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>
),
linkSwap: (
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
),
rocket: (
  <>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </>
),
sparkles: (
  <>
    <path d="m12 3-1.9 5.7-5.6 2 5.6 2 1.9 5.7 1.9-5.7 5.6-2-5.6-2z" />
    <path d="M5 21l-.9-2.7-2.6-.9 2.6-.9.9-2.7.9 2.7 2.6.9-2.6.9z" />
    <path d="M19 4l-.6-1.8-1.8-.6 1.8-.6.6-1.8.6 1.8 1.8.6-1.8.6z" />
  </>
),
```

Re-export from this new file. Keep the existing `Landing.tsx` icon map alongside until task 15 deletes it.

**Step 1.4 — Empty Landing.tsx placeholder**

Create `src/ssr/pages/landing/Landing.tsx`:

```tsx
import type { LandingConfig } from '../../pages/Landing';
import { Landing as LegacyLanding } from '../../pages/Landing';

export interface LandingProps {
  config: LandingConfig;
}

/**
 * New compose-only Landing entry. During the redesign migration this
 * file delegates to the legacy Landing while sections are built one
 * by one; task 15 swaps the body for the new section composition.
 */
export function Landing({ config }: LandingProps) {
  return <LegacyLanding config={config} />;
}
```

This placeholder lets us swap the route handler at task 2 without breaking SSR; no visual change yet. It also flushes any tsconfig path resolution issues early.

**Step 1.5 — Verify and commit**

```bash
npx tsc --noEmit             # expect: 19 baseline errors, no new ones
npm run build:assets         # expect: clean
```

```bash
git add src/ssr/pages/landing packages/ui/tokens/design-tokens.css
git commit -m "chore(landing): scaffold landing/ folder + SectionTheme primitive"
```

---

## Task 2: Switch route to new Landing entry + widen LandingConfig type

**Files:**
- Modify: `src/ssr/pages/landing/Landing.tsx` — re-export the type from here
- Modify: `src/ssr/pages/Landing.tsx` — extend `LandingConfig` with new optional fields
- Modify: `src/routes/public/landing.ts` — import from new path
- Modify: `scripts/seed-landing-config.sql` — full rewrite with agency narrative

**Step 2.1 — Add new optional fields to LandingConfig**

In `src/ssr/pages/Landing.tsx`, after the existing `LandingFooterLink` interface, before `LandingConfig`, add:

```ts
export interface LandingMigrationStep {
  label: string;
  desc: string;
  icon?: string;
}

export interface LandingCostRow {
  label: string;
  before: string;
  after: string;
  saving?: string;
}

export interface LandingMultisiteSite {
  name: string;
  visits?: string;
  status?: 'live' | 'draft' | 'error';
}

export interface LandingFaqItem {
  q: string;
  a: string;
}
```

Then extend `LandingConfig`:

```ts
export interface LandingConfig {
  // ... existing fields untouched ...
  labels?: {
    nav?: { features?: string; pricing?: string; faq?: string;
            login?: string; cta?: string };
    pricing?: { popular_badge?: string; per_month_suffix?: string };
    common?: { learn_more?: string; get_started?: string };
  };
  migration?: {
    title?: string;
    subtitle?: string;
    steps?: LandingMigrationStep[];
  };
  costCompare?: {
    title?: string;
    subtitle?: string;
    before_label?: string;
    after_label?: string;
    rows?: LandingCostRow[];
    footnote?: string;
  };
  multisite?: {
    title?: string;
    subtitle?: string;
    bullets?: string[];
    dashboard?: { sites?: LandingMultisiteSite[] };
  };
  faq?: {
    title?: string;
    subtitle?: string;
    items?: LandingFaqItem[];
  };
}
```

**Step 2.2 — Re-export type from new location**

In `src/ssr/pages/landing/Landing.tsx`, add `export type { LandingConfig } from '../Landing';` so future code can import the type from the new path.

**Step 2.3 — Switch route import**

In `src/routes/public/landing.ts:6`, change:

```ts
import { Landing, type LandingConfig } from '../../ssr/pages/Landing';
```

to:

```ts
import { Landing, type LandingConfig } from '../../ssr/pages/landing/Landing';
```

The placeholder Landing still delegates to the legacy component, so the rendered output is identical; this just verifies the new import path works.

**Step 2.4 — Rewrite seed for new narrative**

Replace the entire content of `scripts/seed-landing-config.sql` with the new agency / migration narrative:

```sql
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
```

**Step 2.5 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/Landing.tsx src/ssr/pages/landing/Landing.tsx \
        src/routes/public/landing.ts scripts/seed-landing-config.sql
git commit -m "feat(landing): widen LandingConfig with labels/migration/cost/multisite/faq fields

Schema is additive — every new section guards missing fields, so
existing admin configs render with new sections as no-ops. Seed is
rewritten with the agency + migration narrative; operators must
re-run npm run db:seed (or equivalent) to pick up the new content.
The route now imports from the new landing/ folder; the new entry
delegates to the legacy component so output is unchanged."
```

---

## Task 3: Add Tailwind tokens — Space Grotesk + DM Sans + heading family

**Files:**
- Modify: `public-styles/tailwind.config.ts` — extend `fontFamily`
- Modify: `public-styles/input.css` — add font import + scroll-reveal utilities
- Modify: `src/ssr/shell.tsx` — preload critical font weights (heading 700 + body 400)

**Step 3.1 — Tailwind fontFamily extension**

Open `public-styles/tailwind.config.ts`. In the `theme.extend` block, add:

```ts
fontFamily: {
  heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  sans:    ['"DM Sans"',       'system-ui', 'sans-serif'],
  mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
},
```

**Step 3.2 — Font @import + scroll-reveal utilities**

In `public-styles/input.css`, add at the very top (before `@tailwind base`):

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

Then in the `@layer utilities` block (creating it if absent) add:

```css
@layer utilities {
  /* SSR-safe scroll reveal: starts hidden, becomes visible when the
     IntersectionObserver in landing-entry adds .is-visible. With no
     JS the static fallback below keeps content visible. */
  .reveal {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 350ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform, opacity;
  }
  .reveal.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Hard a11y fallback — applies regardless of JS state */
  @media (prefers-reduced-motion: reduce) {
    .reveal,
    .reveal.is-visible {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
  }

  /* No-JS fallback: the SSR adds .reveal but if JS never runs we don't
     want content to stay invisible. The :root selector below targets
     the no-js class added by Shell. */
  .no-js .reveal {
    opacity: 1;
    transform: none;
  }
}
```

**Step 3.3 — Preload critical fonts in Shell**

The landing route's `head` slot already accepts elements. Modify `src/routes/public/landing.ts:150-156` to preload the two above-fold font files. Replace the current `head` declaration with:

```ts
const head = createElement(
  'head-fragment-marker',
  null,
  // Preconnect saves ~30ms on first font request
  createElement('link', {
    key: 'preconnect-fonts',
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  }),
  createElement('link', {
    key: 'preconnect-fonts-static',
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  })
);
```

(`head-fragment-marker` is fine as a wrapper because Shell renders fragments transparently — verify in Shell.tsx that head children are spread, not wrapped.)

If Shell wraps head with a real element, restructure to a Fragment instead. Inspect `src/ssr/shell.tsx` first; the current Shell signature accepts `head?: ReactNode`. Pass an array via Fragment:

```tsx
import { createElement, Fragment } from 'react';
// ...
const head = createElement(Fragment, null,
  createElement('link', { key: 1, rel: 'preconnect', href: 'https://fonts.googleapis.com' }),
  createElement('link', { key: 2, rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' })
);
```

**Step 3.4 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
# Inspect output:
# - src/ssr/__generated__/tailwind.ts should contain @font-face for DM Sans + Space Grotesk
# - new .reveal classes should be in the file
```

```bash
git add public-styles/tailwind.config.ts public-styles/input.css src/routes/public/landing.ts
git commit -m "feat(landing): add Space Grotesk + DM Sans typography and reveal utilities

Brings the design-system master file's typography choice into the
build. Body uses DM Sans, headings + animated wordmark use Space
Grotesk. The .reveal/.is-visible utility pair gives sections a
no-flicker fade-up that respects prefers-reduced-motion at the CSS
layer, independent of any JS. Preconnect links shave the first font
request."
```

---

## Task 4: Hero section — SSR markup + animated wordmark client island

**Files:**
- Create: `src/ssr/pages/landing/sections/Hero.tsx`
- Create: `src/ssr/pages/landing/components/AnimatedWordmark.tsx` (SSR markup, no motion)
- Create: `src/client/landing/Wordmark.tsx` (client-only framer variant)
- Create: `src/client/landing/motion.tsx` (LazyMotion provider helper)
- Modify: `src/ssr/pages/landing/Landing.tsx` (start composing — render new Hero, fall back to legacy for the rest)

**Step 4.1 — AnimatedWordmark (SSR-safe)**

Create `src/ssr/pages/landing/components/AnimatedWordmark.tsx`:

```tsx
import { cn } from '@ui/lib/utils';

interface AnimatedWordmarkProps {
  text: string;
  className?: string;
}

/**
 * Server-rendered wordmark. Each character is wrapped in a span with
 * data-letter so the client island can target them for stagger reveal
 * after hydration. Without JS, the wordmark renders fully visible —
 * no motion, no flicker.
 */
export function AnimatedWordmark({ text, className }: AnimatedWordmarkProps) {
  const chars = Array.from(text);
  return (
    <span
      data-island="wordmark"
      className={cn(
        'font-heading inline-block tracking-[-0.04em]',
        className
      )}
      aria-label={text}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          data-letter={i}
          aria-hidden="true"
          className="inline-block will-change-transform"
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  );
}
```

**Step 4.2 — Hero section**

Create `src/ssr/pages/landing/sections/Hero.tsx`:

```tsx
import { Container } from '@ui/container';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import type { LandingConfig } from '../Landing';
import { SectionTheme } from '../components/SectionTheme';
import { AnimatedWordmark } from '../components/AnimatedWordmark';
import { Icon } from '../components/Icon';

interface HeroProps {
  hero: NonNullable<LandingConfig['hero']>;
  brandName: string;
}

export function Hero({ hero, brandName }: HeroProps) {
  const titleLines = (hero.title ?? '').split('\n');
  const stats = hero.stats ?? [];

  return (
    <SectionTheme theme="dark" className="overflow-hidden py-24 sm:py-32">
      {/* Ambient blobs — static, hero-only motion budget reserved for wordmark + sub */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 size-[640px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-[-12rem] size-[520px] rounded-full bg-emerald-500/10 blur-3xl"
      />
      {/* Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] bg-[linear-gradient(to_right,theme(colors.border/0.4)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.4)_1px,transparent_1px)] bg-[size:64px_64px]"
      />

      <Container size="xl" className="relative flex flex-col items-center text-center">
        {hero.badge ? (
          <Badge
            variant="secondary"
            className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium"
          >
            <span className="size-2 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
            {hero.badge}
          </Badge>
        ) : null}

        {/* Animated wordmark — replaces brandName in hero only */}
        <div className="mb-6 sm:mb-8">
          <AnimatedWordmark
            text={brandName}
            className="text-5xl sm:text-7xl lg:text-[7rem] leading-none font-bold"
          />
        </div>

        <h1 className="font-heading max-w-3xl text-balance text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {titleLines.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>

        {hero.subtitle ? (
          <p
            data-reveal=""
            className="reveal mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ transitionDelay: '180ms' }}
          >
            {hero.subtitle}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {hero.cta_text ? (
            <Button asChild size="lg" className="group">
              <a href={hero.cta_url || '#'}>
                {hero.cta_text}
                <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
          ) : null}
          {hero.secondary_cta_text ? (
            <Button asChild size="lg" variant="outline">
              <a href={hero.secondary_cta_url || '#'}>{hero.secondary_cta_text}</a>
            </Button>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-20 grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={i}
                data-reveal=""
                className="reveal flex flex-col items-center"
                style={{ transitionDelay: `${280 + i * 60}ms` }}
              >
                <div className="font-heading font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Container>
    </SectionTheme>
  );
}
```

**Step 4.3 — Client motion provider**

Create `src/client/landing/motion.tsx`:

```tsx
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

interface MotionRootProps {
  children: ReactNode;
}

/**
 * Wraps the entire client motion tree. LazyMotion + domAnimation
 * loads only ~10-12 KB of framer-motion features (no `m.div` heavy
 * dependencies). MotionConfig.reducedMotion="user" delegates to the
 * OS preference automatically — every motion child opts out for free.
 */
export function MotionRoot({ children }: MotionRootProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
```

**Step 4.4 — Client wordmark (framer variant)**

Create `src/client/landing/Wordmark.tsx`:

```tsx
import { m, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

interface WordmarkProps {
  text: string;
}

/**
 * Hydrates the SSR wordmark with a stagger reveal. The motion plays
 * once on mount (the first viewport view of the hero) and never again.
 * Reduced-motion users see the static SSR markup unchanged.
 */
export function Wordmark({ text }: WordmarkProps) {
  const reduced = useReducedMotion();
  const chars = useMemo(() => Array.from(text), [text]);

  if (reduced) {
    return (
      <span className="font-heading inline-block tracking-[-0.04em]" aria-label={text}>
        {chars.map((ch, i) => (
          <span key={i} aria-hidden="true" className="inline-block">
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
    );
  }

  return (
    <m.span
      className="font-heading inline-block tracking-[-0.04em]"
      aria-label={text}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 1 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
    >
      {chars.map((ch, i) => (
        <m.span
          key={i}
          aria-hidden="true"
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                type: 'spring',
                damping: 14,
                stiffness: 200,
                mass: 0.6,
              },
            },
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </m.span>
      ))}
    </m.span>
  );
}
```

**Step 4.5 — Update Landing entry to render Hero**

Replace `src/ssr/pages/landing/Landing.tsx`:

```tsx
import type { LandingConfig as LegacyLandingConfig } from '../Landing';
import { Landing as LegacyLanding } from '../Landing';
import { Hero } from './sections/Hero';

export type LandingConfig = LegacyLandingConfig;

export interface LandingProps {
  config: LandingConfig;
}

/**
 * Compose-only entry. During the migration, only Hero is rendered
 * from the new section tree; the rest of the page falls through to
 * the legacy component until each section is migrated. Once all 9
 * sections land (task 14), the legacy import is removed.
 */
export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'WorkerCms';
  const hero = config.hero ?? {};

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased [scroll-behavior:smooth]">
      <Hero hero={hero} brandName={brandName} />
      {/* Remaining sections rendered by legacy until migrated */}
      <LegacyLanding config={{ ...config, hero: {} }} />
    </div>
  );
}
```

(Passing `hero: {}` to legacy stops it from rendering its own duplicate hero.)

**Step 4.6 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
npm run dev   # in another shell — visit http://localhost:8787/landing
              # confirm: new hero renders with dark surface, animated
              # wordmark stagger, no console errors. Stop with Ctrl+C.
```

```bash
git add src/ssr/pages/landing src/client/landing
git commit -m "feat(landing): hero with animated wordmark and forced-dark surface

The hero is the first new section in place. SSR emits the full
end-state markup; the framer-motion wordmark island only replaces
the existing nodes after hydration so there is no flash. Reduced-
motion users see the static markup unchanged. The remaining 8
sections still come from the legacy component and will be replaced
in subsequent commits."
```

---

## Task 5: Migration strip section

**Files:**
- Create: `src/ssr/pages/landing/sections/MigrationStrip.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx` (compose new section after Hero)

**Step 5.1 — MigrationStrip component**

Create `src/ssr/pages/landing/sections/MigrationStrip.tsx`:

```tsx
import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface MigrationStripProps {
  migration: NonNullable<LandingConfig['migration']>;
}

export function MigrationStrip({ migration }: MigrationStripProps) {
  const steps = migration.steps ?? [];
  if (steps.length === 0) return null;

  return (
    <section className="border-t border-border/40 py-20 sm:py-24">
      <Container size="xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          {migration.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {migration.title}
            </h2>
          ) : null}
          {migration.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {migration.subtitle}
            </p>
          ) : null}
        </div>

        <ol className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={i}
              data-reveal=""
              className="reveal"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <Card className="h-full border-border/60 transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-4 p-7">
                  <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name={step.icon ?? 'arrow'} className="size-6" />
                  </div>
                  <div className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {step.label}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
```

**Step 5.2 — Compose into Landing**

In `src/ssr/pages/landing/Landing.tsx`, after `<Hero ...>` and before the legacy fallback, render:

```tsx
{config.migration ? <MigrationStrip migration={config.migration} /> : null}
```

Add `import { MigrationStrip } from './sections/MigrationStrip';` at top.

**Step 5.3 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing
git commit -m "feat(landing): migration strip section"
```

---

## Task 6: Features grid (6 cards, middle accent)

**Files:**
- Create: `src/ssr/pages/landing/sections/Features.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx`
- Modify: legacy `src/ssr/pages/Landing.tsx` to receive `features: { items: [] }` so the legacy Features doesn't double-render. Strategy: in the new Landing entry, pass `{ ...config, features: undefined, hero: {} }` to the legacy component once each migrated section is composed.

**Step 6.1 — Features component**

Create `src/ssr/pages/landing/sections/Features.tsx`:

```tsx
import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface FeaturesProps {
  features: NonNullable<LandingConfig['features']>;
}

export function Features({ features }: FeaturesProps) {
  const items = features.items ?? [];
  if (items.length === 0) return null;

  // Middle card index (for 6 items, index 2 — the third one — is the
  // visual centre on a 3-column desktop grid). Highlight it as the
  // "anchor" feature.
  const accentIndex = Math.floor((items.length - 1) / 2);

  return (
    <section
      id="features"
      className="border-t border-border/40 bg-muted/30 py-24 sm:py-28"
    >
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {features.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {features.title}
            </h2>
          ) : null}
          {features.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {features.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((f, i) => (
            <Card
              key={i}
              data-reveal=""
              className={cn(
                'reveal group relative overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
                i === accentIndex && 'border-primary/40 bg-primary/5'
              )}
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <CardContent className="flex h-full flex-col gap-4 p-8">
                <div
                  className={cn(
                    'inline-flex size-12 items-center justify-center rounded-xl',
                    i === accentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon name={f.icon ?? 'zap'} className="size-6" />
                </div>
                <h3 className="font-heading text-xl font-semibold leading-tight">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

**Step 6.2 — Compose + cut legacy features**

In `src/ssr/pages/landing/Landing.tsx`:

```tsx
{config.features ? <Features features={config.features} /> : null}
```

And update the legacy fallback to:

```tsx
<LegacyLanding config={{ ...config, hero: {}, features: undefined, migration: undefined as any }} />
```

(Cast to `any` is fine; legacy doesn't know about `migration`.)

**Step 6.3 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing
git commit -m "feat(landing): features grid with middle-accent and scroll reveal"
```

---

## Task 7: Cost compare split panel

**Files:**
- Create: `src/ssr/pages/landing/sections/CostCompare.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx`

**Step 7.1 — CostCompare component**

Create `src/ssr/pages/landing/sections/CostCompare.tsx`:

```tsx
import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import { Badge } from '@ui/badge';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';

interface CostCompareProps {
  costCompare: NonNullable<LandingConfig['costCompare']>;
}

export function CostCompare({ costCompare }: CostCompareProps) {
  const rows = costCompare.rows ?? [];
  if (rows.length === 0) return null;
  const total = rows.find(r => r.saving) ?? rows[rows.length - 1];

  return (
    <section className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {costCompare.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {costCompare.title}
            </h2>
          ) : null}
          {costCompare.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {costCompare.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* BEFORE */}
          <Card data-reveal="" className="reveal border-destructive/30">
            <CardContent className="p-7">
              <div className="mb-5 text-xs font-mono uppercase tracking-[0.12em] text-destructive">
                {costCompare.before_label || 'Before'}
              </div>
              <ul className="flex flex-col divide-y divide-border/60">
                {rows.map((r, i) => (
                  <li key={i} className={cn(
                    'flex items-baseline justify-between py-3',
                    r === total && 'pt-5 mt-2 border-t-2 border-destructive/40 font-semibold'
                  )}>
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="font-mono tabular-nums text-foreground">{r.before}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* AFTER */}
          <Card
            data-reveal=""
            className="reveal border-emerald-500/30 bg-emerald-500/[0.03]"
            style={{ transitionDelay: '120ms' }}
          >
            <CardContent className="p-7">
              <div className="mb-5 flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                  {costCompare.after_label || 'After'}
                </div>
                {total.saving ? (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
                    {total.saving}
                  </Badge>
                ) : null}
              </div>
              <ul className="flex flex-col divide-y divide-border/60">
                {rows.map((r, i) => (
                  <li key={i} className={cn(
                    'flex items-baseline justify-between py-3',
                    r === total && 'pt-5 mt-2 border-t-2 border-emerald-500/40 font-semibold'
                  )}>
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className="font-mono tabular-nums text-foreground">{r.after}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {costCompare.footnote ? (
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
            {costCompare.footnote}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
```

**Step 7.2 — Compose**

In `Landing.tsx`:

```tsx
{config.costCompare ? <CostCompare costCompare={config.costCompare} /> : null}
```

**Step 7.3 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing
git commit -m "feat(landing): cost compare split panel with before/after columns"
```

---

## Task 8: Multi-site dashboard mock + section

**Files:**
- Create: `src/ssr/pages/landing/components/DashboardMock.tsx`
- Create: `src/ssr/pages/landing/sections/MultiSite.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx`

**Step 8.1 — DashboardMock**

Create `src/ssr/pages/landing/components/DashboardMock.tsx`:

```tsx
import { cn } from '@ui/lib/utils';
import type { LandingMultisiteSite } from '../../Landing';
import { Icon } from './Icon';

interface DashboardMockProps {
  sites: LandingMultisiteSite[];
}

const STATUS_DOT: Record<NonNullable<LandingMultisiteSite['status']>, string> = {
  live: 'bg-emerald-500',
  draft: 'bg-amber-500',
  error: 'bg-destructive',
};

const STATUS_LABEL: Record<NonNullable<LandingMultisiteSite['status']>, string> = {
  live: 'Yayında',
  draft: 'Taslak',
  error: 'Hata',
};

/**
 * Pure CSS+SVG mock of an admin dashboard. No screenshots, no R2
 * dependency. The visual is intentionally simple: a chrome bar, a
 * site list with status dots and visit counts. Designed to look like
 * a screenshot at small size, not pretend to be one at large size.
 */
export function DashboardMock({ sites }: DashboardMockProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/40 px-4 py-2.5">
        <span className="size-3 rounded-full bg-destructive/40" aria-hidden />
        <span className="size-3 rounded-full bg-amber-400/40" aria-hidden />
        <span className="size-3 rounded-full bg-emerald-500/40" aria-hidden />
        <div className="ml-3 flex-1 text-center font-mono text-xs text-muted-foreground">
          admin.workercms.com
        </div>
      </div>

      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <Icon name="layers" className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold">Tüm siteler</span>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
          {sites.length} site
        </span>
      </div>

      {/* Site rows */}
      <ul className="divide-y divide-border/40">
        {sites.map((s, i) => {
          const status = s.status ?? 'live';
          return (
            <li
              key={i}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className={cn('size-2 rounded-full', STATUS_DOT[status])} aria-hidden />
                <span className="font-mono text-sm text-foreground">{s.name}</span>
              </div>
              <div className="flex items-center gap-4">
                {s.visits ? (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {s.visits} ziyaret
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

**Step 8.2 — MultiSite section**

Create `src/ssr/pages/landing/sections/MultiSite.tsx`:

```tsx
import { Container } from '@ui/container';
import type { LandingConfig } from '../Landing';
import { DashboardMock } from '../components/DashboardMock';
import { Icon } from '../components/Icon';

interface MultiSiteProps {
  multisite: NonNullable<LandingConfig['multisite']>;
}

export function MultiSite({ multisite }: MultiSiteProps) {
  const sites = multisite.dashboard?.sites ?? [];
  const bullets = multisite.bullets ?? [];

  return (
    <section className="border-t border-border/40 bg-muted/30 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div data-reveal="" className="reveal">
            {multisite.title ? (
              <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {multisite.title}
              </h2>
            ) : null}
            {multisite.subtitle ? (
              <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
                {multisite.subtitle}
              </p>
            ) : null}
            {bullets.length > 0 ? (
              <ul className="mt-8 flex flex-col gap-3">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {sites.length > 0 ? (
            <div
              data-reveal=""
              className="reveal"
              style={{ transitionDelay: '160ms' }}
            >
              <DashboardMock sites={sites} />
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
```

**Step 8.3 — Compose**

```tsx
{config.multisite ? <MultiSite multisite={config.multisite} /> : null}
```

**Step 8.4 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing
git commit -m "feat(landing): multi-site dashboard mock and white-label section"
```

---

## Task 9: Pricing rebuild + Testimonials + Final CTA + Footer

These three sections are visual-only re-skins of existing legacy code, so we batch them in one task.

**Files:**
- Create: `src/ssr/pages/landing/sections/Pricing.tsx`
- Create: `src/ssr/pages/landing/sections/Testimonials.tsx`
- Create: `src/ssr/pages/landing/sections/FinalCta.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx`

**Step 9.1 — Pricing**

Port the legacy `Pricing` component (current `src/ssr/pages/Landing.tsx:444-574`) into `src/ssr/pages/landing/sections/Pricing.tsx`. Changes:
- Import paths: `@ui/*` and `../components/Icon`
- Add `data-reveal=""` and `reveal` class to each card
- Replace hardcoded "Popüler" and "Kurumsal" with `labels?.pricing?.popular_badge` (default "Popüler") and the existing config-driven `name` field
- Replace icon `building` with config-driven, fall back to `building`

Full code (replace placeholders inline; preserves the existing two-mode plan/Enterprise rendering):

```tsx
import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { cn } from '@ui/lib/utils';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface PricingProps {
  pricing: NonNullable<LandingConfig['pricing']>;
  labels?: LandingConfig['labels'];
}

export function Pricing({ pricing, labels }: PricingProps) {
  const plans = pricing.plans ?? [];
  if (plans.length === 0) return null;
  const popularLabel = labels?.pricing?.popular_badge ?? 'Popüler';

  return (
    <section id="pricing" className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {pricing.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {pricing.title}
            </h2>
          ) : null}
          {pricing.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {pricing.subtitle}
            </p>
          ) : null}
        </div>

        <div className={cn(
          'mx-auto grid gap-6',
          plans.length === 1 && 'max-w-md grid-cols-1',
          plans.length === 2 && 'max-w-3xl grid-cols-1 md:grid-cols-2',
          plans.length === 3 && 'max-w-5xl grid-cols-1 md:grid-cols-3',
          plans.length >= 4 && 'max-w-6xl grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}>
          {plans.map((plan, i) => (
            <Card
              key={i}
              data-reveal=""
              className={cn(
                'reveal flex flex-col',
                plan.isEnterprise && 'border-2 border-dashed border-border/60 bg-transparent',
                plan.highlighted && !plan.isEnterprise && 'border-2 border-primary bg-primary/5 shadow-lg lg:scale-[1.03]',
                !plan.highlighted && !plan.isEnterprise && 'border-border/60'
              )}
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <CardContent className="flex flex-1 flex-col gap-4 p-8">
                {plan.isEnterprise ? (
                  <div className="inline-flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="building" className="size-7" />
                  </div>
                ) : plan.highlighted ? (
                  <Badge className="w-fit text-[10px] uppercase tracking-wider">
                    {popularLabel}
                  </Badge>
                ) : null}

                <div>
                  <h3 className="font-heading text-xl font-semibold">{plan.name}</h3>
                  {plan.desc ? (
                    <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                  ) : null}
                </div>

                {!plan.isEnterprise ? (
                  <div className="flex items-baseline gap-1">
                    {plan.currency ? (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {plan.currency}
                      </span>
                    ) : null}
                    <span className="font-heading font-mono text-5xl font-bold tracking-tight tabular-nums">
                      {plan.price ?? ''}
                    </span>
                    {plan.period ? (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    ) : null}
                  </div>
                ) : null}

                {plan.features && plan.features.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-3">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto pt-4">
                  <Button
                    asChild
                    variant={plan.isEnterprise ? 'outline' : plan.highlighted ? 'default' : 'outline'}
                    className="w-full"
                  >
                    <a href={plan.cta_url || '#'}>{plan.cta_text || (plan.isEnterprise ? 'İletişim' : 'Seç')}</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

**Step 9.2 — Testimonials**

Port from legacy `src/ssr/pages/Landing.tsx:580-617`. Add `reveal` class + stagger.

```tsx
import { Container } from '@ui/container';
import { Card, CardContent } from '@ui/card';
import type { LandingConfig } from '../Landing';
import { Icon } from '../components/Icon';

interface TestimonialsProps {
  testimonials: NonNullable<LandingConfig['testimonials']>;
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const items = testimonials.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border/40 bg-muted/30 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          {testimonials.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {testimonials.title}
            </h2>
          ) : null}
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => {
            const initial = (t.author || 'A').charAt(0).toUpperCase();
            return (
              <Card
                key={i}
                data-reveal=""
                className="reveal border-border/60"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <CardContent className="flex flex-col gap-5 p-8">
                  <Icon name="quote" className="size-7 text-primary/50" />
                  <blockquote className="text-sm italic leading-relaxed text-foreground/80">
                    {t.text}
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-sm font-semibold text-primary-foreground">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.author}</div>
                      {t.role ? (
                        <div className="text-xs text-muted-foreground">{t.role}</div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
```

**Step 9.3 — FinalCta + Footer**

```tsx
import { Container } from '@ui/container';
import { Button } from '@ui/button';
import type { LandingConfig } from '../Landing';
import { SectionTheme } from '../components/SectionTheme';
import { Icon } from '../components/Icon';

interface FinalCtaProps {
  cta: NonNullable<LandingConfig['cta']>;
  footer: NonNullable<LandingConfig['footer']>;
}

export function FinalCta({ cta, footer }: FinalCtaProps) {
  return (
    <>
      {cta.title || cta.button_text ? (
        <SectionTheme theme="dark" className="overflow-hidden py-24 sm:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
          />
          <Container size="xl" className="relative text-center">
            {cta.title ? (
              <h2 className="font-heading mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                {cta.title}
              </h2>
            ) : null}
            {cta.subtitle ? (
              <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground sm:text-lg">
                {cta.subtitle}
              </p>
            ) : null}
            {cta.button_text ? (
              <div className="mt-10">
                <Button asChild size="lg" className="group">
                  <a href={cta.button_url || '#'}>
                    {cta.button_text}
                    <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Button>
              </div>
            ) : null}
          </Container>
        </SectionTheme>
      ) : null}

      <footer className="border-t border-border/40 py-8">
        <Container size="xl">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
            {footer.text ? <div>{footer.text}</div> : <div />}
            {footer.links && footer.links.length > 0 ? (
              <div className="flex flex-wrap gap-6">
                {footer.links.map((l, i) => (
                  <a key={i} href={l.url} className="transition-colors hover:text-foreground">
                    {l.text}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </Container>
      </footer>
    </>
  );
}
```

**Step 9.4 — Compose all three**

In `src/ssr/pages/landing/Landing.tsx`, after the previous compositions, render:

```tsx
{config.pricing ? <Pricing pricing={config.pricing} labels={config.labels} /> : null}
{config.testimonials ? <Testimonials testimonials={config.testimonials} /> : null}
<FinalCta cta={config.cta ?? {}} footer={config.footer ?? {}} />
```

**Important:** at this point the legacy fallback should no longer render — strip it out. Update Landing.tsx to:

```tsx
import type { LandingConfig as LegacyLandingConfig } from '../Landing';
import { Hero } from './sections/Hero';
import { MigrationStrip } from './sections/MigrationStrip';
import { Features } from './sections/Features';
import { CostCompare } from './sections/CostCompare';
import { MultiSite } from './sections/MultiSite';
import { Pricing } from './sections/Pricing';
import { Testimonials } from './sections/Testimonials';
import { FinalCta } from './sections/FinalCta';
import { Nav } from './sections/Nav';   // added in task 10

export type LandingConfig = LegacyLandingConfig;

export interface LandingProps {
  config: LandingConfig;
}

export function Landing({ config }: LandingProps) {
  const brand = config.brand ?? {};
  const brandName = brand.name || 'WorkerCms';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased [scroll-behavior:smooth]">
      <Nav brandName={brandName} labels={config.labels} />
      <main className="flex-1">
        <Hero hero={config.hero ?? {}} brandName={brandName} />
        {config.migration ? <MigrationStrip migration={config.migration} /> : null}
        {config.features ? <Features features={config.features} /> : null}
        {config.costCompare ? <CostCompare costCompare={config.costCompare} /> : null}
        {config.multisite ? <MultiSite multisite={config.multisite} /> : null}
        {config.pricing ? <Pricing pricing={config.pricing} labels={config.labels} /> : null}
        {config.testimonials ? <Testimonials testimonials={config.testimonials} /> : null}
        {/* FAQ inserted here in task 11 */}
        <FinalCta cta={config.cta ?? {}} footer={config.footer ?? {}} />
      </main>
    </div>
  );
}
```

**Note:** `Nav` is referenced but not yet created — task 10 fills that in. Until then, comment out the `<Nav ...>` line and uncomment in task 10. Same for FAQ.

**Step 9.5 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing
git commit -m "feat(landing): pricing rebuild + testimonials + final CTA"
```

---

## Task 10: Nav rebuild

**Files:**
- Create: `src/ssr/pages/landing/sections/Nav.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx` (uncomment Nav)

**Step 10.1 — Nav**

Port the legacy Nav (current `src/ssr/pages/Landing.tsx:214-298`) into `src/ssr/pages/landing/sections/Nav.tsx`. Changes:
- Pull link text from `labels?.nav` with TR fallbacks
- Replace single-letter brand square with rendered text wordmark (no animation in nav — `font-heading` static)
- Add `#faq` to nav menu

```tsx
import { Container } from '@ui/container';
import { Button } from '@ui/button';
import type { LandingConfig } from '../Landing';

interface NavProps {
  brandName: string;
  labels?: LandingConfig['labels'];
}

export function Nav({ brandName, labels }: NavProps) {
  const nav = labels?.nav ?? {};
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container size="xl" className="flex h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-heading font-semibold tracking-tight text-foreground">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            {brandName.charAt(0).toUpperCase() || 'W'}
          </span>
          <span className="text-lg">{brandName}</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          <a href="#features" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.features ?? 'Özellikler'}
          </a>
          <a href="#pricing" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.pricing ?? 'Fiyatlar'}
          </a>
          <a href="#faq" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.faq ?? 'SSS'}
          </a>
          <a href="/admin/login" className="rounded-md px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground">
            {nav.login ?? 'Giriş'}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <span data-island="theme-toggle" className="contents">
            {/* Same SSR placeholder as legacy — preserves no-flash hydration */}
            <button
              type="button"
              aria-label="Toggle theme"
              className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 dark:hidden" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden size-4 dark:inline" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
          </span>
          <Button asChild size="sm">
            <a href="/admin/register">{nav.cta ?? 'Sitemi Taşı'}</a>
          </Button>
        </div>
      </Container>
    </header>
  );
}
```

**Step 10.2 — Uncomment Nav in Landing.tsx**

Activate the `<Nav brandName={brandName} labels={config.labels} />` line.

**Step 10.3 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing
git commit -m "feat(landing): config-driven nav with FAQ link and CTA label"
```

---

## Task 11: Native FAQ section

**Files:**
- Create: `src/ssr/pages/landing/sections/Faq.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx`
- Modify: `public-styles/input.css` (FAQ-specific transition CSS)

**Step 11.1 — FAQ CSS**

Append to `public-styles/input.css` inside `@layer utilities`:

```css
/* Native <details> animated open. The grid trick avoids
   max-height-with-magic-number; content height is intrinsic. */
.faq-item > .faq-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
.faq-item > .faq-body > div {
  overflow: hidden;
}
.faq-item[open] > .faq-body {
  grid-template-rows: 1fr;
}
.faq-marker {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.faq-item[open] .faq-marker {
  transform: rotate(45deg);
}
@media (prefers-reduced-motion: reduce) {
  .faq-item > .faq-body { transition: none; }
  .faq-marker { transition: none; }
}
```

**Step 11.2 — Faq component**

Create `src/ssr/pages/landing/sections/Faq.tsx`:

```tsx
import { Container } from '@ui/container';
import type { LandingConfig } from '../Landing';

interface FaqProps {
  faq: NonNullable<LandingConfig['faq']>;
}

export function Faq({ faq }: FaqProps) {
  const items = faq.items ?? [];
  if (items.length === 0) return null;

  return (
    <section id="faq" className="border-t border-border/40 py-24 sm:py-28">
      <Container size="xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          {faq.title ? (
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {faq.title}
            </h2>
          ) : null}
          {faq.subtitle ? (
            <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
              {faq.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-border/60">
          {items.map((item, i) => (
            <details
              key={i}
              className="faq-item group py-5"
              open={i === 0 ? true : undefined}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span
                  className="faq-marker mt-1 inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="faq-body">
                <div>
                  <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

**Step 11.3 — Compose**

In Landing.tsx, between Testimonials and FinalCta:

```tsx
{config.faq ? <Faq faq={config.faq} /> : null}
```

**Step 11.4 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
```

```bash
git add src/ssr/pages/landing public-styles/input.css
git commit -m "feat(landing): native FAQ accordion with animated open"
```

---

## Task 12: Client-side hydration — wordmark, scroll reveal, lenis

**Files:**
- Create: `src/client/landing/ScrollReveal.tsx`
- Create: `src/client/landing/lenis.ts`
- Modify: `src/client/landing-entry.tsx` — wire all three islands
- Modify: `package.json` — add `framer-motion` and `lenis` dependencies

**Step 12.1 — Add dependencies**

```bash
npm install framer-motion@^11 lenis@^1.0.0
```

Verify nothing else got added by checking `package.json`. Both packages should be in `dependencies`. If `npm install` complains about peer deps, retry with `--legacy-peer-deps` (the project already uses this flag in `admin/`).

**Step 12.2 — ScrollReveal hook + component**

Create `src/client/landing/ScrollReveal.tsx`:

```tsx
/**
 * Scrollreveal observer. Walks every [data-reveal] element on the
 * page and adds `is-visible` when it crosses the viewport. The hook
 * runs once on mount; elements are revealed exactly once each.
 *
 * Reduced-motion users skip the observer entirely — the CSS at
 * @media level forces .reveal to its visible state, so the static
 * SSR markup is fully visible without any class change.
 */
export function attachScrollReveal(): () => void {
  if (typeof window === 'undefined') return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return () => {};

  const targets = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]')
  );
  if (targets.length === 0) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -15% 0px', threshold: 0.05 }
  );

  for (const t of targets) observer.observe(t);

  return () => observer.disconnect();
}
```

**Step 12.3 — Lenis init**

Create `src/client/landing/lenis.ts`:

```ts
import Lenis from 'lenis';

/**
 * Lenis smooth scroll. Disabled when the user prefers reduced motion.
 * Native scroll-behavior: smooth in CSS still handles anchor jumps
 * for those users.
 */
export function initLenis(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const lenis = new Lenis({
    duration: 1.0,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
  });

  let frame = 0;
  const tick = (time: number) => {
    lenis.raf(time);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    lenis.destroy();
  };
}
```

**Step 12.4 — Update landing-entry**

Replace `src/client/landing-entry.tsx`:

```tsx
import { createElement, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { ThemeToggle } from '../ssr/islands/ThemeToggle';
import { MotionRoot } from './landing/motion';
import { Wordmark } from './landing/Wordmark';
import { attachScrollReveal } from './landing/ScrollReveal';
import { initLenis } from './landing/lenis';

function hydrateThemeToggle() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-island="theme-toggle"]')) {
    try {
      hydrateRoot(el, createElement(ThemeToggle));
    } catch (err) {
      console.error('[landing] theme-toggle hydration failed', err);
    }
  }
}

function hydrateWordmark() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-island="wordmark"]')) {
    const text = el.getAttribute('aria-label') ?? '';
    if (!text) continue;
    try {
      hydrateRoot(
        el,
        createElement(StrictMode, null,
          createElement(MotionRoot, null,
            createElement(Wordmark, { text })
          )
        )
      );
    } catch (err) {
      console.error('[landing] wordmark hydration failed', err);
    }
  }
}

function boot() {
  hydrateThemeToggle();
  hydrateWordmark();
  attachScrollReveal();
  initLenis();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
```

**Step 12.5 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets   # observe landing-client gzip in output
npx wrangler deploy --dry-run   # check worker gzip ≤850 KB
```

If gzip exceeds 850 KB, the fallback is to skip lenis (delete the `initLenis()` call and the file, drop the dependency). Re-run `wrangler deploy --dry-run` to verify.

```bash
git add src/client/landing src/client/landing-entry.tsx package.json package-lock.json
git commit -m "feat(landing): framer wordmark + scroll reveal + lenis client islands"
```

---

## Task 13: Cleanup — delete old Landing.tsx and finalise route

**Files:**
- Delete: `src/ssr/pages/Landing.tsx`
- Modify: `src/ssr/pages/landing/Landing.tsx` — own the LandingConfig type
- Modify: `src/routes/public/landing.ts` — already imports from new path

**Step 13.1 — Move type ownership**

Copy the entire `LandingConfig` type chain (and the related interfaces: `LandingStats`, `LandingFeatureItem`, etc.) from `src/ssr/pages/Landing.tsx` into `src/ssr/pages/landing/Landing.tsx` as the canonical definitions. Remove the `import type` from the legacy module.

**Step 13.2 — Delete legacy file**

```bash
rm src/ssr/pages/Landing.tsx
```

**Step 13.3 — Search for any remaining imports**

```bash
grep -r "from.*ssr/pages/Landing'" src/ admin/src/ packages/ 2>/dev/null
```

Expected: no results. If any are found, update them to `from '...ssr/pages/landing/Landing'`.

**Step 13.4 — Verify and commit**

```bash
npx tsc --noEmit
npm run build:assets
cd admin && npm run build && cd ..
npx wrangler deploy --dry-run
```

```bash
git add src/ssr/pages/landing/Landing.tsx src/ssr/pages/Landing.tsx
git commit -m "chore(landing): remove legacy Landing.tsx, new entry owns the type"
```

---

## Task 14: Verification matrix and PR write-up

**Files:**
- Create: `docs/plans/2026-05-05-landing-redesign-verification.md`

**Step 14.1 — Run the full verification matrix**

```bash
npx tsc --noEmit                       # ≤19 errors
npm run build:assets                   # clean
cd admin && npm run build && cd ..     # clean
npx wrangler deploy --dry-run          # gzip line
```

**Step 14.2 — Local Lighthouse + reduced-motion check**

```bash
npm run dev
# In Chrome:
#  1. Open http://localhost:8787/landing
#  2. Lighthouse tab → Mobile, Performance + Accessibility, Generate
#  3. Note Performance and Accessibility scores
#  4. DevTools → Rendering → Emulate "Reduced motion: reduced"
#  5. Reload and confirm wordmark is static, no scroll-reveal animation,
#     details accordion opens instantly
#  6. Test breakpoints 375 / 768 / 1024 / 1440 — DevTools device toolbar
```

Capture screenshots for each breakpoint into `/tmp/landing-shots/` (or local Desktop). These go into the PR body.

**Step 14.3 — Write verification report**

Create `docs/plans/2026-05-05-landing-redesign-verification.md`:

```markdown
# Landing Redesign — Verification Report

Date: 2026-05-05
Branch: feature/landing-redesign

## Bundle sizes

| Metric | Before | After | Delta | Cap |
|--------|--------|-------|-------|-----|
| Worker gzip | 500 KB | <fill> | +<fill> | 850 KB |
| landing-client gzip | 3 KB | <fill> | +<fill> | 80 KB |
| Tailwind CSS | 71 KB | <fill> | +<fill> | 95 KB |

(Read these numbers from `wrangler deploy --dry-run` output and
`npm run build:assets` reports — fill in actual values.)

## TypeScript
- `npx tsc --noEmit`: <fill> errors (baseline 19, must be ≤19)

## Lighthouse (mobile, wrangler dev)
- Performance: <fill>
- Accessibility: <fill>
- Best Practices: <fill>
- SEO: <fill>

## Manual checks

- [ ] All breakpoints (375, 768, 1024, 1440) render without overflow
- [ ] Wordmark animates on first hero view, only once
- [ ] Scroll reveal triggers once per element, not on re-scroll
- [ ] FAQ first item open by default, others collapsed
- [ ] FAQ open animation is smooth, reduced-motion is instant
- [ ] Lenis smooth scroll active, reduced-motion uses native scroll
- [ ] Theme toggle still hydrates and persists
- [ ] Hero stays dark in both root themes (light + dark)
- [ ] Cost compare saving badge contrast WCAG AA
- [ ] All CTAs reachable via Tab in DOM order
- [ ] No console errors, no hydration warnings
```

**Step 14.4 — Commit**

```bash
git add docs/plans/2026-05-05-landing-redesign-verification.md
git commit -m "docs(landing): verification report — Lighthouse, bundle sizes, breakpoints"
```

**Step 14.5 — Push branch and open PR**

```bash
git push -u origin feature/landing-redesign
gh pr create --title "Landing redesign — agency + WP migration narrative" --body "$(cat <<'EOF'
## Summary
- Replaces the 716-line monolithic Landing.tsx with a 9-section composition driven by `src/ssr/pages/landing/`
- Hybrid theme: dark cinematic hero in both root themes, light Soft UI body
- Animated wordmark (Space Grotesk) + LazyMotion framer-motion + lenis smooth scroll, all reduced-motion-aware
- LandingConfig schema additions are non-breaking (labels, migration, costCompare, multisite, faq) — existing admin configs render with new sections as no-ops
- Seed rewritten with WP migration + agency multi-site narrative (5 customer sites, %63 cost savings)
- Native `<details>` FAQ, zero JS overhead

## Reference docs
- Brief: `docs/prompts/landing-redesign.md`
- Design doc: `docs/plans/2026-05-05-landing-redesign-design.md`
- Design system master: `docs/design/design-system/workercms/MASTER.md`
- Verification: `docs/plans/2026-05-05-landing-redesign-verification.md`

## Bundle diff
See verification report.

## Screenshots
| Breakpoint | Light | Dark |
|------------|-------|------|
| 375        |       |      |
| 768        |       |      |
| 1024       |       |      |
| 1440       |       |      |

(Replace with actual screenshots before merging.)

## Test plan
- [ ] tsc clean (≤19 baseline)
- [ ] All breakpoints render
- [ ] Reduced-motion behaviour verified
- [ ] Lighthouse ≥90 perf / ≥95 a11y on mobile
- [ ] Worker gzip ≤850 KB
- [ ] Admin SPA still builds clean
EOF
)"
```

---

## Risk register and rollback plan

Same as the design doc §8. Key triggers and responses:

- **Bundle exceeds 850 KB at task 12** — drop `lenis`, re-measure; if still over, drop `framer-motion` and use CSS-only stagger (the SSR markup already has `[data-reveal]` so no rewrite needed; just delete `Wordmark.tsx` and the imports).
- **Hydration warnings** — confirm SSR markup matches client final state exactly. Most likely culprits: text whitespace differences in wordmark, missing `aria-label` on the wordmark span.
- **Admin build breaks** — neither admin nor packages/ui is touched by this plan. If it does break, the cause is almost certainly a tsconfig path collision; check `paths` and `include` arrays.
- **Old admin config breaks** — every new section guards missing fields; old configs render correctly with sections as no-ops.

## Out of scope

- AMP routes, RSS feed, sitemap (Hono JSX, untouched per CLAUDE.md)
- Production deploy (`npm run deploy`) — user-driven, never automated
- Admin SPA UI changes
- Theme engine (`packages/ui/themes/*`)
