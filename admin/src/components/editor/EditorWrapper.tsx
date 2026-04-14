import { lazy, Suspense, useEffect, useState } from 'react';
import { RichEditor } from './RichEditor';
import { api } from '@/lib/api';

type EditorType = 'classic' | 'blocknote' | 'tiptap' | 'plate' | 'tinymce';

// Lazy-load non-classic editors for code splitting
const BlockEditor = lazy(() =>
  import('./BlockEditor').then((mod) => ({ default: mod.BlockEditor }))
);
const TiptapEditor = lazy(() =>
  import('./TiptapEditor').then((mod) => ({ default: mod.TiptapEditor }))
);
const PlateEditor = lazy(() =>
  import('./PlateEditor').then((mod) => ({ default: mod.PlateEditor }))
);
const TinyMCEEditor = lazy(() =>
  import('./TinyMCEEditor').then((mod) => ({ default: mod.TinyMCEEditor }))
);

interface EditorWrapperProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertMedia?: () => void;
  onSetFeaturedImage?: (src: string) => void;
  lang?: string;
}

// Cache per siteId so we don't re-fetch on every mount
const editorTypeCache: Record<string, string> = {};

const VALID_EDITORS: EditorType[] = ['classic', 'blocknote', 'tiptap', 'plate', 'tinymce'];

const LoadingShimmer = () => (
  <div className="border rounded-lg overflow-hidden animate-pulse">
    <div className="h-10 bg-muted/30 border-b" />
    <div className="h-[300px] bg-muted/10" />
  </div>
);

export function EditorWrapper(props: EditorWrapperProps) {
  const [editorType, setEditorType] = useState<EditorType | null>(null);

  useEffect(() => {
    const siteId = api.getSiteId();
    const cacheKey = siteId || '__default';

    // Use cache if available
    if (editorTypeCache[cacheKey]) {
      setEditorType(editorTypeCache[cacheKey] as EditorType);
      return;
    }

    // Fetch settings from API
    api
      .getSettings()
      .then((res) => {
        const data = (res.data || {}) as Record<string, string>;
        const val = data.editor_type || 'classic';
        const normalized: EditorType = VALID_EDITORS.includes(val as EditorType)
          ? (val as EditorType)
          : 'classic';
        editorTypeCache[cacheKey] = normalized;
        setEditorType(normalized);
      })
      .catch(() => {
        editorTypeCache[cacheKey] = 'classic';
        setEditorType('classic');
      });
  }, []);

  // Show shimmer while loading preference
  if (editorType === null) {
    return <LoadingShimmer />;
  }

  // Classic editor loads synchronously (no lazy)
  if (editorType === 'classic') {
    return <RichEditor {...props} />;
  }

  // All other editors are lazy-loaded
  const LazyEditor =
    editorType === 'blocknote' ? BlockEditor :
    editorType === 'tiptap' ? TiptapEditor :
    editorType === 'plate' ? PlateEditor :
    TinyMCEEditor;

  return (
    <Suspense fallback={<LoadingShimmer />}>
      <LazyEditor {...props} />
    </Suspense>
  );
}
