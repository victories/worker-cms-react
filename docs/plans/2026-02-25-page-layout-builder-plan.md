# Page Layout Builder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a row/column layout builder to the PostEditor sidebar so users can design page structures with preset templates or custom layouts, assigning shortcodes to each cell.

**Architecture:** Layout data stored as JSON in `post_meta` (`page_layout` key). Admin-side React component in the PostEditor sidebar lets users pick templates or build custom row/column grids. Server-side `processLayout()` renders the JSON into Flexbox HTML with shortcode output at request time.

**Tech Stack:** React + Tailwind (admin), Hono JSX + D1 (backend), existing shortcode renderer system

---

### Task 1: Layout Preset Definitions

**Files:**
- Create: `admin/src/components/editor/LayoutPresets.ts`

**Step 1: Create the preset file with types and templates**

```typescript
// admin/src/components/editor/LayoutPresets.ts

export interface LayoutColumn {
  width: number;
  shortcode: string;
  params: Record<string, string>;
}

export interface LayoutRow {
  id: string;
  columns: LayoutColumn[];
}

export interface PageLayout {
  rows: LayoutRow[];
}

export interface LayoutPreset {
  id: string;
  name: string;
  nameEn: string;
  icon: string; // ASCII art mini-preview
  layout: PageLayout;
}

let _rowCounter = 0;
export function generateRowId(): string {
  return `r${Date.now()}_${++_rowCounter}`;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'blog',
    name: 'Blog',
    nameEn: 'Blog',
    icon: '█████',
    layout: {
      rows: [
        { id: 'r1', columns: [{ width: 100, shortcode: '', params: {} }] },
      ],
    },
  },
  {
    id: '2-col',
    name: '2 Sutun (Icerik + Sidebar)',
    nameEn: '2 Column (Content + Sidebar)',
    icon: '██ █',
    layout: {
      rows: [
        {
          id: 'r1',
          columns: [
            { width: 70, shortcode: '', params: {} },
            { width: 30, shortcode: '', params: {} },
          ],
        },
      ],
    },
  },
  {
    id: '3-col',
    name: '3 Sutun',
    nameEn: '3 Column',
    icon: '█ ██ █',
    layout: {
      rows: [
        {
          id: 'r1',
          columns: [
            { width: 20, shortcode: '', params: {} },
            { width: 60, shortcode: '', params: {} },
            { width: 20, shortcode: '', params: {} },
          ],
        },
      ],
    },
  },
  {
    id: 'slider-2col',
    name: 'Slider + 2 Sutun',
    nameEn: 'Slider + 2 Column',
    icon: '█████\n██ █',
    layout: {
      rows: [
        { id: 'r1', columns: [{ width: 100, shortcode: 'slider', params: {} }] },
        {
          id: 'r2',
          columns: [
            { width: 70, shortcode: '', params: {} },
            { width: 30, shortcode: '', params: {} },
          ],
        },
      ],
    },
  },
  {
    id: 'landing',
    name: 'Landing',
    nameEn: 'Landing Page',
    icon: '█████\n█ ██ █\n████',
    layout: {
      rows: [
        { id: 'r1', columns: [{ width: 100, shortcode: 'slider', params: {} }] },
        {
          id: 'r2',
          columns: [
            { width: 60, shortcode: '', params: {} },
            { width: 20, shortcode: '', params: {} },
            { width: 20, shortcode: '', params: {} },
          ],
        },
        {
          id: 'r3',
          columns: [
            { width: 25, shortcode: '', params: {} },
            { width: 25, shortcode: '', params: {} },
            { width: 25, shortcode: '', params: {} },
            { width: 25, shortcode: '', params: {} },
          ],
        },
      ],
    },
  },
];

export const WIDTH_PRESETS: Record<number, number[][]> = {
  1: [[100]],
  2: [[50, 50], [70, 30], [30, 70], [60, 40], [40, 60]],
  3: [[33, 34, 33], [25, 50, 25], [20, 60, 20], [50, 25, 25]],
  4: [[25, 25, 25, 25], [40, 20, 20, 20], [20, 20, 20, 40]],
};
```

**Step 2: Commit**

```bash
git add admin/src/components/editor/LayoutPresets.ts
git commit -m "feat: add layout preset definitions for page builder"
```

---

### Task 2: LayoutBuilder Admin Component

**Files:**
- Create: `admin/src/components/editor/LayoutBuilder.tsx`

**Step 1: Create the LayoutBuilder component**

