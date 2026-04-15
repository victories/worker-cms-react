/** @jsxImportSource react */
import type { ReactNode } from 'react';
import type { Site } from '../../types';
import type { PluginPostContext } from '../../lib/plugins/types';

/**
 * Social Share Plugin — v2 (React hooks).
 *
 * Responsibilities:
 *   - `ui.slot.postFooter` → render a row of shadcn-styled share
 *                            buttons below every post body.
 *   - `ui.bodyEnd` → emit the tiny hydration script that rewrites each
 *                    button's `href` based on the final page URL and
 *                    wires up copy-link behaviour.
 *
 * Platforms supported: X (Twitter), Facebook, LinkedIn, WhatsApp,
 * Telegram, Reddit, Pinterest, Email, Copy Link.
 */

const LABEL_TR = 'Paylaş:';
const LABEL_EN = 'Share:';

type PlatformKey =
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram'
  | 'reddit'
  | 'pinterest'
  | 'email'
  | 'copylink';

const PLATFORM_META: Record<
  PlatformKey,
  { name: string; bgClass: string; icon: ReactNode }
> = {
  x: {
    name: 'X',
    bgClass: 'bg-black text-white hover:bg-black/80',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    bgClass: 'bg-[#1877f2] text-white hover:bg-[#0d65d9]',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  linkedin: {
    name: 'LinkedIn',
    bgClass: 'bg-[#0a66c2] text-white hover:bg-[#084e96]',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  whatsapp: {
    name: 'WhatsApp',
    bgClass: 'bg-[#25d366] text-white hover:bg-[#1da851]',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  telegram: {
    name: 'Telegram',
    bgClass: 'bg-[#0088cc] text-white hover:bg-[#006da3]',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  reddit: {
    name: 'Reddit',
    bgClass: 'bg-[#ff4500] text-white hover:bg-[#cc3700]',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249z" />
      </svg>
    ),
  },
  pinterest: {
    name: 'Pinterest',
    bgClass: 'bg-[#e60023] text-white hover:bg-[#c2001d]',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
      </svg>
    ),
  },
  email: {
    name: 'E-posta',
    bgClass: 'bg-muted text-foreground hover:bg-muted/80',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  copylink: {
    name: 'Kopyala',
    bgClass: 'bg-muted text-foreground hover:bg-muted/80',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
};

/**
 * Hydration boot script.
 *
 * Runs once per page at DOMContentLoaded. For every `.wcms-share-btn`
 * element:
 *   1. Looks up the canonical page URL (`location.origin + location.pathname`).
 *   2. Reads `data-platform` + `data-title` from the button.
 *   3. Assigns the correct share-target URL.
 *   4. For the copy-link variant, intercepts click + writes the URL
 *      to `navigator.clipboard` with a tiny visual confirmation.
 *
 * Kept as an inline minified string because it's ~900 bytes — cheaper
 * than a hydration island for such a simple behaviour.
 */
const SOCIAL_SHARE_BOOT =
  "(function(){document.addEventListener('DOMContentLoaded',function(){var o=location.origin+location.pathname;document.querySelectorAll('.wcms-share-btn').forEach(function(el){var p=el.getAttribute('data-platform'),t=el.getAttribute('data-title')||'',u=o,h='#';if(p==='x')h='https://x.com/intent/tweet?url='+encodeURIComponent(u)+'&text='+encodeURIComponent(t);else if(p==='facebook')h='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(u);else if(p==='linkedin')h='https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(u);else if(p==='whatsapp')h='https://api.whatsapp.com/send?text='+encodeURIComponent(t+' '+u);else if(p==='telegram')h='https://t.me/share/url?url='+encodeURIComponent(u)+'&text='+encodeURIComponent(t);else if(p==='reddit')h='https://www.reddit.com/submit?url='+encodeURIComponent(u)+'&title='+encodeURIComponent(t);else if(p==='pinterest')h='https://pinterest.com/pin/create/button/?url='+encodeURIComponent(u)+'&description='+encodeURIComponent(t);else if(p==='email'){h='mailto:?subject='+encodeURIComponent(t)+'&body='+encodeURIComponent(u);el.removeAttribute('target');}else if(p==='copylink'){el.removeAttribute('target');el.addEventListener('click',function(e){e.preventDefault();navigator.clipboard&&navigator.clipboard.writeText(u).then(function(){var x=el.textContent;el.textContent='✓';setTimeout(function(){el.textContent=x;},1500);});});return;}el.setAttribute('href',h);});});})();";

function ShareButtons({
  post,
  platforms,
  style,
}: {
  post: PluginPostContext;
  platforms: PlatformKey[];
  style: 'icons' | 'buttons';
}) {
  const title = post.title || '';
  const isIconOnly = style === 'icons';

  return (
    <div className="wcms-share flex flex-wrap items-center gap-2 border-y border-border py-4 text-sm">
      <span className="mr-1 text-xs font-semibold text-muted-foreground">
        {LABEL_TR} / {LABEL_EN}
      </span>
      {platforms.map((key) => {
        const meta = PLATFORM_META[key];
        if (!meta) return null;
        const cls = isIconOnly
          ? `wcms-share-btn inline-flex size-9 items-center justify-center rounded-full transition-colors ${meta.bgClass}`
          : `wcms-share-btn inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${meta.bgClass}`;
        return (
          <a
            key={key}
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className={cls}
            data-platform={key}
            data-title={title}
            title={meta.name}
          >
            {meta.icon}
            {isIconOnly ? null : <span>{meta.name}</span>}
          </a>
        );
      })}
    </div>
  );
}

export function register(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  settings: Record<string, any>
): void {
  const SLUG = 'social-share';

  const platformsStr = typeof settings.platforms === 'string'
    ? settings.platforms
    : 'x,facebook,whatsapp,telegram,linkedin,reddit,pinterest,email,copylink';
  const enabledPlatforms = platformsStr
    .split(',')
    .map((p: string) => p.trim().toLowerCase())
    .filter((p: string): p is PlatformKey => p in PLATFORM_META);
  const style: 'icons' | 'buttons' = settings.style === 'icons' ? 'icons' : 'buttons';

  if (enabledPlatforms.length === 0) return;

  // ── Hook: ui.slot.postFooter ──
  engine.register(SLUG, 'ui.slot.postFooter', (nodes: ReactNode[], post: PluginPostContext): ReactNode[] => {
    return [
      ...nodes,
      <ShareButtons
        key="social-share-buttons"
        post={post}
        platforms={enabledPlatforms}
        style={style}
      />,
    ];
  }, 20);

  // ── Hook: ui.bodyEnd ──
  // Tiny hydration script that rewrites href values and wires copy-link.
  engine.register(SLUG, 'ui.bodyEnd', (nodes: ReactNode[], _site: Site): ReactNode[] => {
    return [
      ...nodes,
      <script
        key="social-share-boot"
        dangerouslySetInnerHTML={{ __html: SOCIAL_SHARE_BOOT }}
      />,
    ];
  }, 20);
}
