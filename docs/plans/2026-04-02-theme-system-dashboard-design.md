# Theme System & Dashboard Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded 3-layout theme system with a config-driven, DB-backed theme engine with 8 presets, a Theme Store + Customizer admin UI, and a modernized dashboard with widget system.

**Architecture:** New `themes` and `site_themes` DB tables store theme definitions and per-site activations. A single `UnifiedLayout.tsx` with slot-based regions replaces the 3 separate layout files. Theme engine middleware resolves the active theme per-request. Admin panel gets Theme Store (card grid) and Customizer (accordion settings panel) pages. Dashboard gets draggable widget grid with modern card design.

**Tech Stack:** Hono (backend), Cloudflare D1 (database), React 19 + Shadcn/ui + TailwindCSS (admin), Zustand (state), CSS custom properties (theming)

---

## Task 1: Database Migration — Theme Tables

**Files:**
- Create: `src/db/migrations/006_theme_system.sql`
- Modify: `src/db/schema.sql` (append after line 209)

**Step 1: Create migration SQL file**

Create `src/db/migrations/006_theme_system.sql`:

```sql
-- ============================================================
-- THEME SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  version TEXT DEFAULT '1.0.0',
  author TEXT DEFAULT 'System',
  css_variables TEXT NOT NULL DEFAULT '{}',
  layout_config TEXT NOT NULL DEFAULT '{}',
  google_fonts TEXT DEFAULT '[]',
  custom_css TEXT DEFAULT '',
  custom_head_html TEXT DEFAULT '',
  thumbnail_r2_key TEXT,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);

CREATE TABLE IF NOT EXISTS site_themes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  site_id INTEGER NOT NULL,
  theme_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  custom_overrides TEXT DEFAULT '{}',
  installed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
  UNIQUE(site_id, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_site_themes_site ON site_themes(site_id);
CREATE INDEX IF NOT EXISTS idx_site_themes_active ON site_themes(site_id, is_active);
```

**Step 2: Append tables to schema.sql**

Add the same SQL to `src/db/schema.sql` after line 209 (after global_settings table).

**Step 3: Run migration against D1**

```bash
npx wrangler d1 execute cms-db --remote --file=src/db/migrations/006_theme_system.sql
```

Expected: Tables created successfully.

**Step 4: Commit**

```bash
git add src/db/migrations/006_theme_system.sql src/db/schema.sql
git commit -m "feat: add themes and site_themes database tables"
```

---

## Task 2: Theme Presets Seed Data

**Files:**
- Create: `src/lib/themePresets.ts`
- Create: `src/db/migrations/007_seed_themes.sql`

**Step 1: Create theme presets TypeScript definitions**

Create `src/lib/themePresets.ts` with all 8 preset definitions. Each preset contains:
- `css_variables`: colors, typography, spacing, borders (matching current SiteTheme fields)
- `layout_config`: header_style, sidebar, footer, post_card settings
- `google_fonts`: array of font strings
- Metadata: name, slug, description, author

**Presets to define:**

