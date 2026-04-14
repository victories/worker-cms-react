import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Plate,
  PlateContent,
  PlateElement,
  PlateLeaf,
  usePlateEditor,
} from '@udecode/plate/react';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
} from '@udecode/plate-basic-marks/react';
import { HeadingPlugin } from '@udecode/plate-heading/react';
import { ListPlugin, BulletedListPlugin, NumberedListPlugin, ListItemPlugin } from '@udecode/plate-list/react';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { LinkPlugin } from '@udecode/plate-link/react';
import { TablePlugin, TableRowPlugin, TableCellPlugin, TableCellHeaderPlugin } from '@udecode/plate-table/react';
import { HorizontalRulePlugin } from '@udecode/plate-horizontal-rule/react';
import { ImagePlugin } from '@udecode/plate-media/react';
import { HighlightPlugin } from '@udecode/plate-highlight/react';
import { FontColorPlugin, FontBackgroundColorPlugin, FontSizePlugin } from '@udecode/plate-font/react';
import {
  serializeHtml,
  parseHtmlDocument,
  deserializeHtml,
} from '@udecode/plate';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LinkModal } from '@/components/editor/LinkModal';
import { ImageModal } from '@/components/editor/ImageModal';
import { ShortcodeModal } from '@/components/editor/ShortcodeModal';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Minus, Undo, Redo, Link as LinkIcon,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, Table as TableIcon,
  RemoveFormatting, Braces, Highlighter, Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
} from 'lucide-react';

// -- Element components --
function HeadingElement({ children, element, attributes, ...props }: any) {
  const level = element?.level || 1;
  if (level === 1) return <h1 {...attributes} {...props}>{children}</h1>;
  if (level === 2) return <h2 {...attributes} {...props}>{children}</h2>;
  if (level === 3) return <h3 {...attributes} {...props}>{children}</h3>;
  if (level === 4) return <h4 {...attributes} {...props}>{children}</h4>;
  if (level === 5) return <h5 {...attributes} {...props}>{children}</h5>;
  return <h6 {...attributes} {...props}>{children}</h6>;
}

function BlockquoteElement({ children, attributes, ...props }: any) {
  return <blockquote {...attributes} {...props} style={{ borderLeft: '3px solid #ccc', paddingLeft: 16, marginLeft: 0, color: '#555' }}>{children}</blockquote>;
}

function LinkElement({ children, element, attributes, ...props }: any) {
  return <a {...attributes} {...props} href={element?.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{children}</a>;
}

function ImageElement({ element, attributes, ...props }: any) {
  return (
    <div {...attributes} {...props} contentEditable={false}>
      <img src={element?.url} alt={element?.alt || ''} style={{ maxWidth: '100%', height: 'auto' }} />
    </div>
  );
}

function HrElement({ attributes, ...props }: any) {
  return <div {...attributes} {...props} contentEditable={false}><hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '16px 0' }} /></div>;
}

function TableElement({ children, attributes, ...props }: any) {
  return <table {...attributes} {...props} style={{ borderCollapse: 'collapse', width: '100%' }}><tbody>{children}</tbody></table>;
}

function TrElement({ children, attributes, ...props }: any) {
  return <tr {...attributes} {...props}>{children}</tr>;
}

function TdElement({ children, attributes, ...props }: any) {
  return <td {...attributes} {...props} style={{ border: '1px solid #ccc', padding: 8 }}>{children}</td>;
}

function ThElement({ children, attributes, ...props }: any) {
  return <th {...attributes} {...props} style={{ border: '1px solid #ccc', padding: 8, fontWeight: 'bold', background: '#f5f5f5' }}>{children}</th>;
}

// -- Leaf components --
function BoldLeaf({ children, attributes, ...props }: any) {
  return <strong {...attributes} {...props}>{children}</strong>;
}
function ItalicLeaf({ children, attributes, ...props }: any) {
  return <em {...attributes} {...props}>{children}</em>;
}
function UnderlineLeaf({ children, attributes, ...props }: any) {
  return <u {...attributes} {...props}>{children}</u>;
}
function StrikethroughLeaf({ children, attributes, ...props }: any) {
  return <s {...attributes} {...props}>{children}</s>;
}
function CodeLeaf({ children, attributes, ...props }: any) {
  return <code {...attributes} {...props} style={{ background: '#f0f0f0', borderRadius: 3, padding: '2px 4px', fontSize: '0.9em' }}>{children}</code>;
}
function SuperscriptLeaf({ children, attributes, ...props }: any) {
  return <sup {...attributes} {...props}>{children}</sup>;
}
function SubscriptLeaf({ children, attributes, ...props }: any) {
  return <sub {...attributes} {...props}>{children}</sub>;
}
function HighlightLeaf({ children, attributes, ...props }: any) {
  return <mark {...attributes} {...props}>{children}</mark>;
}

