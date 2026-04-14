# Hero Slider + Demo Site + GooeyNav Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a hero slider plugin, populate a full tech blog demo site, and modernize the public frontend with GooeyNav menu support.

**Architecture:** Hero slider is a 4th built-in plugin using existing hook system (`page.bodyStart` + `page.head` + `page.bodyEnd`). GooeyNav is ported to vanilla JS for SSR and controlled via theme settings. Demo data populates all entity types via seed SQL.

**Tech Stack:** Hono JSX SSR, Cloudflare Workers, D1 SQLite, React admin panel, vanilla JS animations

---

### Task 1: Hero Slider Plugin — Backend

**Files:**
- Create: `src/plugins/hero-slider/manifest.json`
- Create: `src/plugins/hero-slider/index.ts`
- Modify: `src/middleware/pluginHooks.ts` (add import + registration)

**Step 1: Create manifest.json**

Create `src/plugins/hero-slider/manifest.json`:

```json
{
  "slug": "hero-slider",
  "name": "Hero Slider",
  "version": "1.0.0",
  "description": "Full-width hero slider with title, description, and CTA button for homepage",
  "author": "WP-CMS",
  "hooks": ["page.head", "page.bodyStart", "page.bodyEnd"],
  "settings": {
    "slides": {
      "type": "string",
      "default": "[]",
      "label": "Slides",
      "description": "JSON array of slide objects"
    },
    "autoPlay": {
      "type": "boolean",
      "default": true,
      "label": "Auto Play",
      "description": "Automatically cycle through slides"
    },
    "interval": {
      "type": "number",
      "default": 5000,
      "label": "Interval (ms)",
      "description": "Time between slide transitions"
    },
    "showDots": {
      "type": "boolean",
      "default": true,
      "label": "Show Dots",
      "description": "Show dot indicators"
    },
    "showArrows": {
      "type": "boolean",
      "default": true,
      "label": "Show Arrows",
      "description": "Show previous/next arrows"
    },
    "height": {
      "type": "string",
      "default": "500px",
      "label": "Height",
      "description": "Slider height (CSS value)"
    },
    "overlayOpacity": {
      "type": "number",
      "default": 0.4,
      "label": "Overlay Opacity",
      "description": "Dark overlay opacity (0-1)"
    }
  },
  "permissions": ["settings:read"]
}
```

**Step 2: Create plugin index.ts**

Create `src/plugins/hero-slider/index.ts`:

```typescript
import type { Site } from '../../types';

interface Slide {
  id: number;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl: string;
  order: number;
}

function parseSlides(settings: Record<string, any>): Slide[] {
  try {
    const raw = typeof settings.slides === 'string' ? JSON.parse(settings.slides) : settings.slides;
    if (!Array.isArray(raw)) return [];
    return raw.sort((a: Slide, b: Slide) => (a.order || 0) - (b.order || 0));
  } catch {
    return [];
  }
}

export function register(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  settings: Record<string, any>
): void {
  const SLUG = 'hero-slider';
  const slides = parseSlides(settings);
  if (slides.length === 0) return;

  const autoPlay = settings.autoPlay !== false;
  const interval = typeof settings.interval === 'number' ? settings.interval : 5000;
  const showDots = settings.showDots !== false;
  const showArrows = settings.showArrows !== false;
  const height = settings.height || '500px';
  const overlayOpacity = typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity : 0.4;

  // ── Hook: page.head — Inject slider CSS ──
  engine.register(SLUG, 'page.head', (html: string, site: Site): string => {
    return html + `
