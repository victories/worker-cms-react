import { createReactBlockSpec } from '@blocknote/react';
import { defaultBlockSpecs, BlockNoteSchema } from '@blocknote/core';
import { useState, useCallback, useEffect } from 'react';
import { SHORTCODE_DEFINITIONS, SHORTCODE_CATEGORIES, buildShortcodeText, type ShortcodeDefinition } from './shortcodeDefinitions';
import { Braces, ChevronDown, ChevronUp } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Single generic "shortcode" custom block                           */
/*  Stores: shortcodeName + serialized params JSON + innerContent     */
/*  Renders: visual card with param editors per shortcode type        */
/* ------------------------------------------------------------------ */

// Inline component for editing shortcode params inside the block
function ShortcodeBlockRenderer({
  block,
  editor,
}: {
  block: any;
  editor: any;
  contentRef?: (node: HTMLElement | null) => void;
}) {
  const shortcodeName: string = block.props.shortcodeName || '';
  const paramsJson: string = block.props.paramsJson || '{}';
  const innerContent: string = block.props.innerContent || '';

  const [expanded, setExpanded] = useState(true);
  const [params, setParams] = useState<Record<string, string>>(() => {
    try { return JSON.parse(paramsJson); } catch { return {}; }
  });
  const [inner, setInner] = useState(innerContent);

  const def = SHORTCODE_DEFINITIONS.find((d) => d.name === shortcodeName);

  // Sync local state back to block props
  const syncToBlock = useCallback(
    (newParams: Record<string, string>, newInner?: string) => {
      editor.updateBlock(block, {
        props: {
          paramsJson: JSON.stringify(newParams),
          ...(newInner !== undefined ? { innerContent: newInner } : {}),
        },
      });
    },
    [editor, block],
  );

  const handleParamChange = useCallback(
    (name: string, value: string) => {
      setParams((prev) => {
        const next = { ...prev, [name]: value };
        syncToBlock(next, inner);
        return next;
      });
    },
    [syncToBlock, inner],
  );

  const handleInnerChange = useCallback(
    (value: string) => {
      setInner(value);
      syncToBlock(params, value);
    },
    [syncToBlock, params],
  );

  // Keep local state in sync if block props change externally
  useEffect(() => {
    try {
      const parsed = JSON.parse(paramsJson);
      setParams(parsed);
    } catch { /* ignore */ }
  }, [paramsJson]);

  useEffect(() => {
    setInner(innerContent);
  }, [innerContent]);

  if (!def) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-red-300 bg-red-50 dark:bg-red-950/20 p-3"
        contentEditable={false}
      >
        <span className="text-red-500 text-sm">Unknown shortcode: [{shortcodeName}]</span>
      </div>
    );
  }

  const category = SHORTCODE_CATEGORIES[def.category];
  const preview = buildShortcodeText(def, { ...params, innerContent: inner });

  return (
    <div
      className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden my-1 select-none"
      contentEditable={false}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-blue-100/80 dark:bg-blue-900/40 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Braces className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">{def.name}</span>
        <span className="text-xs text-blue-600/70 dark:text-blue-400/70 ml-1">
          {category?.tr || def.category}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <code className="text-[10px] bg-blue-200/60 dark:bg-blue-800/60 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 max-w-[200px] truncate">
            {preview}
          </code>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-3 space-y-2">
          {def.params.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {def.params.map((p) => (
                <label key={p.name} className="block text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {p.name}
                    {p.default && (
                      <span className="text-gray-400 ml-1">({p.default})</span>
                    )}
                  </span>
                  <input
                    type="text"
                    className="mt-0.5 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder={p.desc}
                    value={params[p.name] || ''}
                    onChange={(e) => handleParamChange(p.name, e.target.value)}
                  />
                </label>
              ))}
            </div>
          )}
          {def.params.length === 0 && !def.isPaired && (
            <p className="text-xs text-gray-500 italic">{def.description}</p>
          )}
          {def.isPaired && (
            <label className="block text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">Inner Content</span>
              <textarea
                className="mt-0.5 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-400 min-h-[60px]"
                placeholder="HTML content..."
                value={inner}
                onChange={(e) => handleInnerChange(e.target.value)}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// Simple HTML output for external export (raw shortcode text)
function ShortcodeExternalHTML({ block }: { block: any }) {
  const shortcodeName: string = block.props.shortcodeName || '';
  const paramsJson: string = block.props.paramsJson || '{}';
  const innerContent: string = block.props.innerContent || '';
  const def = SHORTCODE_DEFINITIONS.find((d) => d.name === shortcodeName);
  if (!def) return <p>[{shortcodeName}]</p>;
  let params: Record<string, string> = {};
  try { params = JSON.parse(paramsJson); } catch { /* ignore */ }
  const text = buildShortcodeText(def, { ...params, innerContent });
  return <p>{text}</p>;
}

/* ------------------------------------------------------------------ */
/*  Block Spec Creation                                                */
/* ------------------------------------------------------------------ */

// createReactBlockSpec returns a factory function; call it to get the BlockSpec
const shortcodeBlockSpecFactory = createReactBlockSpec(
  {
    type: 'shortcode' as const,
    propSchema: {
      shortcodeName: { default: '' },
      paramsJson: { default: '{}' },
      innerContent: { default: '' },
    },
    content: 'none' as const,
  },
  {
    render: (props) => (
      <ShortcodeBlockRenderer
        block={props.block}
        editor={props.editor}
        contentRef={props.contentRef}
      />
    ),
    toExternalHTML: (props) => <ShortcodeExternalHTML block={props.block} />,
  },
);

export const shortcodeBlockSpec = shortcodeBlockSpecFactory();

/* ------------------------------------------------------------------ */
/*  Schema creation with shortcode block added                        */
/* ------------------------------------------------------------------ */

export const wpBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    shortcode: shortcodeBlockSpec as any,
  },
});

export type WPBlockNoteSchema = typeof wpBlockNoteSchema;
