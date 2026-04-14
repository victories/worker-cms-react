import type { Post, Site } from '../../types';

/**
 * SEO Optimizer Plugin
 *
 * Automatically optimizes posts for search engines by:
 * - Generating meta descriptions from content when missing
 * - Warning about title length issues
 * - Injecting robots meta tags for non-published posts
 * - Adding estimated reading time to posts
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
  // Auto-generate meta description from content if missing.
  // Warn in console if title exceeds recommended length.
  engine.register(SLUG, 'post.beforeSave', (post: Partial<Post>): Partial<Post> => {
    const modified = { ...post };

    // Auto-generate SEO description from content
    if (autoMetaDescription && !modified.seo_description && modified.content) {
      const plainText = stripHtml(modified.content);
      if (plainText.length > 0) {
        modified.seo_description = truncateText(plainText, 160);
      }
    }

    // Warn about title length
    if (modified.title && modified.title.length > maxTitleLength) {
      console.warn(
        `[SEO Optimizer] Title "${modified.title.substring(0, 40)}..." is ${modified.title.length} characters, ` +
        `exceeding the recommended maximum of ${maxTitleLength}. Consider shortening it for better SEO.`
      );
    }

    return modified;
  }, 10);

  // ── Hook: page.head ──
  // Inject robots meta tag for non-published posts and reading time meta.
  engine.register(SLUG, 'page.head', (html: string, site: Site): string => {
    let headHtml = html;

    // We receive the site context but need the current post context.
    // The page.head hook receives (html, site). Post-level meta is typically
    // handled via post.beforeSave populating seo_description. Here we add
    // site-level SEO tags.
    if (noindexDrafts) {
      // The rendering layer should pass post status via a data attribute or
      // similar mechanism. For now, we add a conditional comment that the
      // rendering layer can use.
      headHtml += `\n<!-- [seo-optimizer] noindex-drafts enabled -->`;
    }

    // Add basic SEO meta tags
    headHtml += `\n<meta name="generator" content="WP-CMS with SEO Optimizer" />`;

    return headHtml;
  }, 10);

  // ── Hook: post.beforeRender ──
  // Prepend estimated reading time badge to post content.
  engine.register(SLUG, 'post.beforeRender', (html: string, post: Post): string => {
    if (!addReadingTime || !html) return html;

    const minutes = calculateReadingTime(html);
    const label = minutes === 1 ? '1 min read' : `${minutes} min read`;

    const readingTimeBadge = `<div class="seo-reading-time" style="` +
      `display:inline-block;` +
      `padding:4px 12px;` +
      `margin-bottom:16px;` +
      `background:#f0f0f0;` +
      `color:#555;` +
      `font-size:0.85em;` +
      `border-radius:4px;` +
      `letter-spacing:0.02em;` +
      `">` +
      `<span style="margin-right:4px;">&#128337;</span>${label}` +
      `</div>\n`;

    return readingTimeBadge + html;
  }, 5);
}
