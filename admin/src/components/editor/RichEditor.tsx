import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ReactNodeViewRenderer } from '@tiptap/react';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LinkModal } from '@/components/editor/LinkModal';
import { ImageModal } from '@/components/editor/ImageModal';
import { ShortcodeModal } from '@/components/editor/ShortcodeModal';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Minus, Undo, Redo, Link as LinkIcon,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Table as TableIcon,
  RemoveFormatting, Braces, Maximize2, Minimize2, PanelLeft, PanelRight, Square,
  ExternalLink, Unlink, Star,
} from 'lucide-react';

// ── Resizable Image NodeView ──
function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = imgRef.current?.offsetWidth || 300;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(100, startWidthRef.current + diff);
      updateAttributes({ width: newWidth, height: null });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateAttributes]);

  const { src, alt, width, height, loading } = node.attrs;
  const imgFloat = node.attrs.float as string | null;
  const imgLink = node.attrs.link as string | null;

  // Build wrapper styles based on float
  const wrapperStyle: React.CSSProperties = {};
  let wrapperClass = 'relative inline-block';

  if (imgFloat === 'left') {
    wrapperStyle.float = 'left';
    wrapperStyle.marginRight = '1.25rem';
    wrapperStyle.marginBottom = '0.75rem';
    wrapperStyle.maxWidth = '50%';
  } else if (imgFloat === 'right') {
    wrapperStyle.float = 'right';
    wrapperStyle.marginLeft = '1.25rem';
    wrapperStyle.marginBottom = '0.75rem';
    wrapperStyle.maxWidth = '50%';
  } else {
    wrapperClass += ' my-4';
  }

  return (
    <NodeViewWrapper className={wrapperClass} style={wrapperStyle} data-drag-handle data-float={imgFloat || undefined}>
      <div className={`relative group inline-block ${selected ? 'ring-2 ring-primary ring-offset-2 rounded' : ''}`}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          width={width || undefined}
          height={height || undefined}
          loading={loading || 'lazy'}
          className="max-w-full h-auto rounded block"
          style={{ width: width ? `${width}px` : undefined }}
          draggable={false}
        />
        {/* Float indicator badge */}
        {imgFloat && selected && (
          <div className="absolute top-1 right-1 bg-blue-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
            {imgFloat === 'left' ? '◀ Sol' : '▶ Sağ'}
          </div>
        )}
        {/* Link indicator badge */}
        {imgLink && selected && (
          <div className="absolute top-1 left-1 bg-green-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
            <ExternalLink className="h-2.5 w-2.5" /> Link
          </div>
        )}
        {/* Resize handle — bottom-right corner */}
        {selected && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-tl cursor-se-resize opacity-80 hover:opacity-100 flex items-center justify-center"
            onMouseDown={handleMouseDown}
            title="Drag to resize"
          >
            <Maximize2 className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
        {/* Width indicator during resize */}
        {isResizing && width && (
          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {Math.round(width)}px
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// Custom Image extension with resizing + float support
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width') ? Number(el.getAttribute('width')) : null,
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          const styles: string[] = [`width: ${attrs.width}px`];
          if (attrs.float) styles.push(`float: ${attrs.float}`);
          return { width: attrs.width, style: styles.join('; ') };
        },
      },
      height: {
        default: null,
        parseHTML: (el) => el.getAttribute('height') ? Number(el.getAttribute('height')) : null,
        renderHTML: (attrs) => {
          if (!attrs.height) return {};
          return { height: attrs.height };
        },
      },
      loading: {
        default: 'lazy',
        parseHTML: (el) => el.getAttribute('loading') || 'lazy',
        renderHTML: (attrs) => ({ loading: attrs.loading }),
      },
      float: {
        default: null,
        parseHTML: (el) => {
          // Parse float from inline style
          const style = el.getAttribute('style') || '';
          if (style.includes('float: left') || style.includes('float:left')) return 'left';
          if (style.includes('float: right') || style.includes('float:right')) return 'right';
          // Parse from data attribute
          return el.getAttribute('data-float') || null;
        },
        renderHTML: (attrs) => {
          if (!attrs.float) return {};
          const styles: string[] = [`float: ${attrs.float}`];
          if (attrs.float === 'left') styles.push('margin: 0 1.25rem 0.75rem 0');
          if (attrs.float === 'right') styles.push('margin: 0 0 0.75rem 1.25rem');
          if (attrs.width) styles.push(`width: ${attrs.width}px`);
          return {
            'data-float': attrs.float,
            style: styles.join('; '),
          };
        },
      },
      link: {
        default: null,
        parseHTML: (el) => {
          // If image is inside an <a> tag, extract href
          const parent = el.parentElement;
          if (parent?.tagName === 'A') return parent.getAttribute('href');
          return el.getAttribute('data-link') || null;
        },
        renderHTML: (attrs) => {
          if (!attrs.link) return {};
          return { 'data-link': attrs.link };
        },
      },
    };
  },
  // Override renderHTML to wrap image in <a> when link is present
  renderHTML({ HTMLAttributes }) {
    const { link, ...imgAttrs } = HTMLAttributes;
    // Clean up: don't put data-link in img tag if we're wrapping with <a>
    delete imgAttrs['data-link'];
    if (link) {
      return ['a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, ['img', imgAttrs]];
    }
    return ['img', imgAttrs];
  },
  // Override parseHTML to also match img inside <a>
  parseHTML() {
    return [
      { tag: 'a > img', getAttrs: (el: HTMLElement) => {
        const parent = el.parentElement;
        return { src: el.getAttribute('src'), link: parent?.getAttribute('href') || null };
      }},
      { tag: 'img[src]' },
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertMedia?: () => void;
  onSetFeaturedImage?: (src: string) => void;
  lang?: string;
}

export function RichEditor({ content, onChange, placeholder = 'Start writing...', onInsertMedia, onSetFeaturedImage, lang = 'en' }: RichEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showShortcodeModal, setShowShortcodeModal] = useState(false);
  const [imageLinkModalOpen, setImageLinkModalOpen] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');

  const lastExternalContent = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastExternalContent.current = html;
      onChange(html);
    },
  });

  // Sync external content changes (e.g. from AI insert/replace) into TipTap
  useEffect(() => {
    if (editor && content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

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
    if (onInsertMedia) {
      onInsertMedia();
      return;
    }
    setShowImageModal(true);
  };

  const handleImageInsert = (url: string) => {
    editor.chain().focus().setImage({ src: url } as any).run();
  };

  const setImageSize = (width: number | null) => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { width, height: null }).run();
    }
  };

  const setImageFloat = (float: string | null) => {
    if (editor.isActive('image')) {
      // If setting float and no custom width, set a reasonable default
      const currentWidth = editor.getAttributes('image').width;
      if (float && !currentWidth) {
        editor.chain().focus().updateAttributes('image', { float, width: 400, height: null }).run();
      } else {
        editor.chain().focus().updateAttributes('image', { float }).run();
      }
    }
  };

  const addImageLink = () => {
    if (editor.isActive('image')) {
      const existingLink = editor.getAttributes('image').link || '';
      setLinkInitialUrl(existingLink);
      setImageLinkModalOpen(true);
    }
  };

  const removeImageLink = () => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { link: null }).run();
    }
  };

  const handleImageLinkInsert = (url: string) => {
    if (editor.isActive('image')) {
      editor.chain().focus().updateAttributes('image', { link: url }).run();
    }
  };

  const handleShortcodeInsert = (shortcodeText: string) => {
    editor.chain().focus().insertContent(shortcodeText).run();
  };

  const ToolButton = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap items-center gap-0.5 p-1 border-b sticky top-0 z-30 rounded-t-lg bg-white">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          <Code className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="H3">
          <Heading3 className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <Quote className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
          <Minus className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={addLink} active={editor.isActive('link')} title="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={addImage} title="Image">
          <ImageIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()} title="Table">
          <TableIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => setShowShortcodeModal(true)} title="Shortcode">
          <Braces className="h-4 w-4" />
        </ToolButton>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <ToolButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
          <RemoveFormatting className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolButton>
      </div>

      {/* Image toolbar — shown when an image is selected */}
      {editor.isActive('image') && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b bg-white text-xs sticky top-[41px] z-30">
          <span className="text-muted-foreground mr-1">{lang === 'tr' ? 'Boyut:' : 'Size:'}</span>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setImageSize(200)}>
            <Minimize2 className="h-3 w-3 mr-1" /> 200
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setImageSize(400)}>
            400
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setImageSize(600)}>
            600
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setImageSize(null)}>
            <Maximize2 className="h-3 w-3 mr-1" /> {lang === 'tr' ? 'Tam' : 'Full'}
          </Button>

          <Separator orientation="vertical" className="mx-1 h-4" />

          <span className="text-muted-foreground mr-1">{lang === 'tr' ? 'Konum:' : 'Float:'}</span>
          <Button
            type="button"
            variant={editor.getAttributes('image').float === 'left' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setImageFloat('left')}
          >
            <PanelLeft className="h-3 w-3 mr-1" /> {lang === 'tr' ? 'Sol' : 'Left'}
          </Button>
          <Button
            type="button"
            variant={!editor.getAttributes('image').float ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setImageFloat(null)}
          >
            <Square className="h-3 w-3 mr-1" /> {lang === 'tr' ? 'Blok' : 'Block'}
          </Button>
          <Button
            type="button"
            variant={editor.getAttributes('image').float === 'right' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setImageFloat('right')}
          >
            <PanelRight className="h-3 w-3 mr-1" /> {lang === 'tr' ? 'Sağ' : 'Right'}
          </Button>

          <Separator orientation="vertical" className="mx-1 h-4" />

          <span className="text-muted-foreground mr-1">Link:</span>
          <Button
            type="button"
            variant={editor.getAttributes('image').link ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={addImageLink}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> {editor.getAttributes('image').link ? (lang === 'tr' ? 'Değiştir' : 'Edit') : (lang === 'tr' ? 'Ekle' : 'Add')}
          </Button>
          {editor.getAttributes('image').link && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={removeImageLink}
            >
              <Unlink className="h-3 w-3 mr-1" /> {lang === 'tr' ? 'Kaldır' : 'Remove'}
            </Button>
          )}

          {onSetFeaturedImage && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  const src = editor.getAttributes('image').src;
                  if (src) onSetFeaturedImage(src);
                }}
              >
                <Star className="h-3 w-3 mr-1" /> {lang === 'tr' ? 'Öne Çıkan Yap' : 'Set Featured'}
              </Button>
            </>
          )}
        </div>
      )}

      <EditorContent editor={editor} className="prose prose-sm max-w-none" />

      <LinkModal
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        onInsert={handleLinkInsert}
        initialUrl={linkInitialUrl}
        lang={lang}
      />

      <ImageModal
        open={showImageModal}
        onOpenChange={setShowImageModal}
        onInsert={handleImageInsert}
        lang={lang}
      />

      <ShortcodeModal
        open={showShortcodeModal}
        onOpenChange={setShowShortcodeModal}
        onInsert={handleShortcodeInsert}
        lang={lang}
      />

      <LinkModal
        open={imageLinkModalOpen}
        onOpenChange={setImageLinkModalOpen}
        onInsert={handleImageLinkInsert}
        initialUrl={linkInitialUrl}
        lang={lang}
      />
    </div>
  );
}
