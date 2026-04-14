import { useEffect, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
import { wpBlockNoteSchema } from './blocks/shortcodeBlocks';
import { getShortcodeSlashMenuItems } from './blocks/shortcodeSlashMenu';

interface BlockEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertMedia?: () => void;
  lang?: string;
}

export function BlockEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  lang = 'en',
}: BlockEditorProps) {
  const isInitialMount = useRef(true);
  const lastExternalContent = useRef(content);

  const editor = useCreateBlockNote(
    {
      schema: wpBlockNoteSchema,
    },
    [],
  );

  // Load initial HTML content into the editor on mount / when content changes externally
  useEffect(() => {
    if (!editor) return;
    // Only parse on initial mount or if external content has changed
    if (isInitialMount.current || content !== lastExternalContent.current) {
      isInitialMount.current = false;
      lastExternalContent.current = content;

      if (content && content.trim()) {
        (async () => {
          try {
            const blocks = await editor.tryParseHTMLToBlocks(content);
            editor.replaceBlocks(editor.document, blocks);
          } catch (e) {
            console.warn('BlockEditor: Failed to parse HTML content', e);
          }
        })();
      }
    }
  }, [editor, content]);

  // Combine default + shortcode slash menu items
  const getSlashMenuItems = useMemo(
    () => async (query: string) => {
      const defaults = getDefaultReactSlashMenuItems(editor);
      const shortcodes = getShortcodeSlashMenuItems(editor as any, lang);
      return filterSuggestionItems([...defaults, ...shortcodes], query);
    },
    [editor, lang],
  );

  const handleChange = () => {
    if (!editor) return;
    (async () => {
      const html = await editor.blocksToHTMLLossy(editor.document);
      lastExternalContent.current = html;
      onChange(html);
    })();
  };

  return (
    <div className="border rounded-lg bn-container [&_.bn-formatting-toolbar]:static [&_.bn-formatting-toolbar]:border-b [&_.bn-formatting-toolbar]:rounded-none [&_.bn-formatting-toolbar]:shadow-none [&_.bn-formatting-toolbar]:w-full">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </div>
  );
}
