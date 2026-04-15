import type { ReactNode } from 'react';
import type { Post, Site } from '../../types';
import type { PluginPostContext } from '../../lib/plugins/types';

/**
 * SEO Optimizer Plugin — v2 (React hooks).
 *
 * Responsibilities:
 *   - `post.beforeSave`  → auto-generate meta description from content
 *                          when the author hasn't supplied one, and log
 *                          a warning if the title exceeds the
 *                          configured max length.
 *   - `ui.head`          → push a `<meta name="generator">` tag onto
 *                          every page's head node list.
 *   - `ui.slot.postHeader` → render an estimated reading-time badge
 *                            above the post body (opt-in via the
 *                            `addReadingTime` setting).
 */

// Strip HTML tags from a string
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Count words in a string
function countWords(text: string): number {
  const stripped = stripHtml(text);
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

// Calculate reading time in minutes (average ~200 words/min)
function calculateReadingTime(text: string): number {
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / 200));
}

// Truncate text to a maximum length at word boundary
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
}

function ReadingTimeBadge({ minutes }: { minutes: number }) {
  const label = minutes === 1 ? '1 min read' : `${minutes} min read`;
  return (
    <div className="seo-reading-time mb-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {label}
    </div>
  );
}

export function register(
  engine: { register: (slug: string, hook: string, handler: Function, priority?: number) => void },
  settings: Record<string, any>
): void {
  const SLUG = 'seo-optimizer';

  const autoMetaDescription = settings.autoMetaDescription !== false;
  const maxTitleLength = typeof settings.maxTitleLength === 'number' ? settings.maxTitleLength : 60;
  const addReadingTime = settings.addReadingTime !== false;
  const noindexDrafts = settings.noindexDrafts !== false;

  // ── Hook: post.beforeSave ──
  engine.register(SLUG, 'post.beforeSave', (post: Partial<Post>): Partial<Post> => {
    const modified = { ...post };

    if (autoMetaDescription && !modified.seo_description && modified.content) {
      const plainText = stripHtml(modified.content);
      if (plainText.length > 0) {
        modified.seo_description = truncateText(plainText, 160);
      }
    }

    if (modified.title && modified.title.length > maxTitleLength) {
      console.warn(
        `[SEO Optimizer] Title "${modified.title.substring(0, 40)}..." is ${modified.title.length} characters, ` +
        `exceeding the recommended maximum of ${maxTitleLength}. Consider shortening it for better SEO.`
      );
    }

    return modified;
  }, 10);

  // ── Hook: ui.head ──
  // Add a standard `<meta name="generator">` tag and, when enabled, a
  // site-level noindex pragma for draft-heavy staging sites.
  engine.register(SLUG, 'ui.head', (nodes: ReactNode[], _site: Site): ReactNode[] => {
    const extras: ReactNode[] = [
      <meta key="seo-generator" name="generator" content="WP-CMS with SEO Optimizer" />,
    ];
    if (noindexDrafts) {
      // Per-post noindex remains the responsibility of SEOHead.tsx
      // based on the post status; this is just an explicit marker
      // for crawl diagnostics on staging sites.
      extras.push(
        <meta key="seo-noindex-marker" name="seo-optimizer" content="noindex-drafts-enabled" />
      );
    }
    return [...nodes, ...extras];
  }, 10);

  // ── Hook: ui.slot.postHeader ──
  // Render reading-time badge above the post body. Uses post.content
  // at register time via closure-less handler signature.
  if (addReadingTime) {
    engine.register(SLUG, 'ui.slot.postHeader', (nodes: ReactNode[], post: PluginPostContext): ReactNode[] => {
      const minutes = calculateReadingTime(post.content || '');
      return [...nodes, <ReadingTimeBadge key="seo-reading-time" minutes={minutes} />];
    }, 5);
  }
}
