import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';

interface SEOHeadProps {
  title: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ampUrl?: string;
  ogImage?: string;
  ogType?: string;
  siteName: string;
  lang: string;
  publishedAt?: string;
  authorName?: string;
  /** JSON-LD structured data string(s) — rendered as <script type="application/ld+json"> */
  jsonLd?: string;
}

/**
 * Sanitize text for SEO meta tags:
 * - Strip shortcode tags [shortcode ...]
 * - Strip HTML tags
 * - Collapse whitespace
 * - Trim to ~160 chars on word boundary
 */
function sanitizeMeta(text: string): string {
  if (!text) return '';
  let s = text
    .replace(/\[[^\]]*\]/g, '')      // strip [shortcode ...] tags
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/&[a-z]+;/gi, ' ')       // strip HTML entities
    .replace(/\s+/g, ' ')            // collapse whitespace
    .trim();
  if (s.length > 160) {
    s = s.substring(0, 157);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > 120) s = s.substring(0, lastSpace);
    s += '...';
  }
  return s;
}

export const SEOHead: FC<SEOHeadProps> = (props) => {
  const desc = sanitizeMeta(props.description || '');
  const ogType = props.ogType || 'website';

  return (
    <>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{props.title} | {props.siteName}</title>
      {desc && <meta name="description" content={desc} />}
      {props.keywords && <meta name="keywords" content={props.keywords} />}
      {props.canonicalUrl && <link rel="canonical" href={props.canonicalUrl} />}
      {props.ampUrl && <link rel="amphtml" href={props.ampUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={props.title} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={props.siteName} />
      {props.canonicalUrl && <meta property="og:url" content={props.canonicalUrl} />}
      {props.ogImage && <meta property="og:image" content={props.ogImage} />}
      <meta property="og:locale" content={props.lang === 'tr' ? 'tr_TR' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={props.ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={props.title} />
      {desc && <meta name="twitter:description" content={desc} />}
      {props.ogImage && <meta name="twitter:image" content={props.ogImage} />}

      {/* Article metadata */}
      {props.publishedAt && <meta property="article:published_time" content={props.publishedAt} />}
      {props.authorName && <meta property="article:author" content={props.authorName} />}

      {/* JSON-LD Structured Data */}
      {props.jsonLd && raw(props.jsonLd)}
    </>
  );
};