interface PlateEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertMedia?: () => void;
  onSetFeaturedImage?: (src: string) => void;
  lang?: string;
}

export function PlateEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  onInsertMedia,
  onSetFeaturedImage,
  lang = 'en',
}: PlateEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showShortcodeModal, setShowShortcodeModal] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');
  const lastExternalContent = useRef(content);
  const isInitialMount = useRef(true);

  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin,
      CodePlugin,
      SubscriptPlugin,
      SuperscriptPlugin,
      HeadingPlugin.configure({ options: { levels: 3 } }),
      ListPlugin,
      BulletedListPlugin,
      NumberedListPlugin,
      ListItemPlugin,
      BlockquotePlugin,
      LinkPlugin.configure({ options: { forceSubmit: true } }),
      TablePlugin,
      TableRowPlugin,
      TableCellPlugin,
      TableCellHeaderPlugin,
      HorizontalRulePlugin,
      ImagePlugin,
      HighlightPlugin,
      FontColorPlugin,
      FontBackgroundColorPlugin,
      FontSizePlugin,
    ],
    override: {
      components: {
        // Elements
        heading: HeadingElement,
        blockquote: BlockquoteElement,
        a: LinkElement,
        img: ImageElement,
        hr: HrElement,
        ul: ({ children, attributes, ...props }: any) => <ul {...attributes} {...props} style={{ paddingLeft: 24, listStyleType: 'disc' }}>{children}</ul>,
        ol: ({ children, attributes, ...props }: any) => <ol {...attributes} {...props} style={{ paddingLeft: 24, listStyleType: 'decimal' }}>{children}</ol>,
        li: ({ children, attributes, ...props }: any) => <li {...attributes} {...props}>{children}</li>,
        table: TableElement,
        tr: TrElement,
        td: TdElement,
        th: ThElement,
        // Leaves
        bold: BoldLeaf,
        italic: ItalicLeaf,
        underline: UnderlineLeaf,
        strikethrough: StrikethroughLeaf,
        code: CodeLeaf,
        superscript: SuperscriptLeaf,
        subscript: SubscriptLeaf,
        highlight: HighlightLeaf,
      },
    },
  });

  // Load initial content
  useEffect(() => {
    if (!editor) return;
    if (isInitialMount.current || content !== lastExternalContent.current) {
      isInitialMount.current = false;
      lastExternalContent.current = content;
      if (content && content.trim()) {
        try {
          const doc = parseHtmlDocument(content);
          const value = deserializeHtml(editor, { element: doc.body }) as any;
          if (value && value.length > 0) {
            editor.tf.setValue(value);
          }
        } catch (e) {
          console.warn('PlateEditor: Failed to parse HTML', e);
        }
      }
    }
  }, [editor, content]);

  const handleChange = useCallback(async () => {
    if (!editor) return;
    try {
      const html = await serializeHtml(editor, {
        components: {
          heading: HeadingElement,
          blockquote: BlockquoteElement,
          a: LinkElement,
          img: ImageElement,
          hr: HrElement,
          ul: ({ children, attributes, ...props }: any) => <ul {...attributes} {...props}>{children}</ul>,
          ol: ({ children, attributes, ...props }: any) => <ol {...attributes} {...props}>{children}</ol>,
          li: ({ children, attributes, ...props }: any) => <li {...attributes} {...props}>{children}</li>,
          table: TableElement,
          tr: TrElement,
          td: TdElement,
          th: ThElement,
          bold: BoldLeaf,
          italic: ItalicLeaf,
          underline: UnderlineLeaf,
          strikethrough: StrikethroughLeaf,
          code: CodeLeaf,
          superscript: SuperscriptLeaf,
          subscript: SubscriptLeaf,
          highlight: HighlightLeaf,
        },
        stripDataAttributes: true,
      } as any);
      lastExternalContent.current = html;
      onChange(html);
    } catch {
      try {
        const children = editor.children || [];
        const text = children.map((n: any) =>
          (n.children || []).map((c: any) => c.text || '').join('')
        ).join('\n');
        onChange(`<p>${text}</p>`);
      } catch {
        // ignore
      }
    }
  }, [editor, onChange]);

  const addLink = () => {
    setLinkInitialUrl('');
    setShowLinkModal(true);
  };

  const handleLinkInsert = (url: string) => {
    if (editor) {
      try {
        editor.tf.insertNodes({
          type: 'a',
          url,
          children: [{ text: url }],
        } as any);
      } catch { /* ignore */ }
    }
  };

  const addImage = () => {
    if (onInsertMedia) { onInsertMedia(); return; }
    setShowImageModal(true);
  };

  const handleImageInsert = (url: string) => {
    if (editor) {
      editor.tf.insertNodes({
        type: 'img',
        url,
        children: [{ text: '' }],
      } as any);
    }
  };

  const handleShortcodeInsert = (shortcodeText: string) => {
    if (editor) {
      editor.tf.insertText(shortcodeText);
    }
  };

  const ToolButton = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <Button type="button" variant={active ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={onClick} title={title}>
      {children}
    </Button>
  );

  const toggleMark = (key: string) => {
    if (editor) {
      editor.tf.toggleMark(key);
    }
  };

  const toggleBlock = (type: string) => {
    if (editor) {
      editor.tf.toggleBlock(type);
    }
  };

  const setAlign = (align: string) => {
    if (editor) {
      try { editor.tf.setNodes({ align } as any, { mode: 'highest' }); } catch { /* ignore */ }
    }
  };

  const insertTable = () => {
    if (editor) {
      try {
        editor.tf.insertNodes({
          type: 'table',
          children: Array.from({ length: 3 }, () => ({
            type: 'tr',
            children: Array.from({ length: 3 }, () => ({
              type: 'td',
              children: [{ text: '' }],
            })),
          })),
        } as any);
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap items-center gap-0.5 p-1 border-b sticky top-0 z-30 rounded-t-lg bg-background">
        <ToolButton onClick={() => toggleMark('bold')} title="Bold"><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('italic')} title="Italic"><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('strikethrough')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('code')} title="Code"><Code className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('superscript')} title="Superscript"><SuperscriptIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('subscript')} title="Subscript"><SubscriptIcon className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => toggleBlock('h1')} title="H1"><Heading1 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleBlock('h2')} title="H2"><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleBlock('h3')} title="H3"><Heading3 className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => toggleBlock('ul')} title="Bullet List"><List className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleBlock('ol')} title="Ordered List"><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleBlock('blockquote')} title="Blockquote"><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => { if (editor) editor.tf.insertNodes({ type: 'hr', children: [{ text: '' }] } as any); }} title="Horizontal Rule"><Minus className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => setAlign('left')} title="Align Left"><AlignLeft className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => setAlign('center')} title="Center"><AlignCenter className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => setAlign('right')} title="Right"><AlignRight className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => setAlign('justify')} title="Justify"><AlignJustify className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={addLink} title="Link"><LinkIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={addImage} title="Image"><ImageIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={insertTable} title="Table"><TableIcon className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => toggleMark('highlight')} title="Highlight"><Highlighter className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => setShowShortcodeModal(true)} title="Shortcode"><Braces className="h-4 w-4" /></ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => { if (editor) editor.undo(); }} title="Undo"><Undo className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => { if (editor) editor.redo(); }} title="Redo"><Redo className="h-4 w-4" /></ToolButton>
      </div>

      <Plate editor={editor} onValueChange={handleChange}>
        <PlateContent
          placeholder={placeholder}
          className="prose prose-sm max-w-none p-4 min-h-[300px] outline-none [&_*]:outline-none"
        />
      </Plate>

      <LinkModal open={showLinkModal} onOpenChange={setShowLinkModal} onInsert={handleLinkInsert} initialUrl={linkInitialUrl} lang={lang} />
      <ImageModal open={showImageModal} onOpenChange={setShowImageModal} onInsert={handleImageInsert} lang={lang} />
      <ShortcodeModal open={showShortcodeModal} onOpenChange={setShowShortcodeModal} onInsert={handleShortcodeInsert} lang={lang} />
    </div>
  );
}
