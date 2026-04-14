// Server-side page layout processor
// Converts layout JSON (rows + columns) into HTML with rendered shortcodes

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
 * Each column's shortcode is processed through the shortcode system.
 * The special shortcode name "icerik" embeds the post's editor content.
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
    const colCount = row.columns.length;

    for (const col of row.columns) {
      let cellHtml = '';

      if (col.shortcode === 'icerik') {
        // Special: embed the post editor content
        cellHtml = await processAllShortcodes(postContent || '', ctx);
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

      // Skip rendering empty columns
      if (!cellHtml && !col.shortcode) {
        colsHtml.push(`<div class="wp-col" style="flex:0 0 ${col.width}%;min-width:0"></div>`);
        continue;
      }

      colsHtml.push(
        `<div class="wp-col" style="flex:0 0 ${col.width}%;min-width:0">${cellHtml}</div>`
      );
    }

    rowsHtml.push(`<div class="wp-row">${colsHtml.join('')}</div>`);
  }

  return `<div class="wp-layout">${rowsHtml.join('')}</div>`;
}