<style>
.hero-slider{position:relative;width:100%;height:${height};overflow:hidden;margin-bottom:2rem}
.hero-slider .slide{position:absolute;inset:0;opacity:0;transition:opacity 0.8s ease;display:flex;align-items:center;justify-content:center}
.hero-slider .slide.active{opacity:1;z-index:1}
.hero-slider .slide-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.hero-slider .slide-overlay{position:absolute;inset:0;background:rgba(0,0,0,${overlayOpacity})}
.hero-slider .slide-content{position:relative;z-index:2;text-align:center;color:#fff;padding:2rem;max-width:700px}
.hero-slider .slide-content h2{font-size:2.5rem;font-weight:700;margin-bottom:1rem;text-shadow:0 2px 8px rgba(0,0,0,0.3);line-height:1.2}
.hero-slider .slide-content p{font-size:1.15rem;margin-bottom:1.5rem;opacity:0.95;text-shadow:0 1px 4px rgba(0,0,0,0.2)}
.hero-slider .slide-btn{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;border-radius:0.5rem;font-weight:600;font-size:1rem;text-decoration:none;transition:transform 0.2s,box-shadow 0.2s}
.hero-slider .slide-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.3);text-decoration:none}
.hero-slider .slider-dots{position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:3;display:flex;gap:0.5rem}
.hero-slider .dot{width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.5);cursor:pointer;border:none;transition:background 0.3s}
.hero-slider .dot.active{background:#fff}
.hero-slider .slider-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:3;background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:1.5rem;padding:0.75rem 1rem;cursor:pointer;border-radius:0.5rem;transition:background 0.3s;backdrop-filter:blur(4px)}
.hero-slider .slider-arrow:hover{background:rgba(255,255,255,0.4)}
.hero-slider .slider-prev{left:1rem}
.hero-slider .slider-next{right:1rem}
@media(max-width:768px){
  .hero-slider{height:350px}
  .hero-slider .slide-content h2{font-size:1.5rem}
  .hero-slider .slide-content p{font-size:0.95rem}
  .hero-slider .slider-arrow{display:none}
}
</style>`;
  }, 5);

  // ── Hook: page.bodyStart — Inject slider HTML (only on homepage) ──
  engine.register(SLUG, 'page.bodyStart', (html: string, site: Site): string => {
    const slidesHtml = slides.map((s, i) => `
  <div class="slide${i === 0 ? ' active' : ''}" data-index="${i}">
    <div class="slide-bg" style="background-image:url('${s.imageUrl}')"></div>
    <div class="slide-overlay"></div>
    <div class="slide-content">
      <h2>${s.title}</h2>
      <p>${s.description}</p>
      ${s.buttonText ? `<a href="${s.buttonUrl}" class="slide-btn">${s.buttonText}</a>` : ''}
    </div>
  </div>`).join('');

    const dotsHtml = showDots ? `
  <div class="slider-dots">
    ${slides.map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`).join('')}
  </div>` : '';

    const arrowsHtml = showArrows && slides.length > 1 ? `
  <button class="slider-arrow slider-prev">&#10094;</button>
  <button class="slider-arrow slider-next">&#10095;</button>` : '';

    return html + `
<div class="hero-slider" data-autoplay="${autoPlay}" data-interval="${interval}">
  ${slidesHtml}
  ${dotsHtml}
  ${arrowsHtml}
</div>`;
  }, 5);

  // ── Hook: page.bodyEnd — Inject slider JS ──
  engine.register(SLUG, 'page.bodyEnd', (html: string, site: Site): string => {
    if (slides.length <= 1) return html;
    return html + `
<script>
(function(){
  var s=document.querySelector('.hero-slider');
  if(!s)return;
  var slides=s.querySelectorAll('.slide'),dots=s.querySelectorAll('.dot'),cur=0,total=slides.length,timer=null;
  function go(n){
    slides[cur].classList.remove('active');
    if(dots[cur])dots[cur].classList.remove('active');
    cur=(n+total)%total;
    slides[cur].classList.add('active');
    if(dots[cur])dots[cur].classList.add('active');
  }
  var prev=s.querySelector('.slider-prev'),next=s.querySelector('.slider-next');
  if(prev)prev.onclick=function(){go(cur-1);reset()};
  if(next)next.onclick=function(){go(cur+1);reset()};
  dots.forEach(function(d,i){d.onclick=function(){go(i);reset()}});
  function reset(){clearInterval(timer);if(s.dataset.autoplay==='true')timer=setInterval(function(){go(cur+1)},parseInt(s.dataset.interval||5000))}
  if(s.dataset.autoplay==='true')timer=setInterval(function(){go(cur+1)},parseInt(s.dataset.interval||5000));
  s.addEventListener('mouseenter',function(){clearInterval(timer)});
  s.addEventListener('mouseleave',function(){reset()});
  var tx=0;s.addEventListener('touchstart',function(e){tx=e.touches[0].clientX},{passive:true});
  s.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>50){dx>0?go(cur-1):go(cur+1);reset()}},{passive:true});
})();
</script>`;
  }, 5);
}
```

**Step 3: Register plugin in middleware**

Modify `src/middleware/pluginHooks.ts`:

Add import at line 8 (after contactForm import):
```typescript
import * as heroSlider from '../plugins/hero-slider/index';
```

Add registration at line 30 (after contactForm registration):
```typescript
registerBuiltinPlugin('plugins/hero-slider', heroSlider);
```

**Step 4: Add plugin hooks to home route**

Modify `src/routes/public/home.tsx` — the `renderHome` function needs to pass plugin hooks to Layout.

Add import at top:
```typescript
import { pluginEngine } from '../../lib/plugins/engine';
```

After line 39 (after postsWithTax), add:
```typescript
  // Execute plugin hooks for page rendering
  const [pluginHead, pluginBodyStart, pluginBodyEnd] = await Promise.all([
    pluginEngine.executeFilter('page.head', '', site),
    pluginEngine.executeFilter('page.bodyStart', '', site),
    pluginEngine.executeFilter('page.bodyEnd', '', site),
  ]);
