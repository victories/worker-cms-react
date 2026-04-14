/**
 * Schema.org JSON-LD structured data builders for Rich Snippets.
 *
 * Generates structured data for:
 * - Article/BlogPosting (post pages)
 * - WebSite + SearchAction (homepage)
 * - CollectionPage (category/tag archives)
 * - BreadcrumbList (navigation breadcrumbs)
 * - SearchResultsPage (search results)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchemaPost {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  created_at?: string;
  author_name: string;
  featured_image_url?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  post_type?: string;
  language?: string;
}

export interface SchemaSite {
  name: string;
  description?: string | null;
}

export interface SchemaTaxonomy {
  name: string;
  slug: string;
  type: string;
  description?: string | null;
  count?: number;
}

interface SchemaOptions {
  logoUrl?: string | null;
  ogImage?: string | null;
  lang?: string;
  categories?: { name: string; slug: string }[];
  tags?: { name: string; slug: string }[];
  timezone?: string;
  siteUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and shortcodes from text */
function stripHtml(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, '')       // strip [shortcode ...]
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/&[a-z]+;/gi, ' ')       // strip HTML entities
    .replace(/\s+/g, ' ')
    .trim();
}

/** Estimate word count from content */
function wordCount(text: string): number {
  const clean = stripHtml(text);
  return clean.split(/\s+/).filter(Boolean).length;
}

/** Escape special chars in JSON string values */
function safeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Common timezone offset map (IANA timezone → UTC offset string) */
const TIMEZONE_OFFSETS: Record<string, string> = {
  'Europe/Istanbul': '+03:00',
  'Europe/London': '+00:00',
  'Europe/Berlin': '+01:00',
  'Europe/Paris': '+01:00',
  'Europe/Moscow': '+03:00',
  'America/New_York': '-05:00',
  'America/Chicago': '-06:00',
  'America/Denver': '-07:00',
  'America/Los_Angeles': '-08:00',
  'Asia/Tokyo': '+09:00',
  'Asia/Shanghai': '+08:00',
  'Asia/Dubai': '+04:00',
  'Asia/Kolkata': '+05:30',
  'Australia/Sydney': '+11:00',
  'Pacific/Auckland': '+13:00',
  'UTC': '+00:00',
};

/**
 * Format an ISO date string with timezone offset.
 * Input: "2026-02-17T17:00:00" or "2026-02-17T17:00:00.000Z"
 * Output: "2026-02-17T17:00:00+03:00" (with given timezone offset)
 */
function formatDateWithTimezone(dateStr: string, timezone?: string): string {
  if (!dateStr) return dateStr;
  // Determine the offset string
  const offset = (timezone && TIMEZONE_OFFSETS[timezone]) || '+03:00'; // default GMT+3
  // Strip existing Z or timezone suffix, keep only datetime part
  const dt = dateStr.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
  // Ensure we have seconds
  const parts = dt.split('T');
  if (parts.length < 2) return dt + 'T00:00:00' + offset;
  // Remove milliseconds if present
  const timePart = parts[1].split('.')[0];
  // Ensure HH:MM:SS format
  const timeSegments = timePart.split(':');
  while (timeSegments.length < 3) timeSegments.push('00');
  return `${parts[0]}T${timeSegments.join(':')}${offset}`;
}

// ---------------------------------------------------------------------------
// Article Schema (for post/page detail pages)
// ---------------------------------------------------------------------------

