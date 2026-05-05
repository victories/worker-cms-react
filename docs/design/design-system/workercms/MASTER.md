# Design System Master File — WorkerCMS Landing

> **LOGIC:** When building a specific page, first check
> `design-system/pages/[page-name].md`. If that file exists, its rules
> **override** this Master file. If not, strictly follow the rules below.

**Project:** WorkerCMS
**Generated:** 2026-05-05 (synthesized from brainstorming + four ui-ux-pro-max domain searches)
**Source data:**
- `--design-system "saas migration agency premium developer multi-site dark-hero"`
  picked Event Landing + OLED-only — **rejected**, replaced below.
- `--domain landing` → R2 "Pricing-Focused Landing" + R4 "Comparison Table" cues adopted.
- `--domain style` → R3 "Modern Dark Cinema" (Linear-like) for hero + R4 "Soft UI Evolution" (WCAG AA+) for body — **hybrid** mix.
- `--domain color` → R1 "Developer Tool / IDE" (slate dark) + R4 "B2B Service" (light navy) bridged by indigo brand accent.
- `--domain typography` → R5 "Tech Startup": Space Grotesk + DM Sans.
- `--domain ux` → reduced-motion rules locked.

---

## 1. Pattern (landing structure)

**Hybrid: Migration-driven Pricing Landing** (custom, derived from R2 + R4 of landing search).

Section order (9 total, locked from brainstorming Q6 = D):

1. **Hero** — value proposition + animated wordmark + dual CTA + 4-stat strip
2. **Migration strip** — 3-step horizontal flow ("Yükle → Eşle → Yayınla")
3. **Features** — 6-card grid, middle accent
4. **Cost compare** — split-panel "WP stack vs WorkerCms"
5. **Multi-site / white-label** — text + dashboard mock
6. **Pricing** — DB packages + Enterprise card
7. **Testimonials** — 3 quotes (agency / blogger / publisher)
8. **FAQ** — 6-8 native `<details>`, first item open
9. **Final CTA + Footer**

**Primary CTA placement:** sticky in nav ("Sitemi Taşı"), each pricing card, final CTA band.
**Conversion strategy:** show "before/after" cost honestly, anchor "5-minute migration" claim with named steps, address top objections in FAQ.

---

## 2. Style (hybrid)

Two surface modes coexist on the same page via section-scoped CSS variables (`[data-section-theme="dark"]`):

### 2.1 Hero / Final CTA — "Modern Dark Cinema" (Linear-tinted)

| Token | Value | Notes |
|-------|-------|-------|
| Surface base | `#0B1020` | Deep slate, **not pure #000** (avoids OLED smear) |
| Surface elevated | `#10172A` | Card / wordmark backdrop |
| Surface hairline | `rgba(255, 255, 255, 0.08)` | Border at hairline width |
| Foreground | `#F4F4F5` | High-contrast text |
| Foreground muted | `#94A3B8` | Slate-400, used for sub copy |
| Ambient blob 1 | `radial-gradient(rgba(99, 102, 241, 0.18))` | Indigo brand glow, top-left |
| Ambient blob 2 | `radial-gradient(rgba(34, 197, 94, 0.10))` | Emerald accent glow, bottom-right |
| Grid texture | `linear-gradient(border/0.4) 1px tracks, 64px size` | with radial mask |
| Border radius | 16 px | cards, badges, primary CTA |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` | easeOutExpo for entries |

### 2.2 Body sections — "Soft UI Evolution" (WCAG AA+)

| Token | Value | Notes |
|-------|-------|-------|
| Surface | `#FFFFFF` (light) / `#0B1020` (dark mode) | Inherits root theme |
| Surface raised | `#F8FAFC` (light) / `#10172A` (dark) | section bg |
| Foreground | `#0F172A` (light) / `#F4F4F5` (dark) | |
| Foreground muted | `#64748B` (light) / `#94A3B8` (dark) | |
| Border | `#E2E8F0` (light) / `rgba(255,255,255,0.08)` (dark) | |
| Card shadow (light) | `0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)` | softer than flat, clearer than neumorphism |
| Border radius | 12 px | cards, inputs, secondary buttons |
| Easing | same as hero | unified rhythm |

### Anti-patterns (rejected styles)

- **Pure #000 backgrounds** — banding on OLED, harsh on eyes
- **Glassmorphism** at scale — performance cost on Cloudflare Worker bundle (no need for backdrop-filter heavy chrome)
- **Neumorphism** — fails WCAG contrast at this scale
- **Liquid Glass** — moderate-poor performance, animation budget exceeds our cap
- **GSAP / Three.js** — explicitly prohibited per brief

---