```

Modify the Layout call (line 47) to include plugin props:
```tsx
    <Layout siteName={site.name} siteTagline={theme.site_tagline} theme={theme} lang={lang} defaultLang={defaultLang} navItems={navItems}
      pluginHead={pluginHead} pluginBodyStart={pluginBodyStart} pluginBodyEnd={pluginBodyEnd}
      head={...}
    >
```

**Step 5: Commit**

```bash
git add src/plugins/hero-slider/ src/middleware/pluginHooks.ts src/routes/public/home.tsx
git commit -m "feat: add hero-slider plugin with CSS transitions, autoplay, touch support"
```

---

### Task 2: Hero Slider Admin UI — Custom Settings Page

**Files:**
- Create: `admin/src/pages/plugins/SliderSettings.tsx`
- Modify: `admin/src/App.tsx` (add route)
- Modify: `admin/src/pages/plugins/PluginSettings.tsx` (redirect for hero-slider)

**Step 1: Create SliderSettings.tsx**

Create `admin/src/pages/plugins/SliderSettings.tsx` — a dedicated admin page for managing slides with image upload, text editing, and drag reorder.

This component should:
- Load plugin settings from `/api/plugins/{id}/settings`
- Parse slides from settings JSON
- Render a list of slide cards with: image preview, title input, description textarea, buttonText input, buttonUrl input, imageUrl input
- Add Slide button, Delete slide button, reorder drag
- Save button that PUTs the updated settings JSON
- General settings section: autoPlay toggle, interval slider, height input, showDots toggle, showArrows toggle, overlayOpacity slider

**Step 2: Add route to App.tsx**

Add import:
```typescript
import { SliderSettings } from '@/pages/plugins/SliderSettings';
```

Add route after line 91 (after plugins/:id/settings):
```tsx
<Route path="plugins/hero-slider" element={<SliderSettings />} />
```

**Step 3: Redirect from generic PluginSettings**

In `admin/src/pages/plugins/PluginSettings.tsx`, at the top of the component (after id parsing), add:
```typescript
const navigate = useNavigate();
// Redirect hero-slider to custom settings page
useEffect(() => {
  if (plugin?.slug === 'hero-slider') {
    navigate('/plugins/hero-slider', { replace: true });
  }
}, [plugin?.slug]);
```

**Step 4: Commit**

```bash
git add admin/src/pages/plugins/SliderSettings.tsx admin/src/App.tsx admin/src/pages/plugins/PluginSettings.tsx
git commit -m "feat: add hero slider admin settings page with slide management"
```

---

### Task 3: GooeyNav — Vanilla JS Port for SSR

**Files:**
- Modify: `src/components/Layout.tsx` (add GooeyNav CSS + JS + HTML when theme_nav_style is gooey)
- Modify: `src/lib/public-db.ts` (add nav_style to SiteTheme interface + query)

**Step 1: Update SiteTheme to include nav settings**

In `src/lib/public-db.ts`, update the `SiteTheme` interface (around line 4):

Add fields:
```typescript
  nav_style: string;
  nav_particle_count: number;
  nav_animation_time: number;
