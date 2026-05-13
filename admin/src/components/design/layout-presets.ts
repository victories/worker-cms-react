/**
 * Layout presets — one-click region tree bundles for the Layout Builder.
 *
 * Each preset overwrites the entire `layout_config` (header / body /
 * footer) with a hand-crafted column + slot arrangement. Users who want
 * finer control can still drag-drop afterwards. Style tokens (colors /
 * fonts) are NOT touched here — pair these with a style preset from
 * `style-presets.ts` for a full theme swap.
 *
 * Slot ids and `props` keys mirror `slot-catalog.ts` and the SSR
 * registry in `src/ssr/slots/`. Adding a new preset is just appending
 * to `LAYOUT_PRESETS`; the LayoutBuilder picks them up automatically.
 */

/** One slot instance inside a column. */
interface LayoutPresetSlot {
  id: string;
  props?: Record<string, unknown>;
}

/** One column inside a region. */
interface LayoutPresetColumn {
  width: number;
  slots: LayoutPresetSlot[];
  sticky?: boolean;
}

/** One region (header / body / footer). */
interface LayoutPresetRegion {
  type: 'row';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  sticky?: boolean;
  columns: LayoutPresetColumn[];
}

export interface LayoutPreset {
  slug: string;
  /** Display name shown on the preset card. */
  name: string;
  /** One-line description for tooltip / subtitle. */
  description: string;
  /** Small ASCII / emoji glyph used as the thumbnail icon. */
  glyph: string;
  /** Full region tree — overwrites the current layout when applied. */
  layout_config: {
    header: LayoutPresetRegion;
    body: LayoutPresetRegion;
    footer: LayoutPresetRegion;
  };
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  // ── Magazine ────────────────────────────────────────────────────
  // Classic editorial: logo + menu + search + theme-toggle in the
  // header, a 60/40 split between main content and a sidebar packed
  // with discoverability widgets, and a 3-column footer.
  {
    slug: 'magazine',
    name: 'Magazine',
    description:
      'Klasik editoryal düzen: arama + tema toggle başlığı, 60/40 içerik + sidebar gövdesi, 3 sütunlu footer.',
    glyph: 'M',
    layout_config: {
      header: {
        type: 'row',
        padding: 'md',
        sticky: true,
        columns: [
          { width: 20, slots: [{ id: 'logo', props: {} }] },
          { width: 50, slots: [{ id: 'menu', props: {} }] },
          {
            width: 30,
            slots: [
              { id: 'search', props: { variant: 'icon', placeholder: 'Ara…' } },
              { id: 'theme-toggle', props: {} },
              { id: 'user-actions', props: {} },
            ],
          },
        ],
      },
      body: {
        type: 'row',
        padding: 'lg',
        columns: [
          { width: 60, slots: [{ id: 'main-content', props: {} }] },
          {
            width: 40,
            sticky: true,
            slots: [
              { id: 'widget:recent-posts', props: { count: 5 } },
              { id: 'widget:categories', props: {} },
              { id: 'widget:tags', props: {} },
            ],
          },
        ],
      },
      footer: {
        type: 'row',
        padding: 'md',
        columns: [
          { width: 34, slots: [{ id: 'widget:about', props: { title: '', html: '' } }] },
          { width: 33, slots: [{ id: 'widget:categories', props: {} }] },
          { width: 33, slots: [{ id: 'widget:newsletter', props: {} }] },
        ],
      },
    },
  },

  // ── Minimal ────────────────────────────────────────────────────
  // Sade, blog-merkezli: sadece logo + menü başlığı, sidebar yok,
  // tek sütunlu about footer'ı.
  {
    slug: 'minimal',
    name: 'Minimal',
    description:
      'Sade blog: logo + menü başlığı, tam genişlik içerik, tek sütunlu hakkımızda footer\'ı.',
    glyph: '–',
    layout_config: {
      header: {
        type: 'row',
        padding: 'sm',
        sticky: true,
        columns: [
          { width: 30, slots: [{ id: 'logo', props: {} }] },
          { width: 70, slots: [{ id: 'menu', props: {} }] },
        ],
      },
      body: {
        type: 'row',
        padding: 'lg',
        columns: [{ width: 100, slots: [{ id: 'main-content', props: {} }] }],
      },
      footer: {
        type: 'row',
        padding: 'md',
        columns: [
          {
            width: 100,
            slots: [{ id: 'widget:about', props: { title: '', html: '' } }],
          },
        ],
      },
    },
  },

  // ── Two-Sidebar ────────────────────────────────────────────────
  // Klasik forum / portal düzeni: sol + sağ sidebar 20%, orta içerik
  // 60%. Footer 4 sütun.
  {
    slug: 'two-sidebar',
    name: 'Çift Sidebar',
    description:
      'Forum / portal: 20% sol sidebar + 60% içerik + 20% sağ sidebar, 4 sütunlu footer.',
    glyph: '|||',
    layout_config: {
      header: {
        type: 'row',
        padding: 'md',
        sticky: true,
        columns: [
          { width: 25, slots: [{ id: 'logo', props: {} }] },
          { width: 75, slots: [{ id: 'menu', props: {} }] },
        ],
      },
      body: {
        type: 'row',
        padding: 'lg',
        columns: [
          {
            width: 20,
            sticky: true,
            slots: [
              { id: 'widget:categories', props: {} },
              { id: 'widget:tags', props: {} },
            ],
          },
          { width: 60, slots: [{ id: 'main-content', props: {} }] },
          {
            width: 20,
            sticky: true,
            slots: [
              { id: 'widget:recent-posts', props: { count: 5 } },
              { id: 'widget:newsletter', props: {} },
            ],
          },
        ],
      },
      footer: {
        type: 'row',
        padding: 'md',
        columns: [
          { width: 25, slots: [{ id: 'widget:about', props: { title: '', html: '' } }] },
          { width: 25, slots: [{ id: 'widget:categories', props: {} }] },
          { width: 25, slots: [{ id: 'widget:recent-posts', props: { count: 5 } }] },
          { width: 25, slots: [{ id: 'widget:newsletter', props: {} }] },
        ],
      },
    },
  },
];
