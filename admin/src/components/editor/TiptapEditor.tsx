import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import FontFamily from '@tiptap/extension-font-family';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Youtube from '@tiptap/extension-youtube';
import { common, createLowlight } from 'lowlight';
import { Button } from '@ui/button';
import { Separator } from '@ui/separator';
import { LinkModal } from '@/components/editor/LinkModal';
import { ImageModal } from '@/components/editor/ImageModal';
import { ShortcodeModal } from '@/components/editor/ShortcodeModal';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Heading4, Quote, Minus, Undo, Redo, Link as LinkIcon,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, Table as TableIcon,
  RemoveFormatting, Braces, Highlighter, Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Palette, Type, Youtube as YoutubeIcon, FileCode,
} from 'lucide-react';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertMedia?: () => void;
  onSetFeaturedImage?: (src: string) => void;
  lang?: string;
}

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
];

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

export function TiptapEditor({ content, onChange, placeholder = 'Start writing...', onInsertMedia, onSetFeaturedImage, lang = 'en' }: TiptapEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showShortcodeModal, setShowShortcodeModal] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const lastExternalContent = useRef(content);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const fontPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      CharacterCount,
      Typography,
      FontFamily,
      CodeBlockLowlight.configure({ lowlight }),
      Youtube.configure({ inline: false, ccLanguage: lang }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastExternalContent.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Close pickers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setShowColorPicker(false);
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target as Node)) setShowHighlightPicker(false);
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) setShowFontPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) return null;

  const addLink = () => {
    const existingUrl = editor.getAttributes('link').href || '';
    setLinkInitialUrl(existingUrl);
    setShowLinkModal(true);
  };

  const handleLinkInsert = (url: string) => {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    if (onInsertMedia) { onInsertMedia(); return; }
    setShowImageModal(true);
  };

  const handleImageInsert = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
  };

  const handleShortcodeInsert = (shortcodeText: string) => {
    editor.chain().focus().insertContent(shortcodeText).run();
  };

  const addYoutube = () => {
    if (youtubeUrl.trim()) {
      editor.commands.setYoutubeVideo({ src: youtubeUrl.trim() });
      setYoutubeUrl('');
      setShowYoutubeInput(false);
    }
  };

  const charCount = editor.storage.characterCount;

  const ToolButton = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <Button type="button" variant={active ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={onClick} title={title}>
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg">
      {/* Toolbar Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 p-1 border-b sticky top-0 z-30 rounded-t-lg bg-white">
        {/* Font Family */}
        <div className="relative" ref={fontPickerRef}>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1" onClick={() => setShowFontPicker(!showFontPicker)} title="Font Family">
            <Type className="h-3.5 w-3.5" />
            <span className="max-w-[60px] truncate">{editor.getAttributes('textStyle').fontFamily || 'Default'}</span>
          </Button>
          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 w-44 py-1">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                  style={{ fontFamily: f.value || 'inherit' }}
                  onClick={() => {
                    if (f.value) editor.chain().focus().setFontFamily(f.value).run();
                    else editor.chain().focus().unsetFontFamily().run();
                    setShowFontPicker(false);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript"><SuperscriptIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript"><SubscriptIcon className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        {/* Color Picker */}
        <div className="relative" ref={colorPickerRef}>
          <ToolButton onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
            <div className="flex flex-col items-center">
              <Palette className="h-3.5 w-3.5" />
              <div className="w-4 h-1 rounded-sm mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }} />
            </div>
          </ToolButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2 w-[220px]">
              <div className="grid grid-cols-10 gap-1">
                {COLORS.map((c) => (
                  <button key={c} type="button" className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }}
                  />
                ))}
              </div>
              <button type="button" className="w-full text-xs text-center mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}>
                {lang === 'tr' ? 'Rengi Kaldır' : 'Remove Color'}
              </button>
            </div>
          )}
        </div>

        {/* Highlight Picker */}
        <div className="relative" ref={highlightPickerRef}>
          <ToolButton onClick={() => setShowHighlightPicker(!showHighlightPicker)} active={editor.isActive('highlight')} title="Highlight">
            <Highlighter className="h-4 w-4" />
          </ToolButton>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2 w-[220px]">
              <div className="grid grid-cols-10 gap-1">
                {COLORS.map((c) => (
                  <button key={c} type="button" className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setShowHighlightPicker(false); }}
                  />
                ))}
              </div>
              <button type="button" className="w-full text-xs text-center mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}>
                {lang === 'tr' ? 'Vurguyu Kaldır' : 'Remove Highlight'}
              </button>
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1"><Heading1 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2"><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3"><Heading3 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive('heading', { level: 4 })} title="H4"><Heading4 className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List"><List className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List"><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block"><FileCode className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><Minus className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left"><AlignLeft className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><AlignCenter className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Right"><AlignRight className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><AlignJustify className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton onClick={addLink} active={editor.isActive('link')} title="Link"><LinkIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={addImage} title="Image"><ImageIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()} title="Table"><TableIcon className="h-4 w-4" /></ToolButton>

        {/* YouTube */}
        <div className="relative">
          <ToolButton onClick={() => setShowYoutubeInput(!showYoutubeInput)} title="YouTube"><YoutubeIcon className="h-4 w-4" /></ToolButton>
          {showYoutubeInput && (
            <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 p-2 flex gap-1 w-80">
              <input
                type="text"
                placeholder="YouTube URL..."
                className="flex-1 border rounded px-2 py-1 text-sm"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addYoutube(); }}
                autoFocus
              />
              <Button type="button" size="sm" onClick={addYoutube}>{lang === 'tr' ? 'Ekle' : 'Add'}</Button>
            </div>
          )}
        </div>

        <ToolButton onClick={() => setShowShortcodeModal(true)} title="Shortcode"><Braces className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting"><RemoveFormatting className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="h-4 w-4" /></ToolButton>
      </div>

      {/* Bubble Menu for links */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} shouldShow={({ editor }) => editor.isActive('link')}>
          <div className="bg-white border rounded-lg shadow-lg px-2 py-1 flex items-center gap-1">
            <a href={editor.getAttributes('link').href} target="_blank" rel="noopener" className="text-xs text-blue-600 max-w-[200px] truncate">
              {editor.getAttributes('link').href}
            </a>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={addLink}>
              {lang === 'tr' ? 'Düzenle' : 'Edit'}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-destructive" onClick={() => editor.chain().focus().unsetLink().run()}>
              {lang === 'tr' ? 'Kaldır' : 'Remove'}
            </Button>
          </div>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} className="prose prose-sm max-w-none" />

      {/* Character count footer */}
      <div className="flex items-center justify-end px-3 py-1.5 border-t text-xs text-muted-foreground bg-gray-50/50">
        {charCount.characters()} {lang === 'tr' ? 'karakter' : 'characters'} · {charCount.words()} {lang === 'tr' ? 'kelime' : 'words'}
      </div>

      <LinkModal open={showLinkModal} onOpenChange={setShowLinkModal} onInsert={handleLinkInsert} initialUrl={linkInitialUrl} lang={lang} />
      <ImageModal open={showImageModal} onOpenChange={setShowImageModal} onInsert={handleImageInsert} lang={lang} />
      <ShortcodeModal open={showShortcodeModal} onOpenChange={setShowShortcodeModal} onInsert={handleShortcodeInsert} lang={lang} />
    </div>
  );
}
