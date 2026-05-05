# Landing Redesign — Prompt

Goal: workercms.com landing sayfasını sıfırdan, profesyonel ve animasyonlu
biçimde yeniden tasarla ve implemente et. Hedef referans: Linear / Stripe /
Vercel / Cal.com seviyesinde polished bir SaaS landing.

═══════════════════════════════════════════════════════════════════════════
BAĞLAM
═══════════════════════════════════════════════════════════════════════════

Repo: C:\Users\Administrator\CLAUDECODE\worker-cms-react
Bu repo production'a ship oluyor (workercms.com + girisadresi). CLAUDE.md'yi
ilk iş olarak oku — kuralları (kill-switch, AMP korunur, JSX pragma kuralı,
Faz tablosu) orada.

Mevcut landing:
  - Bileşen:   src/ssr/pages/Landing.tsx           (716 satır, shadcn + Tailwind)
  - Route:     src/routes/public/landing.ts        (config'i DB'den yükler)
  - Client:    src/client/landing-entry.tsx        (sadece ThemeToggle hydrate)
  - Config:    DB'deki global_settings.landing_config (JSON, admin'den editlenir)
                Şu anki LandingConfig şemasını OKU ve yeni tasarımda KORU.
                Admin'in mevcut JSON editor'ünü bozmak yok.

Stack kısıtlamaları (HARD):
  - Cloudflare Worker, gzip bundle ≤ 1 MB. Şu anki: ~500 KB gzip.
                Yeni eklenenler (animasyon kütüphanesi vs.) bu limitin altında
                kalmalı. Ölçmeden "ekledim" deme.
  - React 19 SSR (server-render), client-side sadece hydration.
                Her şey JS olmadan da görünmeli (no-JS fallback).
  - Tailwind 3 + shadcn primitives (packages/ui/). Yeni component eklerken
                önce packages/ui/ içine bak; varsa onu kullan.
  - JSX pragma kuralı: React .tsx için pragmaya gerek yok (default).
                Hono JSX dosyalarına dokunma (AMP/feed/sitemap).
  - i18n yok ama Türkçe content desteği lazım — landing config'i Türkçe ya da
                İngilizce olabilir, render layer agnostik olsun.
  - shadcn/ui MCP varsa component arama için kullanabilirsin.

Erişilebilirlik (WCAG AA — non-negotiable):
  - Tüm metin/arkaplan ≥ 4.5:1 (büyük metin 3:1)
  - prefers-reduced-motion'a tam uy: animasyonları kapat ya da çok kısalt
  - Klavye navigasyonu çalışmalı, focus ringleri görünür
  - Icon-only butonlarda aria-label
  - Heading sıralaması h1→h6 atlamalı değil

Animasyon kütüphane tercihim (önerim, ama gerekçeli sap):
  - framer-motion (~30 KB gzip) — micro-interaction + scroll reveal
  - @studio-freight/lenis (~5 KB gzip) — smooth scroll
  - GSAP YOK (büyük + lisans). Üç.js / WebGL YOK (overkill).
  - View Transitions API'yi nereye değerse fırsat olarak kullan.

═══════════════════════════════════════════════════════════════════════════
İŞ AKIŞI — BU SIRAYLA
═══════════════════════════════════════════════════════════════════════════

ADIM 0 — Skill'leri ÇAĞIR (üzerinde düşünme, çağır):
  1. superpowers:brainstorming  → benimle yön/kapsam üzerinde anlaş
  2. ui-ux-pro-max               → design system üret
  3. superpowers:writing-plans   → docs/plans/ altına plan yaz
  4. frontend-design              → implementation sırasında stilistik kararlar
  5. superpowers:verification-before-completion → bitirmeden önce kanıt topla

