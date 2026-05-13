import { Badge } from '@ui/badge';
import { cn, formatDate } from '@ui/lib/utils';
import type { PublicPost, PublicTaxonomy } from '../../lib/public-db';
import { cfImage, cfImageSrcSet } from '../../lib/cf-image';

/**
 * PostCard — classic-blog list item used by the homepage, archives,
 * search and any other route that streams posts.
 *
 * Layout (intentionally simple, optimised for skim-reading):
 *
 *   [ Title (linked, full-width)                          ]
 *   [ Meta line: author · date · category badges          ]
 *   [ ┌─────┐                                             ]
 *   [ │thmb │  Excerpt — clamped to ~3 lines              ]
 *   [ └─────┘                                             ]
 *   ────────────────  separator (border-b on the wrapper) ─
 *
 * No thumbnail → the excerpt expands to fill the row. Sticky posts get
 * a thin primary-coloured rail on the left so they still stand out.
 *
 * Feature thumbnail resolution order:
 *   1. `post.featured_image_url` (media JOIN in getPublicPosts)
 *   2. `post.og_image_r2_key`
 *   3. First `<img src="...">` in post.content
 *   4. No image — body uses the full row.
 */

export interface PostCardProps {
  post: PublicPost;
  lang: string;
  /** Language prefix produced by `langPrefix(lang, defaultLang)` */
  lp: string;
  categories?: PublicTaxonomy[];
  siteId: number;
  /** First visible post — hints to the browser for LCP boost */
  isLCP?: boolean;
  /** Enables Cloudflare Image Transformations (paid feature). */
  imageTransforms?: boolean;
  className?: string;
}

function extractFirstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function resolveImageUrl(post: PublicPost, siteId: number): string {
  const rewrite = (key: string) =>
    key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`);

  if (post.featured_image_url) return `/uploads/${rewrite(post.featured_image_url)}`;
  if (post.og_image_r2_key) return `/uploads/${rewrite(post.og_image_r2_key)}`;
  if (post.content) {
    const contentImg = extractFirstImageSrc(post.content);
    if (contentImg) return contentImg;
  }
  return '';
}

export function PostCard({
  post,
  lang,
  lp,
  categories,
  siteId,
  isLCP,
  imageTransforms,
  className,
}: PostCardProps) {
  const url = `${lp}/${post.slug}`;
  const isSticky = post.is_sticky === 1;
  const imgSrc = resolveImageUrl(post, siteId);
  const hasImage = imgSrc !== '';
  // Thumbnail: 320px @ 1x, 640px @ 2x — w-32 sm:w-40 → ~128-160 CSS px.
  const thumbSrc = cfImage(
    imgSrc,
    { width: 320, format: 'auto', quality: 85, fit: 'cover' },
    !!imageTransforms
  );
  const thumbSrcSet = cfImageSrcSet(
    imgSrc,
    [320, 480, 640],
    { format: 'auto', quality: 85, fit: 'cover' },
    !!imageTransforms
  );

  return (
    <article
      className={cn(
        'border-b border-border/60 pb-6 last:border-0 group',
        isSticky && 'border-l-2 border-l-primary pl-4',
        className
      )}
    >
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight mb-2">
        <a
          href={url}
          className="text-foreground transition-colors hover:text-primary"
        >
          {post.title}
        </a>
      </h2>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-3">
        {post.author_name ? (
          <span className="font-medium text-foreground/80">{post.author_name}</span>
        ) : null}
        {post.published_at ? (
          <>
            {post.author_name ? <span aria-hidden="true">·</span> : null}
            <time dateTime={post.published_at}>
              {formatDate(post.published_at, lang)}
            </time>
          </>
        ) : null}
        {categories && categories.length > 0 ? (
          <div className="ml-1 flex flex-wrap gap-1">
            {categories.map((cat) => (
              <a key={cat.id} href={`${lp}/category/${cat.slug}`}>
                <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground">
                  {cat.name}
                </Badge>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex gap-4 items-start">
        {hasImage ? (
          <a
            href={url}
            className="shrink-0 block w-32 sm:w-40 aspect-[4/3] overflow-hidden rounded-md bg-muted"
            aria-hidden="true"
            tabIndex={-1}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc}
              srcSet={thumbSrcSet || undefined}
              sizes="(min-width:640px) 160px, 128px"
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              {...(isLCP
                ? { fetchPriority: 'high', loading: 'eager' }
                : { loading: 'lazy' })}
            />
          </a>
        ) : null}

        {post.excerpt ? (
          <p className="line-clamp-3 text-sm sm:text-base text-muted-foreground leading-relaxed flex-1 min-w-0">
            {post.excerpt}
          </p>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </article>
  );
}