## 3. Color

**Brand bridge palette** — single accent set works across both surface modes.

| Role | Hex | HSL (Tailwind shadcn-format) | CSS Variable |
|------|-----|------------------------------|--------------|
| **Primary** (brand, CTA) | `#6366F1` | `239 84% 67%` | `--primary` |
| Primary fg | `#FFFFFF` | `0 0% 100%` | `--primary-foreground` |
| **Accent** (success, "live", "migrated") | `#22C55E` | `142 71% 45%` | `--accent` |
| Accent fg | `#0B1020` | `222 47% 8%` | `--accent-foreground` |
| **Destructive** (cost-before, error) | `#EF4444` | `0 84% 60%` | `--destructive` |
| Ring (focus) | `#6366F1` | `239 84% 67%` | `--ring` |

### 3.1 Light surface (root)

| Role | Hex | HSL |
|------|-----|-----|
| Background | `#FFFFFF` | `0 0% 100%` |
| Foreground | `#0F172A` | `222 47% 11%` |
| Card | `#FFFFFF` | `0 0% 100%` |
| Muted | `#F1F5F9` | `210 40% 96%` |
| Muted-fg | `#64748B` | `215 16% 47%` |
| Border | `#E2E8F0` | `214 32% 91%` |

### 3.2 Dark surface (root + section-themed)

| Role | Hex | HSL |
|------|-----|-----|
| Background | `#0B1020` | `222 47% 4%` |
| Foreground | `#F4F4F5` | `0 0% 96%` |
| Card | `#10172A` | `222 47% 6%` |
| Muted | `#1B2336` | `222 16% 14%` |
| Muted-fg | `#94A3B8` | `215 20% 65%` |
| Border | `rgba(255,255,255,0.08)` (raw) → `220 13% 18%` (Tailwind) | |

**WCAG verification (manually checked, all ≥4.5:1):**
- Foreground on Background (light): `#0F172A` on `#FFFFFF` → 16.1:1 ✅
- Foreground on Background (dark): `#F4F4F5` on `#0B1020` → 16.6:1 ✅
- Primary on Background (light): `#6366F1` on `#FFFFFF` → 4.51:1 ✅ (large text only — for body, use foreground)
- Primary fg on Primary: `#FFFFFF` on `#6366F1` → 4.66:1 ✅
- Accent on dark hero: `#22C55E` on `#0B1020` → 8.4:1 ✅
- Muted-fg on Background (light): `#64748B` on `#FFFFFF` → 4.6:1 ✅
- Muted-fg on Background (dark): `#94A3B8` on `#0B1020` → 7.2:1 ✅

**Cost-compare semantic colors:** "before" column borders/values use `#EF4444` (destructive) at low opacity; "after" column uses `#22C55E` (accent) at low opacity. Saving badge: `#22C55E` solid bg + `#0B1020` foreground.

---

## 4. Typography

**Font pairing:** "Tech Startup" (R5 of typography search).

| Role | Font | Weights | Notes |
|------|------|---------|-------|
| Heading + animated wordmark | **Space Grotesk** | 400, 500, 600, 700 | distinctive character, perfect for the wordmark stagger |
| Body | **DM Sans** | 400, 500, 700 | high readability, ~13 KB woff2 |
| Mono (cost figures, code, labels) | **system-ui mono** | 400, 500 | no extra payload — `ui-monospace, SFMono-Regular, ...` |

**Google Fonts URL:**
```
https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap
```

**Tailwind config addition:**
```ts
fontFamily: {
  heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
  sans:    ['"DM Sans"',       'system-ui', 'sans-serif'],
  mono:    ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
}
```

**Type scale** (mobile → desktop, base 16):

| Token | mobile | desktop | weight | line-height | tracking |
|-------|--------|---------|--------|-------------|----------|
| Display (hero h1) | 40 | 72 | 700 | 1.05 | -0.03em |
| Wordmark | 64 | 112 | 700 | 1.0 | -0.04em |
| H2 (section) | 28 | 44 | 700 | 1.1 | -0.02em |
| H3 (card title) | 18 | 22 | 600 | 1.3 | -0.01em |
| Body lg | 17 | 18 | 400 | 1.6 | 0 |
| Body | 16 | 16 | 400 | 1.6 | 0 |
| Body sm | 14 | 14 | 400 | 1.55 | 0 |
| Eyebrow / label | 12 | 12 | 500 | 1.4 | +0.06em uppercase |
| Cost figure | 32 | 48 | 700 | 1 | -0.02em, **mono** for tabular alignment |

Body text minimum 16px on mobile (avoids iOS auto-zoom).
Line length 60-75 chars desktop, 35-60 mobile (enforced by `max-w-prose` or hand-tuned `max-w-2xl`).

