/** @jsxImportSource react */
import { Card, CardContent } from '@ui/card';
import { Badge } from '@ui/badge';
import { cn, formatDate } from '@ui/lib/utils';
import type { PublicPost, PublicTaxonomy } from '../../lib/public-db';

/**
 * PostCard — shadcn-styled post preview. React port of
 * `src/components/PostCard.tsx`.
 *
 * Feature thumbnail resolution order:
 *   1. `post.featured_image_url` (media JOIN in getPublicPosts)
 *   2. `post.og_image_r2_key`
 *   3. First `<img src="...">` in post.content
 *   4. No image — card renders without a thumbnail
 *
 * The `isLCP` prop marks the single largest above-the-fold post on a
 * page. For that one image we emit `fetchpriority="high"` and
 * `loading="eager"`; all others get `loading="lazy"`. This is the
 * simplest Lighthouse LCP optimisation and comes directly from the
 * Hono JSX original.
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
  className,
}: PostCardProps) {
  const url = `${lp}/${post.slug}`;
  const isSticky = post.is_sticky === 1;
  const imgSrc = resolveImageUrl(post, siteId);
  const hasImage = imgSrc !== '';

  return (
    <Card
      className={cn(
        'group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md',
        isSticky && 'ring-2 ring-primary/40',
        className
      )}
    >
      {hasImage ? (
        <a href={url} className="block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={post.title}
            className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            {...(isLCP
              ? { fetchPriority: 'high', loading: 'eager' }
              : { loading: 'lazy' })}
          />
        </a>
      ) : null}

      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{post.author_name}</span>
          {post.published_at ? (
            <>
              <span aria-hidden="true">·</span>
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

        <h2 className="text-xl font-semibold leading-tight tracking-tight">
          <a
            href={url}
            className="text-foreground transition-colors hover:text-primary"
          >
            {post.title}
          </a>
        </h2>

        {post.excerpt ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
        ) : null}

        <a
          href={url}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {lang === 'tr' ? 'Devamını Oku' : 'Read more'}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      </CardContent>
    </Card>
  );
}