export function buildArticleSchema(
  post: SchemaPost,
  site: SchemaSite,
  canonicalUrl: string,
  options: SchemaOptions = {},
): Record<string, unknown> {
  const rawDatePublished = post.published_at || post.created_at || new Date().toISOString();
  const rawDateModified = post.updated_at || rawDatePublished;
  const datePublished = formatDateWithTimezone(rawDatePublished, options.timezone);
  const dateModified = formatDateWithTimezone(rawDateModified, options.timezone);

  const description = post.seo_description
    || (post.excerpt ? stripHtml(post.excerpt) : '')
    || (post.content ? stripHtml(post.content).substring(0, 160) : '');

  const author: Record<string, unknown> = {
    '@type': 'Person',
    name: post.author_name,
  };
  if (options.siteUrl) {
    author.url = options.siteUrl;
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': post.post_type === 'page' ? 'WebPage' : 'BlogPosting',
    headline: post.title.length > 110 ? post.title.slice(0, 110) : post.title,
    description: description.length > 300 ? description.substring(0, 300) : description,
    datePublished,
    dateModified,
    url: canonicalUrl,
    inLanguage: options.lang || 'tr',
    author,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      ...(options.logoUrl ? {
        logo: {
          '@type': 'ImageObject',
          url: options.logoUrl,
        },
      } : {}),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  // Image
  if (options.ogImage) {
    schema.image = {
      '@type': 'ImageObject',
      url: options.ogImage,
      width: 1200,
      height: 630,
    };
  }

  // Keywords
  if (post.seo_keywords) {
    schema.keywords = post.seo_keywords;
  } else if (options.tags && options.tags.length > 0) {
    schema.keywords = options.tags.map(t => t.name).join(', ');
  }

  // Article section (first category)
  if (options.categories && options.categories.length > 0) {
    schema.articleSection = options.categories[0].name;
  }

  // Word count
  if (post.content) {
    schema.wordCount = wordCount(post.content);
  }

  return schema;
}

// ---------------------------------------------------------------------------
// WebSite Schema (for homepage)
// ---------------------------------------------------------------------------

export function buildWebSiteSchema(
  site: SchemaSite,
  siteUrl: string,
  options: { logoUrl?: string | null; lang?: string; searchPath?: string } = {},
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: siteUrl,
    inLanguage: options.lang || 'tr',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}${options.searchPath || '/search'}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  if (site.description) {
    schema.description = site.description;
  }

  if (options.logoUrl) {
    schema.publisher = {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: options.logoUrl,
      },
    };
  }

  return schema;
}

// ---------------------------------------------------------------------------
// Organization Schema (for homepage, alongside WebSite)
// ---------------------------------------------------------------------------

export function buildOrganizationSchema(
  site: SchemaSite,
  siteUrl: string,
  options: { logoUrl?: string | null } = {},
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: siteUrl,
  };

  if (site.description) {
    schema.description = site.description;
  }

  if (options.logoUrl) {
    schema.logo = {
      '@type': 'ImageObject',
      url: options.logoUrl,
    };
  }

  return schema;
}

// ---------------------------------------------------------------------------
// CollectionPage Schema (for category/tag archive pages)
// ---------------------------------------------------------------------------

export function buildCollectionPageSchema(
  taxonomy: SchemaTaxonomy,
  site: SchemaSite,
  canonicalUrl: string,
  options: { lang?: string } = {},
): Record<string, unknown> {
  const typeLabel = taxonomy.type === 'category'
    ? (options.lang === 'tr' ? 'Kategori' : 'Category')
    : (options.lang === 'tr' ? 'Etiket' : 'Tag');

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${typeLabel}: ${taxonomy.name}`,
    description: taxonomy.description || `${typeLabel}: ${taxonomy.name}`,
    url: canonicalUrl,
    inLanguage: options.lang || 'tr',
    isPartOf: {
      '@type': 'WebSite',
      name: site.name,
    },
  };
}

// ---------------------------------------------------------------------------
// BreadcrumbList Schema
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ---------------------------------------------------------------------------
// SearchResultsPage Schema
// ---------------------------------------------------------------------------

export function buildSearchResultsSchema(
  query: string,
  site: SchemaSite,
  canonicalUrl: string,
  options: { lang?: string } = {},
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    name: `${options.lang === 'tr' ? 'Arama' : 'Search'}: ${query}`,
    url: canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: site.name,
    },
  };
}

// ---------------------------------------------------------------------------
// ItemList Schema (for blog listing / archive post lists)
// ---------------------------------------------------------------------------

export function buildItemListSchema(
  posts: { title: string; url: string; image?: string | null }[],
): Record<string, unknown> | null {
  if (posts.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: post.url,
      name: post.title,
    })),
  };
}

// ---------------------------------------------------------------------------
// Serializer — renders one or more schemas as JSON-LD script tags
// ---------------------------------------------------------------------------

export function renderJsonLd(
  ...schemas: (Record<string, unknown> | null | undefined)[]
): string {
  return schemas
    .filter(Boolean)
    .map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');
}
