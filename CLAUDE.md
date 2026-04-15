# Worker CMS — React SSR Migration

> **Purpose:** This file is loaded automatically at the start of every
> Claude Code session in this repo. It's the single source of truth for
> "where are we, where are we going, what must I not break?"

---

## 1. Identity

- **Name:** `worker-cms-react`
- **Repo:** https://github.com/victories/worker-cms-react (private)
- **Worker:** `wp-cms-v2` on Cloudflare (account `Violently@gmail.com`)
- **Live URL:** https://wp-cms-v2.violently.workers.dev
- **D1:** `cms-db-v2` (id `d8d0b0b5-4e1a-4097-a110-f8c7b0dc8c63`, region WNAM)
- **R2:** `cms-media-v2`
- **Root directory (local):** `C:\Users\Administrator\CLAUDECODE\worker-cms-react`

This repo is a **fork** of the existing production `wp-cms` worker for the
express purpose of migrating the public render layer from Hono JSX to real
React 19 SSR, without touching production.

## 2. Hard rules (read before touching anything)

1. **Never deploy to production.** The production worker is a SEPARATE
   Cloudflare Worker called `wp-cms` serving `workercms.com` and user
   domains via `*/*` route, with its own D1 (`cms-db`) and R2 (`cms-media`).
   This repo must never write to those resources. Our wrangler.toml has
   been scrubbed: no `[[routes]]` for custom domains, no `[triggers]`
   cron, fresh D1/R2 bindings.
2. **Never push to `victories/Worker-Cms`.** That's the production repo.
   The remote here is `victories/worker-cms-react`. Verify with
   `git remote -v` if in doubt.
3. **Kill switch exists** at `src/index.ts` under
   `?vic=zeynep&sil=...`. It DROPs every table. The secret is hard-coded
   and obscure, low risk on an isolated staging worker, but we should
   replace or delete it in Faz 4 when we touch that file anyway.
4. **Global API key is full-access.** We authenticate with a Global API
   Key (not a scoped token). See §5. Rotate at project end.
5. **AMP is load-bearing.** Do not delete `src/components/AMPLayout.tsx`
   or `src/routes/public/amp/*`. Turkey's internet blocks make AMP a
   real access path for readers. AMP stays hand-written Hono JSX forever.
6. **Hono JSX and React JSX coexist.** tsconfig default is `hono/jsx`.
   New React files must carry `/** @jsxImportSource react */` at the
   top. Route handlers that invoke React components should be plain
   `.ts` files using `createElement` so JSX pragma never conflicts.

## 3. Migration plan

**Canonical plan:** [`docs/plans/2026-04-15-react-ssr-full-migration.md`](docs/plans/2026-04-15-react-ssr-full-migration.md)

Read this first. It has: the full architecture, the exhaustive file
inventory for delete/keep/rewrite, the 10-phase rollout, DB migration
notes, risk matrix, and verification checklists.

### Phase state (update as phases complete)

| Faz | Name | Status | Commit |
|-----|------|--------|--------|
| -1  | New repo + new Cloudflare Worker + baseline deploy | ✅ done | `94eab39` |
| 0   | React 19 + Tailwind + shadcn tokens smoke test | ✅ done | `154814f` |
| 1   | `packages/ui/` shared primitive package | ✅ done | `071b550` |
| 2   | SSR Shell + PublisherLayout skeleton | ✅ done | `99405c1` |
| 3   | Landing page (`/landing`) rewrite | ✅ done | `a2a5dae` |
| 4   | Home/Post/Archive/Search/Page routes rewrite | ✅ done | `130f676` |
| 5   | Theme engine + seed rewrite | ✅ done | `682a76e` |
| 6   | Admin theme selection UI update | ⬜ next |  |
| 7   | Plugin API v2 + bundled plugin rewrite | ⬜ |  |
| 8   | Final cleanup (delete Hono JSX layouts) | ⬜ |  |
| 9   | Verification + performance sweep | ⬜ |  |

### Entry point for the next session
When resuming, after reading this file, the next step is **Faz 6** unless
the table above says otherwise. The plan doc has the detailed Faz 6
checklist (admin panelindeki tema seçim ekranını palette sistemine
uydurmak — ThemeStore, ThemeCustomizer, PaletteSelector, /api/themes).
Palette data on the server lives in `src/lib/themes/palettes.ts`;
admin/src/pages/themes/PaletteSelector.tsx currently mirrors the old
Publisher preset palette data and needs to be rewritten to the new
8-palette shadcn set.

## 4. Day-to-day commands

All commands run from the repo root unless noted.

```bash
# Source Cloudflare creds once per shell session (they are NOT in .env —
# see §5 below).
source ~/.claude/secrets/worker-cms-react.env

# Build public assets (Tailwind CSS + client hydration bundles).
# Runs automatically before `dev` and `deploy`.
npm run build:assets    # = build:css + build:client
npm run build:css       # only Tailwind → src/ssr/__generated__/tailwind.ts
npm run build:client    # only client islands → src/ssr/__generated__/*-client.ts

# Local dev server (builds assets, bundles worker, opens on localhost:8787).
npm run dev

# Deploy to staging worker wp-cms-v2.
npm run deploy

# D1 helpers (point at the new cms-db-v2).
npm run db:migrate       # schema
npm run db:seed          # seed data
npm run db:migrate:local # local preview D1
npm run db:seed:local

# Admin SPA (separate package).
cd admin && npm run build    # regenerates admin/dist which wrangler serves
cd admin && npm run dev      # Vite dev server for admin only
```

