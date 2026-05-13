// Contety API Client Library for Cloudflare Workers CMS
// API Documentation: https://api.contety.com/v1

import type { ContetyConfig, GlobalContetyConfig } from '../types';
import { sanitizeHtml, stripHtml } from './sanitize';
import { createSlug, ensureUniqueSlug } from './slug';
import { uploadFile } from './storage';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTETY_BASE_URL = 'https://api.contety.com/v1';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContetyApiResponse<T = unknown> {
  result: string;
  data: T;
}

export interface ContetyErrorResponse {
  message: string;
}

export interface ContetyAccount {
  name: string;
  email: string;
}

export interface ContetySubscription {
  plan: string;
  total_credits: number;
  used_credits: number;
  [key: string]: unknown;
}

export interface ContetyThirdPartyKey {
  id: number;
  [key: string]: unknown;
}

export interface ContetyLanguage {
  id: number;
  name: string;
  code: string;
}

export interface ContetyToneOfVoice {
  id: number;
  name: string;
  [key: string]: unknown;
}

export interface ContetyTemplate {
  id: number;
  code: string;
  name_en: string;
  name_tr: string;
}

export interface ContetyContentListItem {
  id: number;
  title: string | null;
  status: string;
  template_id: number | null;
  language_id: number | null;
  folder_id: number | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface ContetyContentDetail {
  id: number;
  title: string | null;
  status: string;
  contents: { type: string; text: string }[];
  [key: string]: unknown;
}

export interface ContetyContentFilters {
  language_id?: number;
  template_id?: number;
  folder_id?: number;
  title?: string;
  status?: 'draft' | 'processing' | 'completed' | 'failed';
  favorite?: boolean;
  page?: number;
}

export interface ContetyWpBlogPostRequest {
  chatgpt_version: string;
  language_id: number;
  focus_keyword: string;
  title: string;
  subheading?: string[];
  tone_of_voice_id?: number;
  custom_api_id?: number;
  image_source?: string;
}

export interface ContetyWpRecipeRequest {
  chatgpt_version: string;
  language_id: number;
  [key: string]: unknown;
}

export interface ContetyGoogleAdsRequest {
  chatgpt_version: string;
  language_id: number;
  content_count: number;
  product_text: string;
  tone_of_voice_id?: number;
  custom_api_id?: number;
}

export interface ContetyFbAdsRequest {
  chatgpt_version: string;
  language_id: number;
  content_count: number;
  product_text: string;
  tone_of_voice_id?: number;
  custom_api_id?: number;
}

export interface ContetyPaginatedResponse<T> {
  result: string;
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ImportContentConfig {
  default_status: string;
  default_author_id: number;
  default_category_id: number | null;
  default_language?: string;
  post_type?: 'post' | 'page';
}

// ─── API Client ──────────────────────────────────────────────────────────────

export async function contetyFetch<T>(
  apiKey: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${CONTETY_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Contety API network error: ${message}`);
  }

  // 204 No Content (e.g. delete)
  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const errBody = (await res.json()) as ContetyErrorResponse;
      if (errBody.message) {
        errorMessage = errBody.message;
      }
    } catch {
      // Could not parse error body
    }
    throw new Error(`Contety API error (${res.status}): ${errorMessage}`);
  }

  const data = (await res.json()) as ContetyApiResponse<T>;

  if (data.result !== 'success') {
    throw new Error(`Contety API returned unsuccessful result: ${data.result}`);
  }

  return data.data;
}

// ─── Account Endpoints ───────────────────────────────────────────────────────

export async function getAccount(apiKey: string): Promise<ContetyAccount> {
  return contetyFetch<ContetyAccount>(apiKey, '/account');
}

export async function getSubscription(apiKey: string): Promise<ContetySubscription> {
  return contetyFetch<ContetySubscription>(apiKey, '/account/subscription');
}

export async function getThirdPartyApiKeys(apiKey: string): Promise<ContetyThirdPartyKey[]> {
  return contetyFetch<ContetyThirdPartyKey[]>(apiKey, '/account/3rd-party-api-keys');
}

// ─── Reference Data Endpoints ────────────────────────────────────────────────

export async function getLanguages(apiKey: string): Promise<ContetyLanguage[]> {
  return contetyFetch<ContetyLanguage[]>(apiKey, '/languages');
}

export async function getToneOfVoices(apiKey: string): Promise<ContetyToneOfVoice[]> {
  return contetyFetch<ContetyToneOfVoice[]>(apiKey, '/tone-of-voices');
}

export async function getTemplates(apiKey: string): Promise<ContetyTemplate[]> {
  return contetyFetch<ContetyTemplate[]>(apiKey, '/templates');
}

// ─── Content Endpoints ───────────────────────────────────────────────────────

export async function getContentList(
  apiKey: string,
  filters?: ContetyContentFilters
): Promise<ContetyContentListItem[]> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.language_id !== undefined) params.set('filter[language_id]', String(filters.language_id));
    if (filters.template_id !== undefined) params.set('filter[template_id]', String(filters.template_id));
    if (filters.folder_id !== undefined) params.set('filter[folder_id]', String(filters.folder_id));
    if (filters.title !== undefined) params.set('filter[title]', filters.title);
    if (filters.status !== undefined) params.set('filter[status]', filters.status);
    if (filters.favorite !== undefined) params.set('filter[favorite]', filters.favorite ? '1' : '0');
    if (filters.page !== undefined) params.set('page', String(filters.page));
  }

  const query = params.toString();
  const endpoint = `/content${query ? `?${query}` : ''}`;

  return contetyFetch<ContetyContentListItem[]>(apiKey, endpoint);
}

export async function getContentDetail(
  apiKey: string,
  contentId: number
): Promise<ContetyContentDetail> {
  return contetyFetch<ContetyContentDetail>(apiKey, `/content/${contentId}`);
}

export async function deleteContent(apiKey: string, contentId: number): Promise<void> {
  await contetyFetch<void>(apiKey, `/content/${contentId}`, { method: 'DELETE' });
}

// ─── Content Creation Endpoints ──────────────────────────────────────────────

export async function createWordPressBlogPost(
  apiKey: string,
  body: ContetyWpBlogPostRequest
): Promise<ContetyContentDetail> {
  return contetyFetch<ContetyContentDetail>(apiKey, '/content/wordpress-blog-post', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createWpRecipe(
  apiKey: string,
  body: ContetyWpRecipeRequest
): Promise<ContetyContentDetail> {
  return contetyFetch<ContetyContentDetail>(apiKey, '/content/wp-recipe', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createGoogleAdsDescription(
  apiKey: string,
  body: ContetyGoogleAdsRequest
): Promise<ContetyContentDetail> {
  return contetyFetch<ContetyContentDetail>(apiKey, '/content/google-ads-description', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createFacebookAdsHeadline(
  apiKey: string,
  body: ContetyFbAdsRequest
): Promise<ContetyContentDetail> {
  return contetyFetch<ContetyContentDetail>(apiKey, '/content/facebook-ads-headline', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createFacebookAdsPrimaryText(
  apiKey: string,
  body: ContetyFbAdsRequest
): Promise<ContetyContentDetail> {
  return contetyFetch<ContetyContentDetail>(apiKey, '/content/facebook-ads-primary-text', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── API Key Fallback Helper ─────────────────────────────────────────────────

export async function getContetyApiKey(
  db: D1Database,
  siteId: number
): Promise<{ apiKey: string; source: 'site' | 'global' } | null> {
  try {
    // Check site-level config first
    const siteConfig = await db
      .prepare('SELECT api_key, is_enabled FROM contety_configs WHERE site_id = ?')
      .bind(siteId)
      .first<{ api_key: string | null; is_enabled: number }>();

    if (siteConfig?.api_key && siteConfig.is_enabled) {
      return { apiKey: siteConfig.api_key, source: 'site' };
    }

    // Fall back to global config
    const globalConfig = await db
      .prepare('SELECT api_key, is_enabled FROM global_contety_config WHERE id = 1')
      .first<{ api_key: string; is_enabled: number }>();

    if (globalConfig?.api_key && globalConfig.is_enabled) {
      return { apiKey: globalConfig.api_key, source: 'global' };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Import Content as Post ──────────────────────────────────────────────────

// Helper: download an external image and upload to R2, return media record id
async function downloadImageToR2(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  imageUrl: string,
  altText: string | null,
  authorId: number
): Promise<number | null> {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': 'WorkerCMS/1.0' } });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 100 || buffer.byteLength > 50 * 1024 * 1024) return null;

    // Extract filename from URL
    const urlPath = new URL(imageUrl).pathname;
    const originalName = urlPath.split('/').pop() || 'image.jpg';

    const { key, size } = await uploadFile(r2, siteId, buffer, originalName, contentType);

    const result = await db.prepare(
      'INSERT INTO media (site_id, r2_key, filename, mime_type, size, alt_text, author_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id'
    ).bind(siteId, key, originalName, contentType, size, altText, authorId).first<{ id: number }>();

    return result?.id || null;
  } catch {
    return null;
  }
}

// Helper: find all <img src="..."> in HTML, download to R2, replace URLs
export async function processContentImages(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  html: string,
  altText: string | null,
  authorId: number
): Promise<string> {
  // Match all img tags with src attribute
  const imgRegex = /<img\s[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const matches: { full: string; url: string }[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    // Only process external URLs (http/https), skip relative/data URIs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      matches.push({ full: match[0], url });
    }
  }

  if (matches.length === 0) return html;

  let result = html;
  for (const m of matches) {
    try {
      const res = await fetch(m.url, { headers: { 'User-Agent': 'WorkerCMS/1.0' } });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) continue;

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 100 || buffer.byteLength > 50 * 1024 * 1024) continue;

      const originalName = new URL(m.url).pathname.split('/').pop() || 'image.jpg';
      const { key } = await uploadFile(r2, siteId, buffer, originalName, contentType);

      // Build local URL: /uploads/s/{siteId}/...
      const localPath = `/uploads/${key.replace(`sites/${siteId}/uploads/`, `s/${siteId}/`)}`;

      // Replace src in the img tag, also set alt if missing
      let newTag = m.full.replace(m.url, localPath);
      if (altText && !newTag.includes('alt=')) {
        newTag = newTag.replace('<img ', `<img alt="${altText}" `);
      }
      result = result.replace(m.full, newTag);
    } catch {
      // Skip failed image downloads
    }
  }

  return result;
}

export async function importContentAsPost(
  db: D1Database,
  r2: R2Bucket,
  siteId: number,
  contetyContentData: ContetyContentDetail,
  config: ImportContentConfig
): Promise<number> {
  const metadata = (contetyContentData as any).metadata || {};

  // ── Extract content parts ──
  const postContent = contetyContentData.contents?.find((c) => c.type === 'post')
    || contetyContentData.contents?.find((c) => c.type !== 'title' && c.type !== 'meta_description' && c.type !== 'excerpt')
    || contetyContentData.contents?.[0];
  if (!postContent || !postContent.text) {
    throw new Error('Contety content has no content items');
  }

  const metaContent = contetyContentData.contents?.find((c) => c.type === 'meta_description');
  const excerptContent = contetyContentData.contents?.find((c) => c.type === 'excerpt');

  // ── Metadata fields ──
  const focusKeyword: string | null = metadata.focus_keyword || null;
  const featuredImageUrl: string | null = metadata.featured_image || null;
  const titleSlug: string | null = metadata.title_slug || null;

  // ── Title ──
  const title = contetyContentData.title || 'Untitled';

  // Resolve language: caller may omit, fall back to the site's default.
  let language = config.default_language;
  if (!language) {
    const siteRow = await db
      .prepare('SELECT default_language FROM sites WHERE id = ?')
      .bind(siteId)
      .first<{ default_language: string | null }>();
    language = siteRow?.default_language || 'tr';
  }

  // ── Slug: prefer title_slug from metadata, always slugify ──
  const baseSlug = createSlug(titleSlug || title);
  const slug = await ensureUniqueSlug(db, 'posts', baseSlug, siteId, language);

  // ── SEO fields ──
  const seoDescription = metaContent?.text || null;
  const seoKeywords = focusKeyword;

  // ── Excerpt: prefer excerpt content type, then meta_description, then auto-generate ──
  const excerpt = excerptContent?.text
    || metaContent?.text
    || (() => { const pt = stripHtml(postContent.text); return pt.length > 300 ? pt.slice(0, 300).replace(/\s+\S*$/, '') + '...' : pt; })();

  // ── Download & process images in content → R2 ──
  const sanitizedRaw = sanitizeHtml(postContent.text);
  const processedContent = await processContentImages(
    db, r2, siteId, sanitizedRaw, focusKeyword, config.default_author_id
  );

  // ── Download featured image → R2 ──
  let featuredImageId: number | null = null;
  if (featuredImageUrl) {
    featuredImageId = await downloadImageToR2(
      db, r2, siteId, featuredImageUrl, focusKeyword, config.default_author_id
    );
  }

  // ── Insert post ──
  const now = new Date().toISOString();
  const status = config.default_status || 'draft';
  const postType = config.post_type || 'post';
  const publishedAt = status === 'publish' ? now : null;

  const result = await db
    .prepare(
      `INSERT INTO posts (site_id, title, slug, content, excerpt, seo_description, seo_keywords, featured_image_id, status, post_type, author_id, language, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      siteId,
      title,
      slug,
      processedContent,
      excerpt,
      seoDescription,
      seoKeywords,
      featuredImageId,
      status,
      postType,
      config.default_author_id,
      language,
      now,
      now,
      publishedAt
    )
    .run();

  const postId = result.meta?.last_row_id;
  if (!postId) {
    throw new Error('Failed to insert post: no row ID returned');
  }

  // ── Assign default category ──
  if (config.default_category_id) {
    try {
      await db
        .prepare('INSERT INTO post_taxonomies (post_id, taxonomy_id) VALUES (?, ?)')
        .bind(postId, config.default_category_id)
        .run();
    } catch {
      // Non-critical
    }
  }

  return postId as number;
}

// ─── Connection Test ─────────────────────────────────────────────────────────

export async function testContetyConnection(
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const account = await getAccount(apiKey);
    if (account && account.email) {
      return { success: true };
    }
    return { success: false, error: 'Invalid response from Contety API' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