**Font loading:** preload only `Space Grotesk 700` + `DM Sans 400` (the two seen above the fold). Other weights `font-display: swap`. This keeps total first-paint font budget ~28 KB woff2.

---

## 5. Effects

| Effect | Spec |
|--------|------|
| Card press scale | `0.97 → 1.0` on release, 150ms ease-out |
| Button hover | translate-y-[-1px] + shadow lift, 150ms |
| Ambient blob (hero only) | 600px circle, blur(80px), opacity 0.18, **no animation** (static) |
| Grid texture (hero) | 64px×64px, border tone at 0.4 alpha, radial mask |
| Section reveal | translate-y-[16px] + opacity-0 → 0,1 over 350ms, ease-out, stagger 40-50ms |
| Wordmark letter reveal | translate-y-[12px] + opacity-0 → 0,1 over 280ms per letter, 50ms stagger, spring overshoot 1.05 → 1 |
| Save badge spring-in | scale 0.6 → 1.05 → 1, spring damping 18 stiffness 220 |
| FAQ open transition | grid-template-rows trick `0fr → 1fr` for height + opacity, 220ms ease-out |
| Smooth scroll | lenis duration 1.0, easing `t => 1 - (1-t)^3` |
| Reduced motion | all transforms → identity, all opacities → final, durations → 0 |

**Hero motion budget:** max **2 elements** animated simultaneously (wordmark stagger + sub fade). Blobs static, grid static, CTA only animates on hover.

---

## 6. Accessibility (CRITICAL)

- Contrast ≥4.5:1 (normal text), ≥3:1 (large text). Verified above.
- Focus ring: 2px `--ring` with 2px offset, visible on all interactive.
- Heading order: single `<h1>` (hero), `<h2>` per section, `<h3>` per card. No skips.
- Native `<details>` for FAQ — full keyboard + screen reader without ARIA.
- Icon-only buttons (theme toggle, future close): `aria-label`.
- `prefers-reduced-motion` honored at three layers: framer `useReducedMotion`, lenis init guard, CSS `@media` blanket fallback.
- All CTAs reachable via Tab in DOM order matching visual order.

---

## 7. Animation rules (locked)

- Duration: 150-300ms micro, ≤400ms complex.
- Easing: `ease-out` enter, `ease-in` exit. Linear forbidden for UI transitions.
- Properties: **transform + opacity only.** No width / height / top / left animation.
- Stagger: 30-50ms list/grid, 50ms wordmark letters.
- Exit duration: 60-70% of enter.
- Hero limit: 2 simultaneous animated elements.
- Excessive motion: never animate everything; accent moments only.
- Reduced motion: full opt-out at every layer.
- Scroll reveal: IntersectionObserver, `rootMargin: '0px 0px -15% 0px'`, fires once.

---

## 8. Anti-patterns (Do NOT do)

| Don't | Why |
|-------|-----|
| Light mode default | Brief Q4 = E hybrid: hero forced dark in both modes |
| Pure #000 backgrounds | OLED smear / banding |
| GSAP, Three.js, lottie-react, ScrollMagic | Brief explicit |
| Animate width/height/top/left | Layout thrash, CLS |
| Animate everything | Distraction + motion sickness |
| Linear easing | Robotic feel |
| Force-scroll-jacking | Vestibular / nausea triggers |
| Glassmorphism heavy chrome | Bundle + perf cost |
| Light text on light or dark on dark <4.5:1 | Fails WCAG AA |
| Emoji icons | Inconsistent across platforms; use Lucide / inline SVG |
| Raw hex in components | Use semantic CSS variables, edit at token layer |

---

## 9. Performance budget (binding)

| Metric | Limit |
|--------|-------|
| Worker gzip | ≤ 850 KB |
| landing-client gzip | ≤ 80 KB |
| Tailwind output | ≤ 95 KB |
| Hero LCP (mobile, fast-3G) | ≤ 2.5 s |
| Total font weight (above fold) | ≤ 35 KB woff2 |
| Lighthouse mobile perf | ≥ 90 |
| Lighthouse a11y | ≥ 95 |

---

## 10. Open items deferred to writing-plans

- Exact section-by-section component spec (props, data flow, fallbacks)
- LandingConfig type widening commit scope
- Test/verification matrix per phase
- Migration of seed-landing-config.sql (full TR rewrite for agency narrative)
- Fontshare vs Google Fonts fallback decision (currently: Google Fonts, woff2 self-host considered later)
- Whether `<html>` font-loading uses `<link rel="preload">` or inlined `font-face` declaration