ADIM 1 — Brainstorming (zorunlu):
  Bana şu soruları sor (cevaplamadan implementation'a geçme):
   • Landing'in ana hedefi nedir? (signup / demo iste / GitHub'a yönlendir / sat)
   • Hedef kitle: developer mı, content team mi, agency owner mı?
   • Hangi 3-5 özellik öne çıkacak?
   • Ton: technical & sober (Linear), playful (Vercel'in eski tarzı),
           premium-minimal (Apple), bold-energetic (Vercel yeni)?
   • Logo/wordmark var mı? Renk kodu zorlaması var mı?
   • Sayfa uzunluğu: kısa (4 section) / orta (6-7) / uzun (10+)?
   • Görsel: gerçek ürün screenshot'ı mı, illustrasyon mu, abstract mı?
   • Türkçe mi İngilizce mi? Hem mi?

ADIM 2 — Design system (ui-ux-pro-max):
  Brainstorming çıktısına göre şu komutu çalıştır:

      python ~/.claude/skills/ui-ux-pro-max/scripts/search.py \
        "<keywords brainstorming'den>" \
        --design-system --persist -p "WorkerCMS" \
        --output-dir docs/design

  Bu, docs/design/design-system/MASTER.md üretecek. Bunu git'e commit et
  (ayrı commit: "docs(design): generate landing design system via ui-ux-pro-max").
  Master'ı oku ve sonraki adımlarda referans olarak kullan.

  Gerekirse alt-domain aramaları da yap:
   • --domain landing  "<keywords>"   → section yapısı
   • --domain ux       "animation reduced-motion"
   • --domain typography "<mood>"     → font önerisi
   • --domain color    "saas <mood>"  → palet alternatifi

ADIM 3 — Plan yaz (writing-plans):
  docs/plans/<bugün>-landing-redesign.md altına detaylı plan:
   • Section listesi (hero, social proof, features, how-it-works, pricing
     teaser, testimonials, FAQ, final CTA, footer — hangi section, neden)
   • Her section için: layout, animasyon davranışı, mobile düşeni
   • LandingConfig şemasında değişiklik yapılacaksa migration notu
   • Yeni dependency listesi + her birinin gzip impact tahmini
   • Risk listesi + rollback stratejisi
  Kullanıcıdan plan onayı bekle, sonra implement et.

ADIM 4 — Implementation:
  - Mevcut Landing.tsx'i SİL ve sıfırdan yaz.
  - LandingConfig tip güncellenirse src/db/seed.sql'deki default config
    da güncellenmeli (yeni alanlar için sane defaults).
  - Section'lar ayrı dosyalara: src/ssr/pages/landing/{Hero,Features,...}.tsx
    Landing.tsx onları compose etsin.
  - Client hydration: src/client/landing-entry.tsx'i genişlet
    (ThemeToggle + scroll reveal observer + Lenis init + nav scroll-blur).
    "use client" semantiği: tüm framer-motion sadece client tarafında bu
    entry'den mount edilsin; SSR'de plain markup gitsin.
  - Görüntü: Cloudflare Worker'da R2 üstünden geliyor (cms-media-v2). Yeni
    asset eklemen gerekirse user'a sor — mevcut media'yı veya CSS gradient
    + SVG illustration tercih et.
  - Dark mode: .dark class via packages/ui/tokens/design-tokens.css.
    Yeni renk eklenecekse oradan ekle, raw hex YAZMA.

ADIM 5 — Animasyon kuralları (ui-ux-pro-max'ten):
  - Süre 150-300ms micro / ≤400ms complex
  - Sadece transform + opacity (width/height/top/left animasyonu YOK)
  - Ease-out giriş, ease-in çıkış
  - Stagger 30-50ms list/grid
  - Scale 0.95-1.05 press feedback
  - Exit animasyonu girişin %60-70'i
  - prefers-reduced-motion → tüm animasyon kapalı (CSS @media + framer
    useReducedMotion hook ikisi de)
  - Hero'da en fazla 2 element animate (over-motion'dan kaçın)
  - Scroll reveal: IntersectionObserver, bir kere tetiklensin, viewport'a
    %15 girince başlasın

ADIM 6 — Doğrulama (verification-before-completion):
  Şunları çalıştır ve çıktılarını rapora yaz:

      npm run build:assets
      npx tsc --noEmit                     # baseline 19 hata, artmamalı
      cd admin && npm run build && cd ..   # admin build sağlam mı
      npx wrangler deploy --dry-run        # gzip boyut?

  Hedefler:
   • Worker gzip ≤ 850 KB (500 + ~200 max yeni eklenti)
   • tsc hata sayısı ≤ baseline (19)
   • Tailwind CSS bundle artışı ≤ 30 KB
   • publisher-client bundle artışı ≤ 80 KB
   • Lighthouse Performance ≥ 90 (mobile), Accessibility ≥ 95 (yerel
     wrangler dev'de manuel kontrol et)

  Bütçeyi aşarsan dur ve bana söyle, kütüphane downgrade'i tartışalım.

ADIM 7 — Git akışı:
  - `master`'a doğrudan commit YOK. Yeni branch:
        git checkout -b feature/landing-redesign
  - Mantıklı atomic commit'ler:
      docs(design): generate landing design system
      feat(landing): scaffold new section components
      feat(landing): hero with framer-motion + lenis
      feat(landing): features grid with scroll reveal
      ...
      chore(landing): remove old Landing.tsx
  - Her commit kendi başına tsc temiz, build temiz olmalı.
  - Bitince `gh pr create` ile PR aç, body'de:
      • Önce/sonra screenshot (yerel wrangler dev'den)
      • Bundle size diff
      • Animation demo notları
      • Test edilen breakpointler (375, 768, 1024, 1440)
      • Reduced-motion davranışı

═══════════════════════════════════════════════════════════════════════════
KIRMIZI ÇİZGİLER
═══════════════════════════════════════════════════════════════════════════

YOK:
  • AMP'a, RSS feed'e, sitemap'e dokunma (Hono JSX, korunur)
  • src/index.ts'in kill-switch route'una dokunma
  • Production'a doğrudan deploy (`npm run deploy`) ÇALIŞTIRMA. Sadece
    `wrangler deploy --dry-run` ile boyut kontrol et. Deploy'u ben yaparım.
  • LandingConfig schema'sını breaking değiştirme — ekleme yap, alan
    silmeyi konuş.
  • GSAP, Three.js, lottie-react, ScrollMagic kurma. Önce sor.
  • Mevcut admin build'i bozma. cd admin && npm run build temiz dönmeli.
  • Çevirisi olmayan İngilizce metni doğrudan kod içine GÖMME — landing
    config JSON'ından gelmeli ki admin editlenebilsin.

═══════════════════════════════════════════════════════════════════════════
BAŞLA
═══════════════════════════════════════════════════════════════════════════

1) CLAUDE.md'yi oku.
2) Mevcut Landing.tsx, landing.ts route, LandingConfig şemasını oku.
3) superpowers:brainstorming skill'ini çağır ve yukarıdaki soruları sor.
4) Cevaplarımı bekle. Implementation'a benden onay almadan geçme.
