import { useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { ShortcodeModal } from '@/components/editor/ShortcodeModal';
import { ImageModal } from '@/components/editor/ImageModal';
// Import TinyMCE core and plugins for self-hosted usage
import 'tinymce/tinymce';
import 'tinymce/models/dom';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
// Plugins
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/code';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/emoticons';
import 'tinymce/plugins/emoticons/js/emojis';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/image';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/quickbars';
import 'tinymce/plugins/save';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/table';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/visualchars';
import 'tinymce/plugins/wordcount';
// Skin CSS
import 'tinymce/skins/ui/oxide/skin.min.css';

interface TinyMCEEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertMedia?: () => void;
  onSetFeaturedImage?: (src: string) => void;
  lang?: string;
}

export function TinyMCEEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  onInsertMedia,
  onSetFeaturedImage,
  lang = 'en',
}: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null);
  // Capture initial content once so initialValue prop never changes
  // (changing initialValue triggers editor.setContent() which resets cursor)
  const initialContent = useRef(content);
  const [showShortcodeModal, setShowShortcodeModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoWidth, setVideoWidth] = useState('560');
  const [videoHeight, setVideoHeight] = useState('315');

  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Dailymotion
    const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dmMatch) return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
    // Generic iframe URL
    if (url.startsWith('https://')) return url;
    return null;
  };

  const insertVideo = () => {
    const embedUrl = getEmbedUrl(videoUrl.trim());
    if (!embedUrl || !editorRef.current) return;
    const w = parseInt(videoWidth) || 560;
    const h = parseInt(videoHeight) || 315;
    editorRef.current.insertContent(
      `<div style="position:relative;padding-bottom:${((h / w) * 100).toFixed(1)}%;height:0;overflow:hidden;max-width:100%">` +
      `<iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe>` +
      `</div><p></p>`
    );
    setShowVideoModal(false);
    setVideoUrl('');
  };

  return (
    <div className="border rounded-lg overflow-hidden tinymce-wrapper">
      <ImageModal
        open={showImageModal}
        onOpenChange={setShowImageModal}
        onInsert={(url) => {
          if (editorRef.current) {
            editorRef.current.insertContent(`<img src="${url}" alt="" style="max-width:100%;height:auto" />`);
          }
        }}
        lang={lang}
      />
      <ShortcodeModal
        open={showShortcodeModal}
        onOpenChange={setShowShortcodeModal}
        onInsert={(shortcodeText) => {
          if (editorRef.current) {
            editorRef.current.insertContent(shortcodeText);
          }
        }}
        lang={lang}
      />
      {/* Video Embed Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50" onClick={() => setShowVideoModal(false)}>
          <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{lang === 'tr' ? 'Video Ekle' : 'Insert Video'}</h3>
              <button onClick={() => setShowVideoModal(false)} className="text-muted-foreground hover:text-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{lang === 'tr' ? 'Video URL' : 'Video URL'}</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') insertVideo(); }}
                />
                <p className="text-xs text-muted-foreground">
                  {lang === 'tr' ? 'YouTube, Vimeo veya Dailymotion linki yapıştırın' : 'Paste a YouTube, Vimeo, or Dailymotion link'}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium">{lang === 'tr' ? 'Genişlik' : 'Width'}</label>
                  <input
                    type="number"
                    value={videoWidth}
                    onChange={(e) => setVideoWidth(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium">{lang === 'tr' ? 'Yükseklik' : 'Height'}</label>
                  <input
                    type="number"
                    value={videoHeight}
                    onChange={(e) => setVideoHeight(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
              {videoUrl && getEmbedUrl(videoUrl.trim()) && (
                <div className="rounded-md overflow-hidden bg-muted aspect-video">
                  <iframe
                    src={getEmbedUrl(videoUrl.trim())!}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setShowVideoModal(false)}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground"
              >
                {lang === 'tr' ? 'İptal' : 'Cancel'}
              </button>
              <button
                onClick={insertVideo}
                disabled={!videoUrl.trim() || !getEmbedUrl(videoUrl.trim())}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                {lang === 'tr' ? 'Ekle' : 'Insert'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Editor
        licenseKey="gpl"
        onInit={(_evt, editor) => {
          editorRef.current = editor;
        }}
        initialValue={initialContent.current}
        init={{
          height: 500,
          min_height: 300,
          menubar: 'file edit view insert format tools table',
          plugins: [
            'advlist', 'anchor', 'autolink', 'autoresize', 'charmap', 'code', 'codesample',
            'directionality', 'emoticons', 'fullscreen', 'image', 'insertdatetime',
            'link', 'lists', 'media', 'nonbreaking', 'pagebreak', 'preview', 'quickbars',
            'searchreplace', 'table', 'visualblocks', 'visualchars', 'wordcount',
          ],
          toolbar1: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | removeformat',
          toolbar2: 'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link customimage custommedia table | blockquote codesample hr | charmap emoticons | shortcode | code fullscreen',
          toolbar_mode: 'wrap',
          block_formats: lang === 'tr'
            ? 'Paragraf=p; Başlık 1=h1; Başlık 2=h2; Başlık 3=h3; Başlık 4=h4; Başlık 5=h5; Başlık 6=h6; Ön Biçimli=pre'
            : 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',
          font_family_formats: 'Default=; Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; Georgia=georgia,palatino,serif; Tahoma=tahoma,arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Trebuchet MS=trebuchet ms,geneva,sans-serif; Verdana=verdana,geneva,sans-serif; Inter=inter,sans-serif',
          font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt 48pt',
          placeholder,
          branding: false,
          promotion: false,
          skin: false,
          content_css: false,
          directionality: 'ltr',
          content_style: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #1a1a1a;
              margin: 12px;
              max-width: 100%;
              direction: ltr;
              text-align: left;
            }
            img { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            table td, table th { border: 1px solid #ccc; padding: 8px; }
            pre { background: #f5f5f5; border-radius: 4px; padding: 12px; overflow-x: auto; }
            code { background: #f0f0f0; border-radius: 3px; padding: 2px 4px; font-size: 0.9em; }
            blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 16px; color: #555; }
            a { color: #2563eb; }
            hr { border: none; border-top: 1px solid #e5e5e5; margin: 16px 0; }
          `,
          quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
          quickbars_insert_toolbar: false,
          contextmenu: 'link image table',
          help_accessibility: false,
          link_default_target: '_blank',
          link_assume_external_targets: true,
          image_advtab: true,
          image_caption: true,
          image_title: true,
          table_advtab: true,
          table_cell_advtab: true,
          table_row_advtab: true,
          table_style_by_css: true,
          table_use_colgroups: true,
          autoresize_bottom_margin: 50,
          autoresize_overflow_padding: 10,
          paste_data_images: true,
          smart_paste: true,
          // File picker routes through our ImageModal for R2 upload
          file_picker_callback: (callback: any, _value: any, meta: any) => {
            if (meta.filetype === 'image') {
              // Close TinyMCE's dialog, open our ImageModal for R2 upload
              if (editorRef.current) editorRef.current.windowManager.close();
              setTimeout(() => setShowImageModal(true), 50);
            } else if (meta.filetype === 'media') {
              // Close TinyMCE's dialog, open our video embed modal
              if (editorRef.current) editorRef.current.windowManager.close();
              setTimeout(() => setShowVideoModal(true), 50);
            }
          },
          setup: (editor: any) => {
            // Custom bracket icon for shortcode button
            editor.ui.registry.addIcon('shortcode-brackets', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="3" y="17" font-family="monospace" font-size="14" font-weight="bold" fill="currentColor">[/]</text></svg>');

            // Custom image button - opens ImageModal with R2 upload
            editor.ui.registry.addButton('customimage', {
              icon: 'image',
              tooltip: lang === 'tr' ? 'Resim Ekle' : 'Insert Image',
              onAction: () => setShowImageModal(true),
            });

            // Custom media button - opens Video embed modal
            editor.ui.registry.addButton('custommedia', {
              icon: 'embed',
              tooltip: lang === 'tr' ? 'Video Ekle' : 'Insert Video',
              onAction: () => setShowVideoModal(true),
            });

            // Custom shortcode button - opens project's ShortcodeModal
            editor.ui.registry.addButton('shortcode', {
              icon: 'shortcode-brackets',
              tooltip: 'Shortcode',
              onAction: () => {
                setShowShortcodeModal(true);
              },
            });

            // Add shortcode button to toolbar
            editor.on('init', () => {
              // Adjust for dark mode detection
              const isDark = document.documentElement.classList.contains('dark');
              if (isDark) {
                const iframe = editor.iframeElement;
                if (iframe?.contentDocument) {
                  const style = iframe.contentDocument.createElement('style');
                  style.textContent = 'body { background: #1a1a2e; color: #e0e0e0; } a { color: #60a5fa; } table td, table th { border-color: #444; } pre { background: #2d2d3d; } code { background: #2d2d3d; }';
                  iframe.contentDocument.head.appendChild(style);
                }
              }
            });
          },
        }}
        onEditorChange={(newContent) => {
          onChange(newContent);
        }}
      />
    </div>
  );
}