This is the main sidebar component. It renders inside the PostEditor sidebar. It has three modes: no layout, preset template, custom layout. When a layout is active, it shows the row/column grid with shortcode selectors.

Key behaviors:
- Receives `layout: PageLayout | null` and `onLayoutChange: (layout: PageLayout | null) => void` props
- Also receives `lang: string` for TR/EN labels
- Mode selector: radio buttons for "none", "preset", "custom"
- Preset mode: grid of clickable preset cards, then shows the row editor
- Custom mode: starts empty, shows "+ Satir Ekle" button
- Row editor: each row shows columns proportionally with shortcode dropdowns
- Each column has a `<Select>` dropdown populated from `SHORTCODE_DEFINITIONS`
- When a shortcode with params is selected, shows small param inputs below
- Rows can be removed with X button
- Add Row dialog: column count buttons (1-4), width preset buttons, "Ekle" button

The component should:
- Import `SHORTCODE_DEFINITIONS` from `blocks/shortcodeDefinitions.ts`
- Import `LAYOUT_PRESETS`, `WIDTH_PRESETS`, `generateRowId`, types from `LayoutPresets.ts`
- Use shadcn `Card`, `Select`, `Button`, `Input`, `Label` components
- Use `LayoutGrid`, `Plus`, `X`, `Columns` icons from lucide-react

The full component code should be written as a single file. Approximately 300-400 lines.

Key UI sections:
1. Mode radio selector (no layout / preset / custom)
2. Preset grid (only when mode = "preset")
3. Row list with column shortcode selectors (when layout exists)
4. Add Row dialog with column count + width presets (collapsible section)

**Step 2: Commit**

```bash
git add admin/src/components/editor/LayoutBuilder.tsx
git commit -m "feat: add LayoutBuilder sidebar component for page layouts"
```

---

### Task 3: Integrate LayoutBuilder into PostEditor

**Files:**
- Modify: `admin/src/pages/posts/PostEditor.tsx`

**Step 1: Add layout state and load/save logic**

In `PostEditor.tsx`, add:
- `const [pageLayout, setPageLayout] = useState<PageLayout | null>(null);`
- Import `LayoutBuilder` and `PageLayout` type
- In `loadPost()`: extract `page_layout` from `res.data.meta` and parse JSON → `setPageLayout()`
- In `handleSave()`: include `meta: { page_layout: pageLayout ? JSON.stringify(pageLayout) : '' }` in the save data

**Step 2: Add LayoutBuilder card to sidebar**

In the right sidebar `<div className="space-y-4">`, add after the AMP card (before the categories card):

```tsx
<LayoutBuilder
  layout={pageLayout}
  onLayoutChange={setPageLayout}
  lang={lang}
/>
```

**Step 3: Commit**

```bash
git add admin/src/pages/posts/PostEditor.tsx
git commit -m "feat: integrate layout builder into post editor sidebar"
```

---

### Task 4: Server-Side Layout Processor

**Files:**
- Create: `src/lib/layout.ts`

**Step 1: Create processLayout function**

```typescript
// src/lib/layout.ts
import { processAllShortcodes, ShortcodeContext } from './shortcodes/index';

interface LayoutColumn {
  width: number;
  shortcode: string;
  params: Record<string, string>;
}

interface LayoutRow {
  id: string;
  columns: LayoutColumn[];
}

interface PageLayout {
  rows: LayoutRow[];
}

/**
 * Render a page layout JSON into HTML.
 * Each shortcode in each column is processed through the shortcode system.
 * The special shortcode name "icerik" is replaced with postContent.
 */
export async function processLayout(
  layout: PageLayout,
  ctx: ShortcodeContext,
  postContent: string
): Promise<string> {
  if (!layout || !layout.rows || layout.rows.length === 0) {
    return postContent;
  }

  const rowsHtml: string[] = [];

  for (const row of layout.rows) {
    const colsHtml: string[] = [];

    for (const col of row.columns) {
      let cellHtml = '';

      if (col.shortcode === 'icerik') {
        // Special: embed the post editor content
        cellHtml = postContent;
      } else if (col.shortcode) {
        // Build shortcode text: [name param1="val1" param2="val2"]
        const paramStr = Object.entries(col.params || {})
          .filter(([, v]) => v !== '' && v !== undefined)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        const scText = paramStr
          ? `[${col.shortcode} ${paramStr}]`
          : `[${col.shortcode}]`;

        cellHtml = await processAllShortcodes(scText, ctx);
      }

      // flex-basis uses calc to account for gap
      const colCount = row.columns.length;
      const gapTotal = (colCount - 1) * 20; // 20px gap between columns
      const basisCalc = colCount > 1
        ? `calc(${col.width}% - ${(gapTotal * col.width) / 100}px)`
        : '100%';

      colsHtml.push(
        `<div class="wp-col" style="flex:0 0 ${basisCalc};min-width:0">${cellHtml}</div>`
      );
    }

    rowsHtml.push(`<div class="wp-row">${colsHtml.join('')}</div>`);
  }

  return `<div class="wp-layout">${rowsHtml.join('')}</div>`;
}
```

