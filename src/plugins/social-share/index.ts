import type { Post, Site } from '../../types';

/**
 * Social Share Plugin
 *
 * Adds social media sharing buttons to posts with SVG icons.
 * Supported platforms: X (Twitter), Facebook, LinkedIn, WhatsApp,
 * Telegram, Reddit, Pinterest, Email, Copy Link.
 */

interface PlatformConfig {
  name: string;
  color: string;
  hoverColor: string;
  icon: string; // SVG icon
  shareUrl: (url: string, title: string) => string;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  x: {
    name: 'X',
    color: '#000000',
    hoverColor: '#333333',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    shareUrl: (url, title) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  facebook: {
    name: 'Facebook',
    color: '#1877f2',
    hoverColor: '#0d65d9',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    shareUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0a66c2',
    hoverColor: '#084e96',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    shareUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  whatsapp: {
    name: 'WhatsApp',
    color: '#25d366',
    hoverColor: '#1da851',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    shareUrl: (url, title) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
  },
  telegram: {
    name: 'Telegram',
    color: '#0088cc',
    hoverColor: '#006da3',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    shareUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  reddit: {
    name: 'Reddit',
    color: '#ff4500',
    hoverColor: '#cc3700',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.095z"/></svg>',
    shareUrl: (url, title) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  pinterest: {
    name: 'Pinterest',
    color: '#e60023',
    hoverColor: '#c2001d',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>',
    shareUrl: (url, title) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`,
  },
  email: {
    name: 'E-posta',
    color: '#666666',
    hoverColor: '#444444',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    shareUrl: (url, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
  copylink: {
    name: 'Kopyala',
    color: '#6b7280',
    hoverColor: '#4b5563',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    shareUrl: () => '#copy',
  },
};

function buildShareButtonsHtml(
  post: Post,
  enabledPlatforms: string[],
  style: string
): string {
  const postTitle = post.title || '';
  const isIconStyle = style === 'icons';

  const buttons = enabledPlatforms
    .filter((p) => PLATFORMS[p])
    .map((platformKey) => {
      const platform = PLATFORMS[platformKey];
      const dataAttrs = `data-platform="${platformKey}" data-slug="${post.slug}" data-title="${postTitle.replace(/"/g, '&quot;')}"`;

      if (isIconStyle) {
        return (
          `<a class="social-share-btn" ${dataAttrs} ` +
          `href="#" target="_blank" rel="noopener noreferrer" ` +
          `style="display:inline-flex;align-items:center;justify-content:center;` +
          `width:36px;height:36px;` +
          `background:${platform.color};color:#fff;text-decoration:none;` +
          `border-radius:50%;font-size:0.85em;transition:all 0.2s;" ` +
          `title="${platform.name}">${platform.icon}</a>`
        );
      }

      // Default: buttons with icon + name
      return (
        `<a class="social-share-btn" ${dataAttrs} ` +
        `href="#" target="_blank" rel="noopener noreferrer" ` +
        `style="display:inline-flex;align-items:center;gap:6px;` +
        `padding:8px 14px;` +
        `background:${platform.color};color:#fff;text-decoration:none;` +
        `border-radius:6px;font-size:0.85em;` +
        `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;` +
        `transition:all 0.2s;">${platform.icon} ${platform.name}</a>`
      );
    })
    .join('\n    ');

  const label = `<span style="font-size:0.85em;color:#666;margin-right:8px;font-weight:600;">Paylas:</span>`;

  return (
    `<div class="social-share-buttons" style="` +
    `display:flex;flex-wrap:wrap;align-items:center;gap:6px;` +
    `padding:14px 0;margin:16px 0;` +
    `border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">\n` +
    `    ${label}\n` +
    `    ${buttons}\n` +
    `</div>`
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
  const enabledPlatforms = platformsStr.split(',').map((p: string) => p.trim().toLowerCase()).filter(Boolean);
  const position = settings.position || 'bottom';
  const style = settings.style || 'buttons';

  // ── Hook: post.beforeRender ──
  engine.register(SLUG, 'post.beforeRender', (html: string, post: Post): string => {
    if (!html || enabledPlatforms.length === 0) return html;

    const shareHtml = buildShareButtonsHtml(post, enabledPlatforms, style);

    if (position === 'top') {
      return shareHtml + html;
    } else if (position === 'both') {
      return shareHtml + html + shareHtml;
    }
    return html + shareHtml;
  }, 20);

  // ── Hook: page.head ──
  engine.register(SLUG, 'page.head', (html: string, _site: Site): string => {
    const css = `
<style>
  .social-share-btn {
    transition: all 0.2s ease;
  }
  .social-share-btn:hover {
    opacity: 0.88;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  }
  .social-share-btn svg {
    flex-shrink: 0;
  }
  .social-share-copied {
    background: #16a34a !important;
  }
  @media print {
    .social-share-buttons { display: none !important; }
  }
</style>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var origin = window.location.origin;
    var shareLinks = document.querySelectorAll('.social-share-btn');
    shareLinks.forEach(function(el) {
      var platform = el.getAttribute('data-platform');
      var slug = el.getAttribute('data-slug');
      var title = el.getAttribute('data-title') || '';
      var url = origin + '/' + slug;

      if (platform === 'copylink') {
        el.removeAttribute('target');
        el.addEventListener('click', function(e) {
          e.preventDefault();
          navigator.clipboard.writeText(url).then(function() {
            var original = el.innerHTML;
            el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            el.classList.add('social-share-copied');
            setTimeout(function() {
              el.innerHTML = original;
              el.classList.remove('social-share-copied');
            }, 2000);
          });
        });
        return;
      }

      var href = '#';
      if (platform === 'x') {
        href = 'https://x.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title);
      } else if (platform === 'facebook') {
        href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
      } else if (platform === 'linkedin') {
        href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
      } else if (platform === 'whatsapp') {
        href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(title + ' ' + url);
      } else if (platform === 'telegram') {
        href = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title);
      } else if (platform === 'reddit') {
        href = 'https://www.reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title);
      } else if (platform === 'pinterest') {
        href = 'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(url) + '&description=' + encodeURIComponent(title);
      } else if (platform === 'email') {
        href = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url);
        el.removeAttribute('target');
      }
      el.setAttribute('href', href);
    });
  });
</script>`;

    return html + css;
  }, 20);
}
