import { useEffect, useRef, useState } from 'react';
import { Button } from '@ui/button';
import { Loader2, Monitor, Smartphone, Tablet, RefreshCw, ExternalLink } from 'lucide-react';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

export interface PreviewFrameProps {
  /** Public URL of the site to preview (e.g. https://workercms.com/). */
  siteUrl: string;
  /** Style tokens to push into the iframe whenever they change. */
  styleTokens: unknown;
  /** Active color mode — applied as `dark` class on the previewed page. */
  colorMode: 'light' | 'dark';
  device?: PreviewDevice;
  onDeviceChange?(d: PreviewDevice): void;
}

/**
 * Sandboxed iframe that loads the site with `?design_preview=1` and
 * receives token updates via `postMessage`. The bridge inside the
 * site's Shell (`DESIGN_PREVIEW_BRIDGE` in src/ssr/shell.tsx) responds
 * with `design-preview-ready` once it's wired up; we hold off the
 * first push until then.
 */
export function PreviewFrame({
  siteUrl,
  styleTokens,
  colorMode,
  device = 'desktop',
  onDeviceChange,
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  // Build the preview URL (always includes the gate query).
  const url = new URL(siteUrl);
  url.searchParams.set('design_preview', '1');
  const previewUrl = url.toString();

  // Listen for the iframe's "ready" handshake.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'design-preview-ready') setReady(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Push style updates whenever they change (after ready).
  useEffect(() => {
    if (!ready) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'design-update', styleTokens }, '*');
  }, [ready, styleTokens]);

  // Push mode toggle.
  useEffect(() => {
    if (!ready) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'design-mode', mode: colorMode }, '*');
  }, [ready, colorMode]);

  function reload() {
    setReady(false);
    setLoading(true);
    if (iframeRef.current) iframeRef.current.src = previewUrl;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => {
            const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
            return (
              <Button
                key={d}
                size="sm"
                variant={device === d ? 'secondary' : 'ghost'}
                onClick={() => onDeviceChange?.(d)}
                className="h-7 px-2"
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          <span className="font-mono">{new URL(previewUrl).hostname}</span>
          <Button size="sm" variant="ghost" onClick={reload} className="h-7 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded p-1 hover:bg-accent"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/20 p-4">
        <iframe
          key={previewUrl}
          ref={iframeRef}
          src={previewUrl}
          title="Design preview"
          onLoad={() => setLoading(false)}
          className="rounded border border-border bg-background shadow-lg transition-all"
          style={{
            width: DEVICE_WIDTHS[device],
            maxWidth: '100%',
            height: 'calc(100vh - 220px)',
            minHeight: 600,
          }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
