import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { PublicPost, PublicTaxonomy } from '../lib/public-db';
import { langPrefix } from '../lib/lang';

interface PostCardProps {
  post: PublicPost;
  lang: string;
  defaultLang: string;
  categories?: PublicTaxonomy[];
  siteId: number;
  isLCP?: boolean; // first visible post — eager load + fetchpriority high
}

function formatDate(dateStr: string, lang: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function extractFirstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function resolveImageUrl(post: PublicPost, siteId: number): string {
  // 1st priority: featured_image_url from media JOIN
  if (post.featured_image_url) {
    return `/uploads/${post.featured_image_url.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`;
  }
  // 2nd priority: og_image_r2_key
  if (post.og_image_r2_key) {
    return `/uploads/${post.og_image_r2_key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`;
  }
  // 3rd priority: first image in content
  if (post.content) {
    const contentImg = extractFirstImageSrc(post.content);
    if (contentImg) return contentImg;
  }
  return '';
}

export const PostCard: FC<PostCardProps> = ({ post, lang, defaultLang, categories, siteId, isLCP }) => {
  const lp = langPrefix(lang, defaultLang);
  const url = `${lp}/${post.slug}`;
  const isSticky = post.is_sticky === 1;

  const imgSrc = resolveImageUrl(post, siteId);
  const hasImage = !!imgSrc;

  return (
    <article class={`post-card${isSticky ? ' sticky' : ''}${hasImage ? ' has-thumb' : ''}`}>
      {hasImage && (
        <div class="card-thumb">
          <a href={url}>
            {raw(isLCP
              ? `<img class="featured-img" src="${imgSrc}" alt="${post.title.replace(/"/g, '&quot;')}" fetchpriority="high">`
              : `<img class="featured-img" src="${imgSrc}" alt="${post.title.replace(/"/g, '&quot;')}" loading="lazy">`
            )}
          </a>
        </div>
      )}
      <div class="card-body">
        <div class="post-meta">
          <span class="author">{post.author_name}</span>
          <span class="sep">&middot;</span>
          <span>{post.published_at ? formatDate(post.published_at, lang) : ''}</span>
          {categories && categories.map((cat) => (
            <a href={`${lp}/category/${cat.slug}`} class="tag">{cat.name}</a>
          ))}
        </div>
        <h2><a href={url}>{post.title}</a></h2>
        {post.excerpt && <div class="post-excerpt">{post.excerpt}</div>}
        <a href={url} class="read-more">
          {lang === 'tr' ? 'Devamını Oku' : 'Read More'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>
    </article>
  );
};