```

Update `defaultTheme` (around line 46):
```typescript
  nav_style: 'default',
  nav_particle_count: 15,
  nav_animation_time: 600,
```

Update `getSiteTheme` function to load these from settings.

**Step 2: Update Layout.tsx for GooeyNav**

In `src/components/Layout.tsx`, modify the `<nav>` section (lines 133-140):

When `theme.nav_style === 'gooey'`, render GooeyNav HTML structure instead of default nav.

Add GooeyNav CSS in the `<style>` block (the CSS from the React Bits component, adapted).

Add GooeyNav vanilla JS at body end (ported from the React component logic).

Default nav remains unchanged when nav_style is 'default'.

**Step 3: Commit**

```bash
git add src/components/Layout.tsx src/lib/public-db.ts
git commit -m "feat: add GooeyNav vanilla JS port for public site menu"
```

---

### Task 4: Theme Settings — Nav Style Config in Admin

**Files:**
- Create: `admin/src/pages/settings/ThemeSettings.tsx`
- Modify: `admin/src/App.tsx` (add route)
- Modify: `admin/src/components/layout/Sidebar.tsx` (add Tema link under Gorunum)

**Step 1: Create ThemeSettings page**

Create `admin/src/pages/settings/ThemeSettings.tsx`:

Sections:
- **Colors**: Primary color picker
- **Typography**: Font family selector
- **Logo**: Logo URL input
- **Menu Style**: Radio group (Default / Gooey Nav)
  - When Gooey selected: particle count slider, animation time slider
- **Footer**: Footer text textarea

Loads from `GET /api/settings/theme`, saves to `PUT /api/settings/theme`.

**Step 2: Add route**

In `admin/src/App.tsx`, add:
```typescript
import { ThemeSettings } from '@/pages/settings/ThemeSettings';
```

```tsx
<Route path="appearance/theme" element={<ThemeSettings />} />
```

**Step 3: Add to Sidebar**

In `admin/src/components/layout/Sidebar.tsx`, add "Tema" link under the Görünüm accordion group, pointing to `/appearance/theme`.

**Step 4: Commit**

```bash
git add admin/src/pages/settings/ThemeSettings.tsx admin/src/App.tsx admin/src/components/layout/Sidebar.tsx
git commit -m "feat: add theme settings page with GooeyNav config"
```

---

### Task 5: Frontend Polish — Layout.tsx Improvements

**Files:**
- Modify: `src/components/Layout.tsx` (modernize CSS)
- Modify: `src/components/PostCard.tsx` (better card design)
- Modify: `src/components/Pagination.tsx` (polish)

**Step 1: Update Layout.tsx CSS**

Modernize the embedded CSS:
- Better card shadows with hover lift (`transform: translateY(-2px)`)
- Improved typography (larger h1, better line-height)
- Multi-column footer
- Smooth scroll (`scroll-behavior: smooth`)
- Mobile hamburger menu (hidden on desktop, toggle on mobile)
- Image fade-in on load
- Better spacing between sections
- Gradient accent line under header

**Step 2: Update PostCard.tsx**

- Add subtle shadow + hover lift transition
- Better featured image handling
- Author avatar placeholder
- Category badges with colors
- Better date formatting

**Step 3: Commit**

```bash
git add src/components/Layout.tsx src/components/PostCard.tsx src/components/Pagination.tsx
git commit -m "feat: modernize public site CSS with better cards, typography, mobile menu"
```

---

### Task 6: Demo Seed Data

**Files:**
- Create: `src/db/seed-demo.sql`

**Step 1: Write comprehensive seed SQL**

Create `src/db/seed-demo.sql` that inserts:

1. **Site settings** — Update site name to "TechPulse", tagline "Teknolojinin Nabzi", theme colors, nav_style gooey, footer text
2. **Categories (10)** — TR: Yapay Zeka, Bulut Bilisim, Mobil, Siber Guvenlik, DevOps, Web3. EN translations.
3. **Tags (12)** — React, Python, Docker, Kubernetes, ChatGPT, TypeScript, Cloudflare, AWS, Node.js, TensorFlow, Rust, Go
4. **Posts (6 TR + 6 EN)** — Full HTML content (3-4 paragraphs each) with categories and tags assigned. Status: published, with published_at dates spread across last month.
5. **Pages (2 TR + 2 EN)** — Hakkimizda/About, Iletisim/Contact
6. **Menus** — Primary menu with category links + pages. Footer menu.
7. **Menu Items** — 6-8 items per menu
8. **Widgets** — sidebar: search, recent_posts, categories, tags. footer areas: about text, categories, social links
9. **Comments** — 2-3 approved comments per post (18+ comments)
10. **Hero Slider plugin** — Register in plugins table, activate for site, settings with 3 slides using picsum.photos URLs
11. **Plugin activations** — SEO Optimizer active, Social Share active, Hero Slider active
12. **Post-taxonomy relationships** — Each post gets 1-2 categories and 2-3 tags

All text content in Turkish for TR posts, English for EN posts. Translation groups link TR↔EN pairs.

**Step 2: Commit**

```bash
git add src/db/seed-demo.sql
git commit -m "feat: add comprehensive demo seed data for tech blog"
```

---

### Task 7: Plugin Hooks in Post/Archive Routes

**Files:**
- Modify: `src/routes/public/post.tsx` (ensure plugin hooks pass to Layout)
- Modify: `src/routes/public/archive.tsx` (add plugin hooks)
- Modify: `src/routes/public/search.tsx` (add plugin hooks)

**Step 1: Verify post.tsx has plugin hooks**

Check that `post.tsx` already passes `pluginHead`, `pluginBodyStart`, `pluginBodyEnd` to Layout. If not, add them following the same pattern as Task 1 Step 4.

**Step 2: Add plugin hooks to archive.tsx and search.tsx**

Same pattern: import pluginEngine, execute filters, pass to Layout.

Note: The slider should only render on homepage. In `hero-slider/index.ts`, the `page.bodyStart` hook always renders. We should add a mechanism to only show on homepage. Options:
- Check `site` object for current path (not available in hook)
- Add a flag via Layout props
- Simplest: Accept slider shows on all pages (it's above content, looks fine)
- Best: In Layout, only pass `pluginBodyStart` on homepage (controlled by a new `isHomepage` prop)

Add `isHomepage?: boolean` prop to Layout. Only render `pluginBodyStart` when `isHomepage` is true. Home route passes `isHomepage={true}`, other routes don't.

**Step 3: Commit**

```bash
git add src/routes/public/post.tsx src/routes/public/archive.tsx src/routes/public/search.tsx src/components/Layout.tsx
git commit -m "feat: add plugin hooks to all public routes, slider only on homepage"
```

---

### Task 8: Build, Deploy & Test

**Files:** None (build/deploy only)

**Step 1: Build admin panel**

```bash
cd admin && npm run build
```

Expected: Build succeeds, produces dist/

**Step 2: Apply demo seed data**

```bash
CLOUDFLARE_API_TOKEN=$(cat ~/.wrangler-token) npx wrangler d1 execute cms-db --file=src/db/seed-demo.sql
```

**Step 3: Deploy**

```bash
CLOUDFLARE_API_TOKEN=$(cat ~/.wrangler-token) npx wrangler deploy
```

Expected: Deploy succeeds to https://wp-cms.violently.workers.dev

**Step 4: Verify**

- Visit public site (abc.smaille.com) — should see hero slider + GooeyNav + demo posts
- Visit admin panel — should see demo content in all sections
- Check slider autoplay, arrows, dots, touch
- Check GooeyNav particle animation
- Check responsive on mobile viewport

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: post-deploy adjustments"
```
