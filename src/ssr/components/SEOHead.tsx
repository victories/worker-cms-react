/** @jsxImportSource react */
import { Fragment } from 'react';

/**
 * SEOHead — set of `<head>` tags for SEO, Open Graph, Twitter Card, and
 * optional JSON-LD structured data. React port of
 * `src/components/SEOHead.tsx`.
 *
 * Consumers pass this to `<Shell head={<SEOHead ... />}>` — the Shell
 * already emits the charset / viewport / title, so those are NOT
 * repeated here to avoid duplicate tags.
 *
 * `jsonLd` is written as a raw `<script type="application/ld+json">`
 * block via `dangerouslySetInnerHTML`; callers are expected to pre-
 * serialise JSON.stringify(...) themselves so multiple schema objects
 * can be concatenated in a single string.
 */

export interface SEOHeadProps {
  title: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ampUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | string;
  siteName: string;
  lang: string;
  publishedAt?: string;
  authorName?: string;
  /** Pre-serialised JSON-LD payload (one or more `<script>` bodies joined) */
  jsonLd?: string;
}

/**
 * Clean text for meta descriptions:
 * - strip [shortcodes]
 * - strip HTML tags
 * - collapse whitespace
 * - truncate at ~160 chars on word boundary
 */
function sanitizeMeta(text: string): string {
  if (!text) return '';
  let s = text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length > 160) {
    s = s.substring(0, 157);
    const lastSpace = s.lastIndexOf(' ');
    if (lastSpace > 120) s = s.substring(0, lastSpace);
    s += '...';
  }
  return s;
}

export function SEOHead(props: SEOHeadProps) {
  const desc = sanitizeMeta(props.description || '');
  const ogType = props.ogType || 'website';
  const fullTitle = `${props.title} | ${props.siteName}`;

  return (
    <Fragment>
      <title>{fullTitle}</title>
      {desc ? <meta name="description" content={desc} /> : null}
      {props.keywords ? <meta name="keywords" content={props.keywords} /> : null}
      {props.canonicalUrl ? <link rel="canonical" href={props.canonicalUrl} /> : null}
      {props.ampUrl ? <link rel="amphtml" href={props.ampUrl} /> : null}

      {/* Open Graph */}
      <meta property="og:title" content={props.title} />
      {desc ? <meta property="og:description" content={desc} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={props.siteName} />
      {props.canonicalUrl ? <meta property="og:url" content={props.canonicalUrl} /> : null}
      {props.ogImage ? <meta property="og:image" content={props.ogImage} /> : null}
      <meta
        property="og:locale"
        content={props.lang === 'tr' ? 'tr_TR' : 'en_US'}
      />

      {/* Twitter Card */}
      <meta
        name="twitter:card"
        content={props.ogImage ? 'summary_large_image' : 'summary'}
      />
      <meta name="twitter:title" content={props.title} />
      {desc ? <meta name="twitter:description" content={desc} /> : null}
      {props.ogImage ? <meta name="twitter:image" content={props.ogImage} /> : null}

      {/* Article metadata */}
      {props.publishedAt ? (
        <meta property="article:published_time" content={props.publishedAt} />
      ) : null}
      {props.authorName ? (
        <meta property="article:author" content={props.authorName} />
      ) : null}

      {/* JSON-LD structured data */}
      {props.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: props.jsonLd }}
        />
      ) : null}
    </Fragment>
  );
}