1. **starter** — Current STARTER_DEFAULTS: white bg, blue accent, Inter font, standard header, right sidebar, three-column footer
2. **modern** — Current MODERN_DEFAULTS: stone bg, teal accent, DM Sans + Playfair Display, dark header, underline nav
3. **velvet** — Current VELVET_DEFAULTS: dark purple bg, lavender accent, Plus Jakarta Sans + Outfit, underline nav
4. **developer** — Dark bg (#0d1117), green accent (#39d353), JetBrains Mono + Fira Code, minimal header, no sidebar, simple footer
5. **magazine** — Warm white (#fef9f3), dark red accent (#991b1b), Cormorant Garamond + Source Serif Pro, centered header, 2-col post cards
6. **minimal** — Pure white, gray accent (#6b7280), Lora + Inter, minimal header, no sidebar, simple footer, wide content
7. **corporate** — Light gray (#f1f5f9), navy accent (#1e3a5f), Roboto + Roboto, standard header, right sidebar, three-column footer
8. **creative** — Bright white, orange accent (#f97316), Poppins + Montserrat, centered header, 3-col post cards, large type

**Step 2: Create seed SQL**

Generate INSERT statements for all 8 themes with `is_system = 1`.

**Step 3: Run seed migration**

```bash
npx wrangler d1 execute cms-db --remote --file=src/db/migrations/007_seed_themes.sql
```

**Step 4: Commit**

```bash
git add src/lib/themePresets.ts src/db/migrations/007_seed_themes.sql
git commit -m "feat: add 8 system theme presets with seed data"
```

---

## Task 3: Theme Engine (Backend Core)

**Files:**
- Create: `src/lib/themeEngine.ts`
- Modify: `src/lib/public-db.ts` (lines 260-309, getSiteTheme function)

**Step 1: Create themeEngine.ts**

```typescript
// src/lib/themeEngine.ts
// Functions:
// - loadActiveTheme(db, siteId) → ThemeData | null
//   Query: SELECT t.*, st.custom_overrides FROM site_themes st
//          JOIN themes t ON t.id = st.theme_id
//          WHERE st.site_id = ? AND st.is_active = 1
//   Falls back to 'starter' system theme if none active
//
// - mergeCssVariables(base, overrides) → merged css_variables object
//   Deep merge base theme css_variables with site_themes.custom_overrides
//
// - generateCssString(cssVars) → string
//   Convert { primary_color: '#2563eb', ... } to ":root { --primary-color: #2563eb; ... }"
//
// - getGoogleFontsUrl(fonts: string[]) → string
//   Build https://fonts.googleapis.com/css2?family=... URL
//
// - mergeLayoutConfig(base, overrides) → layout_config object
//
// - themeToSiteTheme(themeData) → SiteTheme
//   Convert new ThemeData format to existing SiteTheme interface for backward compatibility
```

**Step 2: Update getSiteTheme in public-db.ts**

Modify `getSiteTheme` (lines 260-309) to:
1. First try loading from `themes` + `site_themes` tables (new system)
2. If no active theme found, fall back to current settings-based approach
3. This ensures backward compatibility during migration

```typescript
export async function getSiteTheme(db: D1Database, siteId: number): Promise<SiteTheme> {
  // Try new theme system first
  const activeTheme = await loadActiveTheme(db, siteId);
  if (activeTheme) {
    return themeToSiteTheme(activeTheme);
  }
  // Fallback: existing settings-based theme (backward compat)
  // ... existing code ...
}
```

**Step 3: Verify the public site still renders correctly**

Open a site in browser, confirm theme colors/fonts are unchanged.

**Step 4: Commit**

```bash
git add src/lib/themeEngine.ts src/lib/public-db.ts
git commit -m "feat: add theme engine with backward-compatible theme loading"
```

---

## Task 4: Theme Resolver Middleware

**Files:**
- Create: `src/middleware/themeResolver.ts`
- Modify: `src/index.ts` (line ~169, add middleware after pluginHooks)

**Step 1: Create themeResolver middleware**

```typescript
// src/middleware/themeResolver.ts
// Middleware that:
// 1. Gets siteId from context (set by siteResolver middleware)
// 2. Calls loadActiveTheme(db, siteId)
// 3. Sets c.set('activeTheme', themeData) on context
// 4. Only runs for public routes (not /api/*)
```

**Step 2: Register middleware in index.ts**

Add after pluginHooks middleware (line 169):
```typescript
import { themeResolverMiddleware } from './middleware/themeResolver';
// After line 169 (pluginHooks):
app.use('*', themeResolverMiddleware);
```

**Step 3: Verify middleware doesn't break existing routes**

Test: Visit homepage, admin panel, API endpoints — all should work.

**Step 4: Commit**

```bash
git add src/middleware/themeResolver.ts src/index.ts
git commit -m "feat: add theme resolver middleware"
```

---

## Task 5: Theme API Endpoints

**Files:**
- Create: `src/routes/api/themes.ts`
- Modify: `src/index.ts` (add route registration after line ~201)

**Step 1: Create themes API**

```typescript
// src/routes/api/themes.ts
// Endpoints:
//
// GET /api/themes — List all themes (system + user-created)
//   Returns: { success: true, data: Theme[] }
//
// GET /api/themes/active — Get active theme for current site
//   Returns: { success: true, data: { theme: Theme, overrides: {} } }
//
// GET /api/themes/:id — Get single theme by ID
//   Returns: { success: true, data: Theme }
//
// POST /api/themes — Create new theme (clone or fresh)
//   Body: { name, slug, css_variables, layout_config, ... }
//   Auth: admin+
//
// PUT /api/themes/:id — Update theme
//   Body: partial theme fields
//   Auth: admin+ (system themes: super_admin only)
//
// DELETE /api/themes/:id — Delete theme
//   Guard: Cannot delete system themes (is_system = 1)
//   Auth: admin+
//
// POST /api/themes/:id/activate — Activate theme for current site
//   Sets is_active=0 on all other site_themes for this site
//   Sets is_active=1 on this theme
//   Creates site_themes row if not exists
//   Auth: admin+
//
// POST /api/themes/:id/clone — Clone a theme
//   Creates new theme with "(Copy)" suffix, is_system=0
//   Auth: admin+
//
// PUT /api/themes/:id/overrides — Save per-site customizations
//   Body: { custom_overrides: { ... } }
//   Updates site_themes.custom_overrides
//   Auth: admin+
```

**Step 2: Register route in index.ts**

```typescript
import themeRoutes from './routes/api/themes';
app.route('/api/themes', themeRoutes);
```

**Step 3: Test endpoints with curl**

```bash
# List themes
curl -H "Authorization: Bearer $TOKEN" https://admin.domain.com/api/themes
# Activate a theme
curl -X POST -H "Authorization: Bearer $TOKEN" https://admin.domain.com/api/themes/THEME_ID/activate
```

**Step 4: Commit**

```bash
git add src/routes/api/themes.ts src/index.ts
git commit -m "feat: add theme CRUD and activation API endpoints"
```

---

## Task 6: UnifiedLayout.tsx — Slot-Based Layout

**Files:**
- Create: `src/components/UnifiedLayout.tsx`
- Modify: `src/components/Layout.tsx` (keep as thin wrapper for backward compat)
- Reference: `src/components/LayoutModern.tsx`, `src/components/LayoutVelvet.tsx`

**Step 1: Create UnifiedLayout.tsx**

A single layout component that handles all theme variants through `layout_config`:

```
Slots controlled by layout_config:
- announcement_bar: shown if config has announcement text
- header: header_style → 'standard' | 'centered' | 'minimal'
  - nav_style → 'default' | 'gooey' | 'flowing' | 'underline'
- content + sidebar: sidebar_position → 'left' | 'right' | 'none'
- footer: footer_style → 'simple' | 'three-column' | 'minimal'
- post_card: post_card_style, post_card_columns, show_featured_image, etc.
```

Key approach:
- Extract common HTML structure from all 3 layouts
- Use conditional rendering for header/footer variants
- CSS variables drive all colors/fonts (no hardcoded values)
- Keep gooey nav script logic (from Layout.tsx lines 48-80)
- Keep all widget rendering logic (renderW helper)

**Step 2: Update Layout.tsx to delegate to UnifiedLayout**

```typescript
// Layout.tsx becomes a thin wrapper:
export const Layout: FC<PropsWithChildren<LayoutProps>> = (props) => {
  return <UnifiedLayout {...props} />;
};
```

**Step 3: Update LayoutModern.tsx and LayoutVelvet.tsx similarly**

Both become thin wrappers that pass through to UnifiedLayout. This maintains backward compatibility while all rendering happens in one place.

**Step 4: Verify all 3 template styles render correctly**

Test with each theme_template value: starter, modern, velvet.

**Step 5: Commit**

```bash
git add src/components/UnifiedLayout.tsx src/components/Layout.tsx src/components/LayoutModern.tsx src/components/LayoutVelvet.tsx
git commit -m "feat: unified slot-based layout replacing 3 separate layouts"
```

---

## Task 7: Migration Script — Settings to Themes

**Files:**
- Create: `src/db/migrations/008_migrate_settings_to_themes.sql`

**Step 1: Write migration that auto-activates starter theme for existing sites**

For each existing site:
1. Read `theme_template` from settings
2. Find matching system theme by slug
3. Create `site_themes` row with `is_active = 1`
4. Copy all `theme_*` overrides from settings into `custom_overrides` JSON

```sql
-- For each site, activate the corresponding system theme
INSERT INTO site_themes (id, site_id, theme_id, is_active, custom_overrides)
SELECT
  lower(hex(randomblob(8))),
  s.id,
  t.id,
  1,
  '{}'
FROM sites s
CROSS JOIN themes t
WHERE t.slug = COALESCE(
  (SELECT value FROM settings WHERE site_id = s.id AND key = 'theme_template'),
  'starter'
)
AND NOT EXISTS (SELECT 1 FROM site_themes WHERE site_id = s.id AND is_active = 1);
```

**Step 2: Run migration**

```bash
npx wrangler d1 execute cms-db --remote --file=src/db/migrations/008_migrate_settings_to_themes.sql
```

**Step 3: Verify sites still load with correct themes**

**Step 4: Commit**

```bash
git add src/db/migrations/008_migrate_settings_to_themes.sql
git commit -m "feat: migrate existing sites to new theme system"
```

---

## Task 8: Admin — Theme Store Page

**Files:**
- Create: `admin/src/pages/ThemeStore.tsx`
- Modify: `admin/src/App.tsx` (add route, around line 120)
- Modify: `admin/src/components/layout/Sidebar.tsx` (add nav item in Appearance group)

**Step 1: Create ThemeStore.tsx**

Page structure:
```
┌──────────────────────────────────────────────┐
│ Themes                        [+ New Theme]  │
├──────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Preview  │ │ Preview  │ │ Preview  │        │
│ │ Image    │ │ Image    │ │ Image    │        │
│ │          │ │          │ │          │        │
│ │ Starter  │ │ Modern   │ │ Velvet   │        │
│ │ [Active] │ │ [Apply]  │ │ [Apply]  │        │
│ │[Customize]│ │[Customize]│ │[Customize]│       │
│ └─────────┘ └─────────┘ └─────────┘        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │Developer │ │Magazine  │ │Minimal   │        │
│ └─────────┘ └─────────┘ └─────────┘        │
│ ... more themes ...                          │
└──────────────────────────────────────────────┘
```

Features:
- Fetch themes from `GET /api/themes`
- Show active badge on current theme
- "Activate" button calls `POST /api/themes/:id/activate`
- "Customize" navigates to `/admin/themes/:id/customize`
- "Clone" calls `POST /api/themes/:id/clone`
- "Delete" for non-system themes
- Color preview: show theme's primary, secondary, bg as small circles on card

**Step 2: Add route to App.tsx**

After line ~120:
```typescript
import { ThemeStore } from './pages/ThemeStore';
// In routes:
<Route path="/themes" element={<ThemeStore />} />
<Route path="/themes/:id/customize" element={<ThemeCustomizer />} />
```

**Step 3: Add sidebar navigation**

In Sidebar.tsx, under "Appearance" group (around line 75), add:
```typescript
{ to: '/themes', icon: Palette, label: t('themes', lang) }
```

**Step 4: Verify page loads and shows theme cards**

**Step 5: Commit**

```bash
git add admin/src/pages/ThemeStore.tsx admin/src/App.tsx admin/src/components/layout/Sidebar.tsx
git commit -m "feat: add Theme Store admin page with theme cards"
```

---

## Task 9: Admin — Theme Customizer Page

**Files:**
- Create: `admin/src/pages/ThemeCustomizer.tsx`

**Step 1: Create ThemeCustomizer.tsx**

Page structure:
```
┌────────────────────┬─────────────────────────────┐
│ ← Back to Themes   │ Theme: Modern               │
├────────────────────┤           [Save] [Reset]     │
│ ▼ Colors           │                              │
│   Primary   [■ #xx]│                              │
│   Secondary [■ #xx]│                              │
│   Background[■ #xx]│                              │
│   Surface   [■ #xx]│                              │
│   Text      [■ #xx]│                              │
│   ... more ...     │                              │
│                    │                              │
│ ▼ Typography       │                              │
│   Body Font [____] │                              │
│   Heading   [____] │                              │
│                    │                              │
│ ▼ Layout           │                              │
│   Header: [standard▼]                             │
│   Sidebar: [right ▼]│                              │
│   Footer: [3-col ▼] │                              │
│   Post Cards: [2▼]  │                              │
│                    │                              │
│ ▼ Navigation       │                              │
│   Style: [default▼] │                              │
│                    │                              │
│ ▼ Custom CSS       │                              │
│   [textarea]       │                              │
└────────────────────┘                              │
```

Features:
- Load theme data from `GET /api/themes/:id`
- Load site overrides from `GET /api/themes/active`
- Accordion sections: Colors, Typography, Layout, Navigation, Custom CSS
- Reuse ColorField component from existing ThemeSettings.tsx
- Save: `PUT /api/themes/:id/overrides` (saves to site_themes.custom_overrides)
- Reset: Clear custom_overrides back to theme defaults
- All existing font options from ThemeSettings.tsx (FONT_OPTIONS array)

**Step 2: Verify customizer loads, saves, and theme updates on public site**

**Step 3: Commit**

```bash
git add admin/src/pages/ThemeCustomizer.tsx
git commit -m "feat: add Theme Customizer with color/font/layout settings"
```

---

## Task 10: Dashboard — Widget System & Visual Refresh

**Files:**
- Modify: `admin/src/pages/Dashboard.tsx` (complete rewrite, lines 86-300)
- Create: `admin/src/components/dashboard/StatCard.tsx`
- Create: `admin/src/components/dashboard/RecentPostsWidget.tsx`
- Create: `admin/src/components/dashboard/RecentCommentsWidget.tsx`
- Create: `admin/src/components/dashboard/QuickActionsWidget.tsx`
- Create: `admin/src/components/dashboard/SiteHealthWidget.tsx`
- Create: `admin/src/components/dashboard/SparklineChart.tsx`

**Step 1: Create SparklineChart component**

SVG sparkline for stat cards — takes an array of numbers, renders a small line chart.

**Step 2: Create enhanced StatCard component**

Modern card with:
- Icon with themed gradient background
- Large number with countUp animation (keep existing useCountUp hook)
- Sparkline chart showing trend
- Subtle hover effect
- Theme-aware accent colors

**Step 3: Create widget components**

Each widget is self-contained:
- `RecentPostsWidget` — Last 5 posts with status badges, animated list
- `RecentCommentsWidget` — Last 5 comments with author avatar, truncated text
- `QuickActionsWidget` — New Post, New Page, Upload Media, View Site buttons
- `SiteHealthWidget` — Domain status, SSL, storage usage, post count

**Step 4: Rewrite Dashboard.tsx**

```
┌─────────────────────────────────────────────────────┐
│ Welcome, [name]!                    [site selector] │
├──────────┬──────────┬──────────┬───────────────────┤
│ Posts    │ Pages    │ Comments │ Media              │
│ 142 📈  │ 23 📈   │ 89 📈   │ 567 📈             │
├──────────┴──────────┴──────────┴───────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────┐│
│ │ Quick Actions        │ │ Site Health              ││
│ │ [+ Post] [+ Page]   │ │ Domain: ✓ SSL: ✓        ││
│ │ [Upload] [View Site] │ │ Storage: 45MB/1GB       ││
│ └─────────────────────┘ └─────────────────────────┘│
│ ┌─────────────────────┐ ┌─────────────────────────┐│
│ │ Recent Posts         │ │ Recent Comments          ││
│ │ • Post title...     │ │ • John: Great post...   ││
│ │ • Post title...     │ │ • Jane: Thanks for...   ││
│ └─────────────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

Layout: CSS Grid with `grid-template-columns` responsive. Widget order stored in settings as `dashboard_layout` JSON key.

**Step 5: Verify dashboard loads with all widgets, responsive on mobile**

**Step 6: Commit**

```bash
git add admin/src/pages/Dashboard.tsx admin/src/components/dashboard/
git commit -m "feat: redesign dashboard with widget system and modern cards"
```

---

## Task 11: Update ThemeSettings to Redirect to New System

**Files:**
- Modify: `admin/src/pages/settings/ThemeSettings.tsx`

**Step 1: Add banner at top of ThemeSettings**

Show a banner: "New theme system available! Go to Theme Store for the full experience." with link to `/themes`. Keep existing settings page functional as fallback.

**Step 2: Commit**

```bash
git add admin/src/pages/settings/ThemeSettings.tsx
git commit -m "feat: add banner in old theme settings pointing to new Theme Store"
```

---

## Task 12: Final Cleanup & Deploy

**Files:**
- Verify all routes, middleware, and pages work together

**Step 1: Test full flow**

1. Visit `/admin/themes` — see 8 theme cards
2. Activate "Developer" theme
3. Visit public site — dark theme with monospace fonts
4. Go to `/admin/themes/:id/customize` — change primary color
5. Save — public site reflects new color
6. Visit `/admin` dashboard — new widget layout
7. Test on mobile — responsive

**Step 2: Deploy**

```bash
npm run build && npx wrangler deploy
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete theme system + dashboard redesign"
```

---

## Summary

| Task | Description | Est. |
|------|-------------|------|
| 1 | DB migration (themes + site_themes) | 15 min |
| 2 | 8 theme presets seed data | 30 min |
| 3 | Theme engine (loadActiveTheme, CSS gen) | 30 min |
| 4 | Theme resolver middleware | 15 min |
| 5 | Theme API endpoints (CRUD + activate) | 45 min |
| 6 | UnifiedLayout.tsx (slot-based) | 60 min |
| 7 | Settings → themes migration | 15 min |
| 8 | Theme Store admin page | 45 min |
| 9 | Theme Customizer admin page | 45 min |
| 10 | Dashboard widget system + visual refresh | 60 min |
| 11 | Old settings page redirect banner | 10 min |
| 12 | Final testing + deploy | 20 min |
| **Total** | | **~6 hours** |
