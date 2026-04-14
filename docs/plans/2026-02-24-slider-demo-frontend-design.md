# Hero Slider + Demo Site + Frontend Redesign Design

## 1. Hero Slider Plugin

4th built-in plugin (`hero-slider`). Uses existing plugin system hooks.

### Data Storage

Slides stored in `site_plugins.settings` JSON:

```json
{
  "slides": [
    {
      "id": 1,
      "title": "Title",
      "description": "Description text",
      "buttonText": "Read More",
      "buttonUrl": "/post-slug",
      "imageR2Key": "sites/1/uploads/2026/02/hero1.jpg",
      "order": 0
    }
  ],
  "autoPlay": true,
  "interval": 5000,
  "showDots": true,
  "showArrows": true,
  "height": "500px",
  "overlayOpacity": 0.4
}
```

### Hooks

- `page.bodyStart` - Renders slider HTML on homepage only (checks path === '/' or '/:lang')
- `page.head` - Injects slider CSS
- `page.bodyEnd` - Injects slider JS (autoplay, touch swipe, arrows, dots)

### Plugin Files

- `src/plugins/hero-slider/manifest.json`
- `src/plugins/hero-slider/index.ts`

### Admin UI

- `admin/src/pages/plugins/SliderSettings.tsx` - Slide CRUD with image upload, text editing, drag reorder, preview
- Slide form: title, description, buttonText, buttonUrl, image (from media library)
- General settings: autoPlay toggle, interval slider, height, dots/arrows toggles, overlay opacity

### Slider Features

- CSS-only transitions (transform + opacity)
- Touch/swipe support via JS
- Responsive (full width, configurable height)
- Dark overlay on images for text readability
- Previous/Next arrows
- Dot indicators
- Auto-play with pause on hover

---

## 2. GooeyNav Menu + Frontend Improvements

### Approach

- **Admin panel**: React GooeyNav component at `admin/src/components/bits/GooeyNav.tsx` for preview in theme settings
- **Public site**: Vanilla JS + CSS port of GooeyNav, injected inline in Layout.tsx when `theme_nav_style === 'gooey'`

### New Settings Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `theme_nav_style` | string | `"default"` | Menu style: `default` or `gooey` |
| `theme_nav_gooey_colors` | string (JSON) | `"[1,2,3,1,2,3,1,4]"` | Particle color indices |
| `theme_nav_particle_count` | string | `"15"` | Number of particles |
| `theme_nav_animation_time` | string | `"600"` | Animation duration ms |

### Admin Theme Settings Page

Add "Menu Style" section to existing Theme settings page:
- Radio/select for nav style (default vs gooey)
- When gooey selected, show: particle count slider, animation time slider, color picker

### SSR Changes (Layout.tsx)

When `theme_nav_style === 'gooey'`:
- Render nav with GooeyNav-compatible HTML structure (ul > li > a, effect spans)
- Include GooeyNav CSS in `<style>` block
- Include vanilla JS port in `<script>` at body end

When `theme_nav_style === 'default'`:
- Keep current nav rendering (no changes)

### General Frontend Polish

- Modern card design with subtle shadows and hover lift
- Better typography (larger headings, more spacing)
- Improved footer layout (multi-column)
- Smooth scroll behavior
- Better mobile hamburger menu
- Image lazy loading with fade-in

---

## 3. Demo Site Data

`src/db/seed-demo.sql` populates a full tech blog demo.

### Content Plan

**Posts (6 Turkish + 6 English translations):**
1. Yapay Zeka ile Kod Yazmanin Gelecegi / Future of Coding with AI
2. Bulut Bilisim 2026 Trendleri / Cloud Computing Trends 2026
3. Mobil Uygulama Gelistirmede Yeni Yaklasimlar / New Approaches in Mobile Dev
4. Siber Guvenlik Rehberi / Cybersecurity Guide
5. DevOps ve CI/CD Pipeline / DevOps and CI/CD Pipeline
6. Web3 ve Blockchain Teknolojileri / Web3 and Blockchain Technologies

**Pages:** Hakkimizda/About, Iletisim/Contact

**Categories:** Yapay Zeka, Bulut Bilisim, Mobil, Guvenlik, DevOps, Web3

**Tags:** React, Python, Docker, Kubernetes, ChatGPT, TypeScript, Cloudflare, AWS, Node.js, TensorFlow

**Menus:**
- Primary: Anasayfa, Yapay Zeka, Bulut Bilisim, Mobil, Hakkimizda, Iletisim
- Footer: Gizlilik, Kullanim Sartlari, RSS

**Widgets:**
- sidebar: search, recent_posts, categories, tags
- footer-1: custom_html (about text)
- footer-2: categories list
- footer-3: social_links

**Comments:** 2-3 approved comments per post

**Settings:** Site title "TechPulse", tagline "Teknolojinin Nabzi", theme colors, footer text

**Slider:** 3 hero slides with tech themes

**Active Plugins:** seo-optimizer, social-share, hero-slider

### Media Strategy

Use placeholder image URLs from picsum.photos as featured_image references in post content. R2 uploads not needed for seed data - the seed SQL will create media records pointing to external URLs or we use a special "external_url" field approach.

Actually, since media table requires r2_key and the images serve from R2, we'll skip actual image files in seed. Instead:
- Posts will have `featured_image_id = NULL` in seed
- Post content will reference external placeholder images via `<img src="https://picsum.photos/...">`
- Slider images will use external URLs in settings JSON
- This avoids needing R2 uploads in seed data

---

## Architecture Decisions

1. **No new DB tables** - Slider data in plugin settings JSON. Keeps schema clean.
2. **Vanilla JS for public GooeyNav** - SSR compatible, no React runtime on public site.
3. **Settings-driven nav style** - Admin controls which nav style renders. Easy to add more styles later.
4. **Plugin hook system** - Slider uses existing hooks, no framework changes needed.
5. **External images in demo seed** - Avoids R2 dependency for demo data.
