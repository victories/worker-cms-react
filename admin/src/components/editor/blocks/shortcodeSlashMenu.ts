import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { SHORTCODE_DEFINITIONS, SHORTCODE_CATEGORIES } from './shortcodeDefinitions';
import type { BlockNoteEditor } from '@blocknote/core';

/* ------------------------------------------------------------------ */
/*  Slash menu items for shortcode blocks                             */
/*  Typing `/` shows these alongside default block types              */
/* ------------------------------------------------------------------ */

export function getShortcodeSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  lang: string = 'en',
): DefaultReactSuggestionItem[] {
  return SHORTCODE_DEFINITIONS.map((def) => {
    const cat = SHORTCODE_CATEGORIES[def.category];
    const catLabel = lang === 'tr' ? cat?.tr : cat?.en;
    const description = lang === 'tr' ? def.description : def.descriptionEn;

    // Build default params from definition
    const defaultParams: Record<string, string> = {};
    for (const p of def.params) {
      if (p.default) defaultParams[p.name] = p.default;
    }

    return {
      title: def.name,
      subtext: description,
      group: catLabel || def.category,
      aliases: [def.name, ...(def.name.includes('-') ? [def.name.replace(/-/g, ' ')] : [])],
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'shortcode' as any,
          props: {
            shortcodeName: def.name,
            paramsJson: JSON.stringify(defaultParams),
            innerContent: '',
          },
        } as any);
      },
    } satisfies DefaultReactSuggestionItem;
  });
}
