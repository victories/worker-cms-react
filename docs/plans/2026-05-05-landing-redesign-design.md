# Landing Redesign — Design Document

> **Status:** Approved (2026-05-05). Implementation plan to follow as
> a separate document via `writing-plans` skill.
> **Branch:** `feature/landing-redesign`
> **Brief:** [`docs/prompts/landing-redesign.md`](../prompts/landing-redesign.md)

## 1. Decisions captured

| # | Topic | Decision |
|---|-------|----------|
| Q1 | Primary goal | **C — migrate WP/Ghost users.** Primary CTA "Sitemi Taşı", import wizard emphasis, "from X" comparisons. |
| Q2 | Audience | **Primary: agency / freelance dev** (multi-site, white-label, client admin). **Secondary: solo blogger** (personal WP migration). |
| Q3 | Features (6) | One-click WP import · Multi-site single panel · Edge performance (50ms TTFB) · AI content assistant · Cost comparison · Backup + 99.99% SLA. |
| Q4 | Aesthetic | **E — hybrid:** dark theatrical hero (forced regardless of root theme) + light-on-light body. Section-scoped CSS variables, no scroll-driven theme swap. |
| Q5 | Brand | **D — animated wordmark** (letter-by-letter reveal in hero, plain in nav). **P2 — custom palette** to be sourced via ui-ux-pro-max color domain search (`saas migration agency` keywords). |
| Q6 | Length | **D — 9 sections:** Hero · Migration strip · Features · Cost compare · Multi-site · Pricing · Testimonials · FAQ · Final CTA + Footer. |
| Q7 | Visuals | **C — code-driven only.** No new R2 assets. Hero abstract gradient + grid + animated wordmark. Migration strip as stylized step cards. Multi-site as SVG/Tailwind dashboard mock. |
| Q8 | i18n | **B — labels in config.** Add `LandingConfig.labels`, `migration`, `costCompare`, `multisite`, `faq` fields with sane TR fallbacks. Render layer language-agnostic. Non-breaking — every section guards missing fields. |
| Tech 1 | Hybrid hero theme | **A1 — section-scoped CSS variables.** `[data-section-theme="dark"]` overrides `--background`, `--foreground`, `--border`, `--muted`, `--card`. Zero JS. ThemeToggle keeps controlling root theme. |
| Tech 2 | Animation library | **B1 — framer-motion + lenis.** `LazyMotion` + `domAnimation` (~10-12 KB efektif). Lenis ~5 KB only when no `prefers-reduced-motion`. |
| Tech 3 | FAQ accordion | **C1 — native `<details><summary>`.** Zero JS, native a11y. CSS `[open]` for transition. |

## 2. Architecture

### 2.1 File layout

```
src/ssr/pages/landing/
  Landing.tsx                   compose-only entry, ~80 lines
  sections/
    Hero.tsx                    badge + animated wordmark slot + dual CTA + stats
    MigrationStrip.tsx          3-step horizontal flow
    Features.tsx                6-card grid, middle accent
    CostCompare.tsx             split panel, "WP stack vs WorkerCms"
    MultiSite.tsx               text + DashboardMock
    Pricing.tsx                 DB packages + Enterprise card
    Testimonials.tsx            3 quote cards
    Faq.tsx                     native <details>, semantic and zero-JS
    FinalCta.tsx                CTA band + footer
  components/
    AnimatedWordmark.tsx        SSR-safe markup; framer variant lives client-side
    DashboardMock.tsx           pure SVG + Tailwind, no R2 dependency
    SectionTheme.tsx            <section data-section-theme="dark"> wrapper
    Icon.tsx                    moved from current Landing.tsx, extended with new icons

src/client/landing/
  motion.tsx                    LazyMotion provider + reusable variants
  Wordmark.tsx                  framer letter stagger (client-only island)
  ScrollReveal.tsx              IntersectionObserver hook + component wrapper
  lenis.ts                      init guarded by useReducedMotion

src/client/landing-entry.tsx    extended: theme-toggle + Wordmark + ScrollReveal hydration

packages/ui/tokens/design-tokens.css       +section-scoped dark vars
public-styles/input.css                    +scroll-reveal utility classes (CSS fallback)
```

### 2.2 SSR / hydration boundary

- **SSR markup is complete and accessible without JS.** All content
  visible, all CTAs work, FAQ functions via native `<details>`,
  scroll behaviour handled by CSS `scroll-behavior: smooth`.
- **Client hydration is a thin enhancement layer.** `landing-entry.tsx`
  hydrates only the islands that need motion: ThemeToggle (already
  there), AnimatedWordmark, and a ScrollReveal observer that adds an
  `is-visible` class to elements with `[data-reveal]` attribute. Lenis
  init is conditional on `prefers-reduced-motion: no-preference`.
- **framer-motion never renders on the server.** Sections that need
  motion emit static markup with `[data-motion="hero-wordmark"]` etc.
  The client-side islands replace just those nodes after hydration.
  This avoids the `useId` / SSR-mismatch class of bugs framer can hit
  in concurrent renders, and keeps the worker bundle clean of framer.

