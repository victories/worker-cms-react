// Shortcode system - main entry point
// Registers all built-in shortcodes and provides the processing function

import { findShortcodes, replaceShortcode } from './parser';
import { ShortcodeContext, getShortcodeRenderer, getRegisteredNames } from './registry';

// Import all renderers (side-effect: they register themselves)
import './renderers/son-yazilar';
import './renderers/yazi';
import './renderers/kategori';
import './renderers/slider';
import './renderers/menu';
import './renderers/ozel-html';
import './renderers/bosluk';
import './renderers/ayirici';
import './renderers/arama-formu';
import './renderers/widget';
import './renderers/galeri';
import './renderers/video';
import './renderers/sosyal-medya';
import './renderers/iletisim-formu';

export { ShortcodeContext } from './registry';
export { getRegisteredNames } from './registry';

/**
 * Process all shortcodes in the given HTML content.
 * Handles both built-in shortcodes and static shortcodes from DB.
 * Runs up to 3 passes to handle nested shortcodes.
 */
export async function processAllShortcodes(
  content: string,
  ctx: ShortcodeContext,
  staticShortcodes?: Map<string, string>
): Promise<string> {
  if (!content) return content;

  const MAX_PASSES = 3;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const found = findShortcodes(content);
    if (found.length === 0) break;

    let changed = false;

    for (const sc of found) {
      // 1. Try built-in dynamic renderer first
      const renderer = getShortcodeRenderer(sc.name);
      if (renderer) {
        try {
          const result = await renderer(sc.params, sc.innerContent, ctx);
          content = replaceShortcode(content, sc, result);
          changed = true;
          continue;
        } catch (err) {
          console.error(`[shortcode] ${sc.name} hata:`, err);
          content = replaceShortcode(content, sc, `<!-- [${sc.name}] render hatasi -->`);
          changed = true;
          continue;
        }
      }

      // 2. Try static shortcodes from DB
      if (staticShortcodes && staticShortcodes.has(sc.name)) {
        const replacement = staticShortcodes.get(sc.name) || '';
        content = replaceShortcode(content, sc, replacement);
        changed = true;
        continue;
      }

      // 3. Unknown shortcode - leave as-is (don't replace)
    }

    if (!changed) break;
  }

  return content;
}