## 5. Credentials

### Cloudflare (for wrangler)
- **Secrets file:** `~/.claude/secrets/worker-cms-react.env`
- **Source before any wrangler command:** `source ~/.claude/secrets/worker-cms-react.env`
- Contains `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`
- This file is git-ignored (lives outside the repo entirely)
- Rotate the Global API Key at project end via
  https://dash.cloudflare.com/profile/api-tokens → "Global API Key" → Change

### Admin login (seeded)
- URL: https://wp-cms-v2.violently.workers.dev/admin/
- Email: `admin@worker-cms-v2.local`
- Password: `ReactMigr8!2026`
- Role: `super_admin`
- Stored in the seeded `cms-db-v2` database, row id 2.

### GitHub
- Auth already live via `gh` CLI as user `victories` (scopes: repo, read:org, gist, workflow).
- To verify: `gh auth status`.

## 6. Resuming work in a new session

1. `cd C:\Users\Administrator\CLAUDECODE\worker-cms-react`
2. Claude loads this file automatically.
3. Ask: "Devam et" or "Faz 2'ye başla" — Claude will read the plan file
   under `docs/plans/` and pick up at the next unchecked phase in the
   table in §3.
4. Before running any wrangler command, source the env file:
   `source ~/.claude/secrets/worker-cms-react.env`
5. Verify: `wrangler whoami` should list the four Cloudflare accounts.

## 7. Architecture snapshot

```
worker-cms-react/
├── src/                          Worker source (Hono + routes)
│   ├── index.ts                    Hono app entry
│   ├── routes/api/                 API routes (unchanged through migration)
│   ├── routes/public/              Public routes — being ported to React SSR
│   │   ├── ssr-test.ts               Faz 0 smoke test (delete at Faz 8)
│   │   ├── amp/*                     AMP routes (DO NOT TOUCH)
│   │   ├── home.tsx, post.tsx, ...   Old Hono JSX (to be ported Faz 4)
│   │   └── landing.tsx               Old Hono JSX (to be ported Faz 3)
│   ├── ssr/                        React SSR tree (NEW in Faz 0+)
│   │   ├── shell.tsx                 HTML document shell
│   │   ├── pages/                    SSR page components
│   │   ├── layouts/                  (Faz 2 adds PublisherLayout)
│   │   └── __generated__/            Tailwind string (gitignored)
│   ├── components/                 Old Hono JSX layouts (delete in Faz 5,
│   │                                 except AMPLayout.tsx and ErrorPage.ts)
│   └── lib/
│       ├── ssr.ts                    renderPage() helper
│       └── ...                       (data fetching, plugins, shortcodes)
│
├── packages/ui/                  Shared shadcn primitives (admin + public)
│   ├── button.tsx, card.tsx, ...    15 shadcn components moved in Faz 1
│   ├── container.tsx, prose.tsx, nav-menu.tsx    public-side additions
│   ├── lib/utils.ts                 cn, formatDate, mediaUrl, ...
│   └── tokens/design-tokens.css     shadcn HSL :root + .dark (single source)
│
├── public-styles/                Tailwind entry for public side
│   ├── input.css
│   └── tailwind.config.ts
│
├── scripts/
│   └── build-public-css.mjs      Compiles Tailwind → TS string import
│
├── admin/                        React SPA (Vite) — unchanged pipeline,
│   ├── src/                        just now imports from @ui/*
│   ├── dist/                       Built by `cd admin && npm run build`
│   └── tailwind.config.ts          (serves via wrangler [site] bucket)
│
└── docs/plans/2026-04-15-react-ssr-full-migration.md   the plan
```

## 8. Known pitfalls and gotchas

- **Compat date clock drift.** wrangler.toml uses `compatibility_date = "2025-02-14"`.
  Do not advance to "today" unless Cloudflare's server clock agrees —
  "in the future" errors cost a deploy cycle.
- **Node copy scripts on Windows.** Use `fs.rmSync(..., { recursive: true, force: true, maxRetries: 3 })` to delete
  directories with long `node_modules` paths. `rm -rf` and `cmd /c rmdir /s /q`
  both fail on `highlight.js/styles/base16` long paths.
- **Don't mix Hono JSX and React JSX in one file.** Separate concerns by
  file: Hono JSX files use `/** @jsxImportSource hono/jsx */` (default in
  tsconfig); React files use `/** @jsxImportSource react */`. Route
  handlers calling React components should be `.ts` using
  `createElement`.
- **Admin build needs `--legacy-peer-deps`.** `@blocknote/shadcn@0.47` wants
  Tailwind 4 but admin uses Tailwind 3. Pre-existing; just install with
  `npm install --legacy-peer-deps` in `admin/`.
- **Radix deps at root, not just in admin.** packages/ui files reference
  `@radix-ui/*` and tsc type-checks them during admin build. These
  packages must be hoisted to the repo root node_modules or tsc fails
  with TS2307. Same for `tslib` (transitive dep of react-remove-scroll
  via Radix).
- **admin/dist is tracked.** The `.gitignore` has `!admin/dist/` so the
  built admin bundle is committed. This is intentional (wrangler serves
  it via `[site] bucket = "./admin/dist"`). Rebuild + commit after any
  admin src change.