**Step 2: Commit**

```bash
git add src/lib/layout.ts
git commit -m "feat: add server-side layout processor (JSON to HTML)"
```

---

### Task 5: Add Layout CSS to Frontend

**Files:**
- Modify: `src/components/Layout.tsx`

**Step 1: Add wp-layout CSS rules**

In `Layout.tsx`, find the `<style>` tag and add these CSS rules after the `.container` rules (around line 169):

```css
/* --- Page Layout Builder --- */
.wp-layout{max-width:1200px;margin:0 auto;padding:1rem 0}
.wp-row{display:flex;gap:20px;margin-bottom:20px}
.wp-row:last-child{margin-bottom:0}
.wp-col{min-width:0}
.wp-col:empty{display:none}
@media(max-width:768px){.wp-row{flex-direction:column;gap:1rem}.wp-col{flex:0 0 100%!important}}
```

**Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add CSS for page layout builder rows and columns"
```

---

### Task 6: Add Post Meta Fetching to Public Routes

**Files:**
- Modify: `src/lib/public-db.ts` — add `getPostMeta()` function
- Modify: `src/routes/public/post.tsx` — use layout in rendering
- Modify: `src/routes/public/home.tsx` — use layout for static homepage

**Step 1: Add getPostMeta to public-db.ts**

Add this function to `src/lib/public-db.ts`:

```typescript
export async function getPostMeta(
  db: D1Database,
  postId: number,
  key: string
): Promise<string | null> {
  const result = await db.prepare(
    'SELECT meta_value FROM post_meta WHERE post_id = ? AND meta_key = ?'
  ).bind(postId, key).first<{ meta_value: string }>();
  return result?.meta_value || null;
}
```

**Step 2: Integrate layout rendering in post.tsx**

In `src/routes/public/post.tsx` `renderPost()` function:

1. Add imports at top:
```typescript
import { processLayout } from '../../lib/layout';
import { getPostMeta } from '../../lib/public-db';
import { processAllShortcodes, ShortcodeContext } from '../../lib/shortcodes/index';
```

2. After fetching the post (line ~50), fetch layout meta:
```typescript
const layoutJson = await getPostMeta(c.env.DB, p.id, 'page_layout');
```

3. Replace the simple `renderedContent` logic. Where currently:
```typescript
const renderedContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
```

Change to:
```typescript
let renderedContent: string;
if (layoutJson) {
  try {
    const layout = JSON.parse(layoutJson);
    const scCtx: ShortcodeContext = {
      db: c.env.DB, siteId, lang, defaultLang,
      origin: baseUrl.origin, langPrefix: lp,
    };
    const postContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
    renderedContent = await processLayout(layout, scCtx, postContent);
  } catch {
    renderedContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
  }
} else {
  renderedContent = await pluginEngine.executeFilter('post.beforeRender', p.content || '', p);
}
```

4. Also need to process shortcodes in non-layout content (currently post.tsx doesn't process shortcodes at all — only home.tsx does). Add shortcode processing for non-layout posts too:
```typescript
// After the renderedContent block above:
if (!layoutJson) {
  const scCtx: ShortcodeContext = {
    db: c.env.DB, siteId, lang, defaultLang,
    origin: baseUrl.origin, langPrefix: lp,
  };
  renderedContent = await processAllShortcodes(renderedContent, scCtx);
}
```

**Step 3: Integrate layout rendering in home.tsx**

In `src/routes/public/home.tsx`, in the static homepage section (around line 46):

1. Add imports:
```typescript
import { processLayout } from '../../lib/layout';
import { getPostMeta } from '../../lib/public-db';
```

2. After `const staticPage = await getPageById(...)`, add layout fetch:
```typescript
const layoutJson = staticPage ? await getPostMeta(c.env.DB, staticPage.id, 'page_layout') : null;
```

3. Replace the content rendering block. Where currently:
```typescript
let renderedContent = await processAllShortcodes(staticPage.content, scCtx);
renderedContent = await pluginEngine.executeFilter('post.beforeRender', renderedContent);
```

Change to:
```typescript
let renderedContent: string;
if (layoutJson) {
  try {
    const layout = JSON.parse(layoutJson);
    const postContent = await processAllShortcodes(staticPage.content || '', scCtx);
    const filteredContent = await pluginEngine.executeFilter('post.beforeRender', postContent);
    renderedContent = await processLayout(layout, scCtx, filteredContent);
  } catch {
    let rc = await processAllShortcodes(staticPage.content, scCtx);
    renderedContent = await pluginEngine.executeFilter('post.beforeRender', rc);
  }
} else {
  let rc = await processAllShortcodes(staticPage.content, scCtx);
  renderedContent = await pluginEngine.executeFilter('post.beforeRender', rc);
}
```

**Step 4: Commit**

```bash
git add src/lib/public-db.ts src/routes/public/post.tsx src/routes/public/home.tsx
git commit -m "feat: integrate layout rendering into public post and home routes"
```

---

### Task 7: Fix Post Meta Save/Load in API

**Files:**
- Modify: `src/routes/api/posts.ts`

**Step 1: Fix meta update to be additive (not destructive)**

Current code in PUT handler (line ~260-266) deletes ALL meta then re-inserts. This is destructive for other meta keys. Change to upsert pattern:

Replace:
```typescript
if (body.meta) {
  await c.env.DB.prepare('DELETE FROM post_meta WHERE post_id = ?').bind(id).run();
  for (const [key, value] of Object.entries(body.meta)) {
    await c.env.DB.prepare('INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?)')
      .bind(id, key, value).run();
  }
}
```

With:
```typescript
if (body.meta) {
  for (const [key, value] of Object.entries(body.meta)) {
    if (value === '' || value === null || value === undefined) {
      // Remove meta key if empty
      await c.env.DB.prepare('DELETE FROM post_meta WHERE post_id = ? AND meta_key = ?')
        .bind(id, key).run();
    } else {
      await c.env.DB.prepare(
        'INSERT INTO post_meta (post_id, meta_key, meta_value) VALUES (?, ?, ?) ON CONFLICT(post_id, meta_key) DO UPDATE SET meta_value = ?'
      ).bind(id, key, value, value).run();
    }
  }
}
```

Note: Check if `post_meta` has a UNIQUE constraint on `(post_id, meta_key)`. If not, we need to add it. Check `src/db/schema.sql` for the constraint. If missing, use DELETE+INSERT pattern instead of ON CONFLICT.

**Step 2: Commit**

```bash
git add src/routes/api/posts.ts
git commit -m "fix: use upsert pattern for post meta updates (non-destructive)"
```

---

### Task 8: Build, Deploy, Test

**Step 1: Build admin panel**

```bash
cd admin && npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Deploy**

