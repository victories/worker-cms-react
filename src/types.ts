export interface Bindings {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
  ADMIN_DOMAIN: string;
  RESEND_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  __STATIC_CONTENT: KVNamespace; // Auto-injected by wrangler [site] config
  DISPATCHER?: any; // Workers for Platforms dispatch namespace (optional)
  CACHE?: KVNamespace; // KV cache for public queries (optional)
  // Visitor gate (gate.js) — only active where GATE_ENABLED === '1'
  // (gated deployment only). See GATE_ENTEGRASYON.md.
  GATE_ENABLED?: string;      // '1' turns the visitor gate on for this deployment
  IPCACHE?: KVNamespace;      // caches proxycheck.io verdicts per IP
  PROXYCHECK_KEY?: string;    // proxycheck.io API key (worker secret)
  RECAPTCHA_SITE_KEY?: string; // Google reCAPTCHA v3 site key (public, [vars])
  RECAPTCHA_SECRET?: string;   // Google reCAPTCHA v3 secret (worker secret)
  MAINTENANCE?: string;        // '1' → public HTML'e D1'siz "yükleniyor" sayfası (kill-switch)
}

export interface Variables {
  siteId: number | null;
  site: Site | null;
  user: JWTPayload | null;
  lang: string;
  activeTheme: import('./lib/themes/types').ActiveTheme | null;
  activeDesign: import('./lib/themes/types').ActiveDesign | null;
  // Set by userApiKeyAuth — 'user' for cross-site keys, 'site' for keys
  // bound to a single site (then apiKeySiteId is the only site they reach).
  apiKeyScope?: 'user' | 'site';
  apiKeySiteId?: number | null;
  // Per-request CSP nonce (set by cspMiddleware). Inline `<script>` and
  // `<style>` tags rendered into the response must carry this nonce so
  // the strict CSP allows them while blocking attacker-injected inline
  // markup. Undefined on non-HTML routes that bail out early.
  cspNonce?: string;
}

export interface Site {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  default_language: string;
  created_at: string;
  updated_at: string;
}