### 2.3 Hybrid theme mechanism

```css
/* in packages/ui/tokens/design-tokens.css, after the existing
   :root and .dark blocks */

[data-section-theme="dark"] {
  --background: 222 47% 4%;
  --foreground: 0 0% 98%;
  --muted: 222 16% 14%;
  --muted-foreground: 220 9% 70%;
  --border: 220 13% 18%;
  --card: 222 47% 6%;
  --card-foreground: 0 0% 98%;
  /* primary / accent inherit from root so brand stays consistent */
}
```

The Hero, Final CTA band, and (optionally) the testimonials section
opt into the dark surface by wrapping their root `<section>` with
`data-section-theme="dark"`. Everything else inherits root tokens
and follows ThemeToggle.

## 3. LandingConfig schema (additive)

```ts
export interface LandingConfig {
  enabled?: boolean;
  brand?: { name?: string; tagline?: string };
  hero?: { /* unchanged */ };
  features?: { /* unchanged */ };
  pricing?: { /* unchanged */ };
  testimonials?: { /* unchanged */ };
  cta?: { /* unchanged */ };
  footer?: { /* unchanged */ };

  // NEW — all optional, every consumer guards missing fields
  labels?: {
    nav?: { features?: string; pricing?: string; faq?: string;
            login?: string; cta?: string };
    pricing?: { popular_badge?: string; per_month_suffix?: string };
    common?: { learn_more?: string; get_started?: string };
  };
  migration?: {
    title?: string;
    subtitle?: string;
    steps?: Array<{ label: string; desc: string; icon?: string }>;
  };
  costCompare?: {
    title?: string;
    subtitle?: string;
    before_label?: string;
    after_label?: string;
    rows?: Array<{ label: string; before: string; after: string;
                   saving?: string }>;
    footnote?: string;
  };
  multisite?: {
    title?: string;
    subtitle?: string;
    bullets?: string[];
    dashboard?: {
      sites?: Array<{ name: string; visits?: string;
                      status?: 'live' | 'draft' | 'error' }>;
    };
  };
  faq?: {
    title?: string;
    subtitle?: string;
    items?: Array<{ q: string; a: string }>;
  };
}
```

**Migration / rollout:**
- `scripts/seed-landing-config.sql` is rewritten with the agency
  + migration narrative and committed in the same commit as the
  schema change.
- Existing staging/prod DBs are **not auto-migrated.** Operators run
  `npm run db:seed` (rewrite path) or edit the JSON in admin. Old
  configs render correctly because every new section is optional.
- The admin JSON editor is unchanged. New fields appear as additional
  keys; nothing breaks.

## 4. Section blueprint

| # | Section | Content | Theme | Motion |
|---|---------|---------|-------|--------|
| 1 | Hero | Badge → animated wordmark → headline + sub → dual CTA ("Sitemi Taşı" + "Ücretsiz Hesap Aç") → 4-stat strip | dark forced | wordmark stagger 50ms, sub fade-up 200ms delay, CTA spring scale on hover |
| 2 | MigrationStrip | "5 dakikada taşıma" + 3 horizontal cards: Yükle / Eşle / Yayınla | root theme | scroll-reveal stagger 60ms |
| 3 | Features | 6-card grid; middle card (Multi-site) accent-highlighted | root | scroll-reveal stagger 40ms |
| 4 | CostCompare | "Aylık maliyet kıyası" + split panel; saving badge + footnote | root | saving badge spring-in, columns scroll-reveal |
| 5 | MultiSite | Text + bullet list left, DashboardMock right (3-5 site rows w/ status dot) | root | mock dashboard scroll-reveal + line-by-line fade |
| 6 | Pricing | DB packages + Enterprise card (existing merge logic preserved) | root | highlighted plan hover scale + glow |
| 7 | Testimonials | 3 quote cards (agency / blogger / publisher mix) | root | scroll-reveal stagger 80ms |
| 8 | FAQ | 6-8 native `<details>`, first item open by default | root | CSS `[open]` height transition (max-height + opacity exception, justified by accessibility tradeoff); reduced-motion → instant |
| 9 | FinalCta + Footer | Big CTA + footer text + links | dark forced | CTA pulse glow 3s loop, off when reduced-motion |

Page total: ~7-9 viewport scrolls on desktop, ~auto on mobile.

## 5. Motion and accessibility

- **framer-motion** v11+, used via `LazyMotion + domAnimation` only.
- **lenis** v1, init guarded:
  ```ts
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    new Lenis({ duration: 1.0, easing: t => 1 - Math.pow(1-t, 3) });
  }
  ```
- `useReducedMotion()` hook from framer in every motion component;
  variants short-circuit to static when reduced.
- CSS fallback: `@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation: none !important; transition: none !important; } }`.
- IntersectionObserver: `rootMargin: '0px 0px -15% 0px'`, `once: true`,
  transform + opacity only.
