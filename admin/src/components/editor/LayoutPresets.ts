// Layout preset definitions for the page layout builder

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
  description: string;
  descriptionEn: string;
  layout: PageLayout;
}

let _rowCounter = 0;
export function generateRowId(): string {
  return `r${Date.now()}_${++_rowCounter}`;
}

export function cloneLayoutWithNewIds(layout: PageLayout): PageLayout {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      id: generateRowId(),
      columns: row.columns.map((col) => ({ ...col, params: { ...col.params } })),
    })),
  };
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'blog',
    name: 'Blog',
    nameEn: 'Blog',
    description: 'Tek sutun tam genislik',
    descriptionEn: 'Single full-width column',
    layout: {
      rows: [{ id: 'r1', columns: [{ width: 100, shortcode: '', params: {} }] }],
    },
  },
  {
    id: '2-col',
    name: '2 Sutun (Icerik + Sidebar)',
    nameEn: '2 Column (Content + Sidebar)',
    description: '%70 icerik, %30 sidebar',
    descriptionEn: '70% content, 30% sidebar',
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
    description: '%20 sol, %60 orta, %20 sag',
    descriptionEn: '20% left, 60% center, 20% right',
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
    description: 'Ust kisim slider, alt kisim 2 sutun',
    descriptionEn: 'Top slider, bottom 2 columns',
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
    name: 'Landing Sayfasi',
    nameEn: 'Landing Page',
    description: 'Slider + 3 sutun + 4 parcali footer',
    descriptionEn: 'Slider + 3 columns + 4-part footer',
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
  2: [
    [50, 50],
    [70, 30],
    [30, 70],
    [60, 40],
    [40, 60],
  ],
  3: [
    [33, 34, 33],
    [25, 50, 25],
    [20, 60, 20],
    [50, 25, 25],
  ],
  4: [
    [25, 25, 25, 25],
    [40, 20, 20, 20],
    [20, 20, 20, 40],
  ],
};