```bash
cd .. && npx wrangler deploy
```

Expected: Deploy succeeds.

**Step 3: Manual verification checklist**

1. Open PostEditor for a page — verify "Sayfa Duzeni" card appears in sidebar
2. Select "Hazir Sablon" → pick "Slider + 2 Sutun" → verify rows appear
3. Assign shortcodes to columns via dropdowns
4. Save the page
5. Re-open the page → verify layout persists
6. Visit the page on frontend → verify layout renders with shortcode output
7. Switch to "Duzen yok" → save → verify page shows normal content only
8. Try "Ozel Duzen" → add rows with different column counts → verify it works

**Step 4: Commit any fixes needed**

```bash
git add -A && git commit -m "fix: address issues found during layout builder testing"
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `admin/src/components/editor/LayoutPresets.ts` | CREATE | Types + preset template definitions |
| `admin/src/components/editor/LayoutBuilder.tsx` | CREATE | Sidebar layout builder component |
| `admin/src/pages/posts/PostEditor.tsx` | MODIFY | Integrate LayoutBuilder, add meta save/load |
| `src/lib/layout.ts` | CREATE | Server-side layout → HTML processor |
| `src/components/Layout.tsx` | MODIFY | Add `.wp-row` / `.wp-col` CSS |
| `src/lib/public-db.ts` | MODIFY | Add `getPostMeta()` function |
| `src/routes/public/post.tsx` | MODIFY | Render layout for posts/pages |
| `src/routes/public/home.tsx` | MODIFY | Render layout for static homepage |
| `src/routes/api/posts.ts` | MODIFY | Non-destructive meta upsert |