export interface SiteDomain {
  id: number;
  site_id: number;
  domain: string;
  is_primary: number;
  ssl_status: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  avatar_r2_key: string | null;
  avatar_url: string | null;
  totp_secret: string | null;
  totp_enabled: number;
  language: string;
  max_sites: number;
  max_editors: number;
  max_writers: number;
  ai_enabled: number;
  ai_use_global: number;
  created_by: number | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'writer' | 'editor' | 'admin' | 'super_admin';

export interface JWTPayload {
  sub: number;
  email: string;
  role: UserRole;
  display_name: string;
  iat: number;
  exp: number;
  // Optional unique token id used for revocation via KV. Issued for tokens
  // produced by createAccessToken/createRefreshToken from this build forward;
  // older tokens minted before the revocation feature shipped won't have it
  // and skip the KV lookup in authMiddleware.
  jti?: string;
}

export interface Post {
  id: number;
  site_id: number;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  status: string;
  post_type: string;
  author_id: number;
  featured_image_id: number | null;
  language: string;
  translation_group: string | null;
  parent_id: number | null;
  menu_order: number;
  comment_status: string;
  password: string | null;
  is_sticky: number;
  amp_enabled: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_r2_key: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Taxonomy {
  id: number;
  site_id: number;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  parent_id: number | null;
  language: string;
  translation_group: string | null;
  count: number;
}

export interface Media {
  id: number;
  site_id: number;
  r2_key: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  author_id: number;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  parent_id: number | null;
  author_name: string;
  author_email: string | null;
  author_url: string | null;
  author_ip: string | null;
  content: string;
  status: string;
  created_at: string;
}

export interface Menu {
  id: number;
  site_id: number;
  name: string;
  slug: string;
  location: string | null;
  language: string;
}

export interface MenuItem {
  id: number;
  menu_id: number;
  parent_id: number | null;
  title: string;
  url: string | null;
  target: string;
  item_type: string;
  item_object_id: number | null;
  position: number;
  css_class: string | null;
}

export interface Widget {
  id: number;
  site_id: number;
  area: string;
  widget_type: string;
  title: string | null;
  config: string | null;
  position: number;
  is_active: number;
  language: string;
}

export interface Setting {
  site_id: number;
  key: string;
  value: string | null;
  autoload: number;
}

export interface ApiKey {
  id: number;
  site_id: number;
  name: string;
  key_hash: string;
  key_prefix: string;
  permissions: string;
  user_id: number;
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Plugin {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  version: string;
  author: string | null;
  entry_point: string;
  hooks: string | null;
  settings_schema: string | null;
  created_at: string;
}

export interface SitePlugin {
  site_id: number;
  plugin_id: number;
  is_active: number;
  settings: string | null;
  activated_at: string | null;
}

export interface PageView {
  id: number;
  site_id: number;
  post_id: number | null;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  country: string | null;
  viewed_at: string;
}

export interface Revision {
  id: number;
  post_id: number;
  title: string;
  content: string | null;
  author_id: number;
  created_at: string;
}

export interface SeoService {
  id: number;
  site_id: number;
  name: string;
  type: string;
  endpoint_url: string | null;
  api_key_encrypted: string | null;
  config: string | null;
  is_active: number;
  created_at: string;
}

export interface SeoScore {
  id: number;
  post_id: number;
  service_id: number;
  overall_score: number | null;
  details: string | null;
  analyzed_at: string;
}

// API response helpers
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface PaginationParams {
  page: number;
  per_page: number;
}

// AI Content Generator types
export interface AiProvider {
  id: number;
  site_id: number;
  provider_slug: string;
  display_name: string;
  api_key: string | null;
  default_model: string | null;
  endpoint_url: string | null;
  extra_config: string | null;
  is_enabled: number;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface AiPrompt {
  id: number;
  site_id: number;
  name: string;
  description: string | null;
  system_prompt: string | null;
  user_prompt: string;
  variables: string | null;
  default_provider_slug: string | null;
  default_model: string | null;
  default_word_count: number;
  default_language: string;
  default_tone: string;
  is_active: number;
  image_enabled: number;
  image_model: string | null;
  image_style: string;
  image_count: number;
  image_layout: string | null; // JSON string
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface AiJob {
  id: number;
  site_id: number;
  prompt_id: number | null;
  provider_slug: string;
  model: string | null;
  prompt_text: string;
  system_prompt: string | null;
  scheduled_at: string;
  status: string;
  target_category_id: number | null;
  target_language: string;
  target_word_count: number;
  target_status: string;
  result_post_id: number | null;
  error_message: string | null;
  image_enabled: number;
  image_model: string | null;
  image_style: string | null;
  image_count: number;
  image_layout: string | null;
  image_status: string;
  image_urls: string | null;
  image_prompts: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AiLog {
  id: number;
  site_id: number;
  job_id: number | null;
  provider_slug: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration_ms: number;
  status: string;
  error_message: string | null;
  request_type: string;
  result_post_id: number | null;
  created_by: number | null;
  created_at: string;
}

// Global AI types (not site-scoped, managed by super_admin)
export interface GlobalAiProvider {
  id: number;
  provider_slug: string;
  display_name: string;
  api_key: string | null;
  default_model: string | null;
  endpoint_url: string | null;
  extra_config: string | null;
  is_enabled: number;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

// Contety İçerik Botu types
export interface ContetyConfig {
  id: number;
  site_id: number;
  api_key: string | null;
  is_enabled: number;
  auto_import: number;
  default_status: string;
  default_category_id: number | null;
  default_author_id: number | null;
  default_language_id: number;
  default_model: string;
  last_pull_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalContetyConfig {
  id: number;
  api_key: string;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface ContetyContent {
  id: number;
  site_id: number;
  contety_content_id: number;
  status: string;
  template_code: string | null;
  title: string | null;
  post_id: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContetyLog {
  id: number;
  site_id: number;
  action: string;
  contety_content_id: number | null;
  post_id: number | null;
  credits_used: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface GlobalAiPrompt {
  id: number;
  name: string;
  description: string | null;
  system_prompt: string | null;
  user_prompt: string;
  variables: string | null;
  default_provider_slug: string | null;
  default_model: string | null;
  default_word_count: number;
  default_language: string;
  default_tone: string;
  is_active: number;
  image_enabled: number;
  image_model: string | null;
  image_style: string;
  image_count: number;
  image_layout: string | null;
  created_at: string;
  updated_at: string;
}
