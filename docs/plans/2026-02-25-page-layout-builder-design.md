# Page Layout Builder Design

**Date**: 2026-02-25
**Status**: Approved
**Approach**: Row-Column JSON Layout system

## Overview

Add a visual page layout builder to the PostEditor sidebar. Users select a preset template or build a custom layout of rows and columns, then assign shortcodes to each cell. The layout is stored as JSON in `post_meta` and rendered server-side into CSS Flexbox HTML.

## Data Model

### Layout JSON (stored in `post_meta` as `page_layout`)

```json
{
  "rows": [
    {
      "id": "r1",
      "columns": [
        { "width": 100, "shortcode": "slider", "params": {} }
      ]
    },
    {
      "id": "r2",
      "columns": [
        { "width": 70, "shortcode": "son-yazilar", "params": { "adet": "5" } },
        { "width": 30, "shortcode": "widget", "params": { "alan": "sidebar-1" } }
      ]
    }
  ]
}
```

- `rows[]` — ordered array of rows
- `rows[].id` — unique row identifier (for React keys)
- `rows[].columns[]` — ordered array of columns within the row
- `columns[].width` — percentage width (all columns in a row must sum to 100)
- `columns[].shortcode` — shortcode name (from existing shortcode definitions)
- `columns[].params` — key-value params passed to the shortcode

### Storage

- Stored in existing `post_meta` table: `key = 'page_layout'`, `value = JSON string`
- When layout is null/empty, the post renders using the normal `content` field (backward compatible)
- When layout exists, the layout is rendered; the `[icerik]` shortcode embeds the editor content within the layout

## Admin UI

### PostEditor Sidebar — "Sayfa Duzeni" Card

Added to the right sidebar of PostEditor.tsx, below the existing cards.

**3 modes:**
1. **Duzen yok (varsayilan)** — No layout, just the editor content (current behavior)
2. **Hazir Sablon** — Select from preset templates
3. **Ozel Duzen** — Build custom row/column layout

### Preset Templates

| Template | Structure |
|----------|-----------|
| Blog | Single full-width row |
| 2-Sutun (Icerik + Sidebar) | %70 + %30 |
| 3-Sutun | %20 + %60 + %20 |
| Slider + 2-Sutun | Row1: %100 slider, Row2: %70 + %30 |
| Landing | Row1: %100 slider, Row2: %60 + %20 + %20, Row3: %25 x 4 |

### Layout Editor UI

After selecting a template or "Ozel Duzen":

- Each row displayed as a horizontal bar with columns shown proportionally
- Each column has a dropdown to select shortcode + optional param inputs
- Rows can be deleted with [x] button
- "+ Satir Ekle" button at the bottom opens a row creation dialog

### Row Creation Dialog

- Column count selector: [1] [2] [3] [4]
- Width inputs for each column (must sum to 100)
- Preset ratio buttons: [50/50] [70/30] [30/70] [33/33/33] [25/50/25] [25/25/25/25]
- "Ekle" button to add the row

## Frontend Rendering

### processLayout() function

Located in `src/lib/layout.ts`. Takes the layout JSON + ShortcodeContext and produces HTML:

```html
<div class="wp-layout">
  <div class="wp-row">
    <div class="wp-col" style="flex:0 0 100%">
      <!-- rendered [slider] output -->
    </div>
  </div>
  <div class="wp-row">
    <div class="wp-col" style="flex:0 0 70%">
      <!-- rendered [son-yazilar adet="5"] output -->
    </div>
    <div class="wp-col" style="flex:0 0 30%">
      <!-- rendered [widget alan="sidebar-1"] output -->
    </div>
  </div>
</div>
```

### CSS

```css
.wp-layout { max-width: 1200px; margin: 0 auto; }
.wp-row { display: flex; gap: 20px; margin-bottom: 20px; }
.wp-col { min-width: 0; }
@media (max-width: 768px) {
  .wp-row { flex-direction: column; }
  .wp-col { flex: 0 0 100% !important; }
}
```

### Rendering Pipeline

1. Post fetched from DB
2. Check `post_meta` for `page_layout` key
3. If layout exists: `processLayout(layoutJSON, shortcodeContext)` → HTML
4. Special `[icerik]` shortcode within layout → injects the post's `content` field
5. If no layout: render `content` field directly (existing behavior)

## API Changes

### Posts API (existing endpoints, enhanced)

- `GET /api/posts/:id` — already returns `meta` object, layout comes via `meta.page_layout`
- `PUT /api/posts/:id` — already accepts `meta` object, layout saved via `meta.page_layout`

No new API endpoints needed.

## Files to Create/Modify

### New Files
- `admin/src/components/editor/LayoutBuilder.tsx` — main layout builder sidebar component
- `admin/src/components/editor/LayoutPresets.ts` — preset template definitions
- `src/lib/layout.ts` — server-side layout processor (JSON → HTML)

### Modified Files
- `admin/src/pages/posts/PostEditor.tsx` — add LayoutBuilder to sidebar
- `src/routes/public/home.tsx` — integrate layout rendering
- `src/routes/public/post.tsx` — integrate layout rendering
- `src/components/Layout.tsx` — add `.wp-row` / `.wp-col` CSS
- `src/lib/shortcodes/index.ts` — add `[icerik]` shortcode renderer

## Scope Exclusions

- No drag-and-drop (can be added later)
- No live preview in admin (layout is configured, preview by visiting the page)
- No nested layouts (rows contain columns, columns contain shortcodes — no deeper nesting)
- BlockNote integration not needed (layout is independent of editor choice)