- Stagger 30-50ms list/grid; wordmark 50ms.
- Duration 150-200ms micro, ≤400ms complex.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (easeOutExpo) for entries.
- Hero motion budget: max 2 elements (wordmark + CTA spring); blobs static.
- Keyboard: every CTA, accordion, theme toggle Tab-reachable;
  `:focus-visible` rings via shadcn `--ring`.
- Heading order: `<h1>` hero (single), `<h2>` per section, `<h3>` per card.
- Color contrast: every text/bg pair ≥4.5:1 (WCAG AA), verified after
  ui-ux-pro-max palette is applied.

## 6. Bundle and verification budgets

| Metric | Current | Target | Hard cap |
|--------|---------|--------|----------|
| Worker gzip | ~500 KB | ≤620 KB | 850 KB |
| publisher-client (unaffected) | 197 KB | unchanged | — |
| landing-client gzip | ~3 KB | ≤30 KB | 80 KB |
| Tailwind output | 71 KB | ≤95 KB | — |
| `tsc --noEmit` errors | 19 baseline | ≤19 | hard |
| Lighthouse mobile perf | n/a | ≥90 | manual via wrangler dev |
| Lighthouse a11y | n/a | ≥95 | manual |

`npx wrangler deploy --dry-run` produces a "before / after" gzip line
that the PR description must include. If any cap is breached, work
stops and we revisit B2 (drop lenis) or B3 (CSS-only motion) before
proceeding.

## 7. Implementation phasing (commit sequence)

On `feature/landing-redesign`, master untouched:

1. `docs(landing): brainstorming design doc` (this commit).
2. `docs(design): generate landing design system via ui-ux-pro-max`
   — `docs/design/design-system/MASTER.md` and any sub-domain output
   from the ui-ux-pro-max search step.
3. `docs(landing): implementation plan` — output of `writing-plans` skill.
4. `chore(landing): scaffold landing/ folder + SectionTheme primitive`
   — empty section files + theme tokens, tsc clean.
5. `feat(landing): add LandingConfig labels/migration/cost/multisite/faq fields`
   — type widening + seed rewrite.
6. `feat(landing): hero + animated wordmark` — SSR fallback +
   framer client island.
7. `feat(landing): migration strip + features grid (scroll reveal)`.
8. `feat(landing): cost compare + multi-site dashboard mock`.
9. `feat(landing): pricing rebuild + testimonials + final CTA`.
10. `feat(landing): native FAQ + footer polish`.
11. `feat(landing): lenis smooth scroll + reduced-motion guards`.
12. `chore(landing): replace old Landing.tsx with new entry; remove unused`.
13. `docs(landing): screenshots + bundle diff` — verification report,
    commit before opening PR.

Every commit must pass `tsc --noEmit` (≤19 baseline) and
`npm run build:assets`.

## 8. Risks and rollback

| Risk | Mitigation |
|------|-----------|
| Bundle blows past 850 KB hard cap | Drop lenis (B2). If still over, fall back to CSS-only motion (B3). Worst case, ship without animated wordmark. |
| framer-motion SSR/hydration mismatch | All framer code lives in client islands; SSR emits static markup with the final visual end-state. Hydration is purely additive. |
| ui-ux-pro-max palette fails contrast | Run contrast check after applying palette; if it fails, revert to current shadcn `--primary` (P1) and treat as P2 fail. |
| Existing admin config breaks | Schema is additive only; every new section guards missing fields. Old configs render with new sections as no-ops. |
| Breaking AMP / feed / sitemap | Out of scope — none of those files are touched. Hono JSX pragmas remain on the legacy producers per CLAUDE.md §2.6. |
| Production accidentally deployed | `npm run deploy` is forbidden in this branch. Only `wrangler deploy --dry-run` for size measurement. User runs production deploys manually. |

**Rollback:** Branch is feature/landing-redesign; revert is `git
checkout master`. The current Landing.tsx remains intact until step 12
of the commit sequence, at which point we delete and replace.
Pre-step-12 commits all keep both old and new code coexisting so any
intermediate revert is trivial.

## 9. Out of scope

- AMP routes (`src/components/AMPLayout.tsx`, `src/routes/public/amp/*`)
- RSS feed (`src/routes/public/feed.tsx`)
- Sitemap (`src/routes/public/sitemap.tsx`)
- Admin SPA UI (`admin/`) — this redesign is publisher-side only
- Public theme engine (`packages/ui/themes/*`) — landing is a special
  case route, not a theme variant
- Production deploy — user-driven, never automated by this work

## 10. Definition of done

- [ ] All 13 commits land on `feature/landing-redesign`.
- [ ] `npx tsc --noEmit` ≤19 errors.
- [ ] `npm run build:assets` clean.
- [ ] `cd admin && npm run build` clean (admin unaffected).
- [ ] `npx wrangler deploy --dry-run` ≤850 KB gzip.
- [ ] Lighthouse mobile perf ≥90, a11y ≥95 (manual, wrangler dev).
- [ ] Screenshots at 375 / 768 / 1024 / 1440 in PR body.
- [ ] Reduced-motion behaviour demonstrated (gif or note).
- [ ] PR opened against `master`; merge is user-decided.
