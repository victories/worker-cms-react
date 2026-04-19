const API_BASE = '/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  contentType?: string;
}

class ApiClient {
  private token: string | null = null;
  private siteId: number | null = null;

  constructor() {
    // Synchronously restore siteId from localStorage so API calls work immediately after F5
    const savedSiteId = localStorage.getItem('active_site_id');
    if (savedSiteId) {
      this.siteId = Number(savedSiteId);
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setSiteId(siteId: number | null) {
    this.siteId = siteId;
  }

  getToken() {
    return this.token;
  }

  getSiteId() {
    return this.siteId;
  }

  async request<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, contentType } = options;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.siteId) {
      requestHeaders['X-Site-Id'] = String(this.siteId);
    }

    // contentType === '' means "let browser auto-set" (e.g. FormData multipart boundary)
    // contentType === undefined means JSON body
    const isRawBody = contentType !== undefined;
    if (!isRawBody && body) {
      requestHeaders['Content-Type'] = 'application/json';
    } else if (contentType) {
      requestHeaders['Content-Type'] = contentType;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body
        ? isRawBody
          ? (body as BodyInit)
          : JSON.stringify(body)
        : undefined,
    });

    if (res.status === 401) {
      // For auth endpoints (login), return the response directly
      // so the caller can handle requires_2fa and error messages
      if (endpoint.startsWith('/auth/login')) {
        return res.json() as Promise<T>;
      }
      // Try refresh
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        requestHeaders['Authorization'] = `Bearer ${this.token}`;
        const retry = await fetch(`${API_BASE}${endpoint}`, {
          method,
          headers: requestHeaders,
          body: body
            ? isRawBody
              ? (body as BodyInit)
              : JSON.stringify(body)
            : undefined,
        });
        return retry.json() as Promise<T>;
      }
      // Redirect to login
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }

    return res.json() as Promise<T>;
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json();
      if (data.success) {
        this.token = data.data.access_token;
        localStorage.setItem('access_token', data.data.access_token);
        localStorage.setItem('refresh_token', data.data.refresh_token);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  // Auth
  async login(email: string, password: string, totp_code?: string) {
    return this.request<{ success: boolean; requires_2fa?: boolean; data: { access_token: string; refresh_token: string; user: { id: number; email: string; display_name: string; role: string } } }>('/auth/login', {
      method: 'POST',
      body: totp_code ? { email, password, totp_code } : { email, password },
    });
  }

  async setup(email: string, password: string, displayName: string) {
    return this.request('/auth/setup', {
      method: 'POST',
      body: { email, password, display_name: displayName },
    });
  }

  // Sites
  async getSites() {
    return this.request<{ success: boolean; data: any[] }>('/sites');
  }

  async getSite(id: number) {
    return this.request<{ success: boolean; data: any }>(`/sites/${id}`);
  }

  async createSite(data: any) {
    return this.request('/sites', { method: 'POST', body: data });
  }

  // Posts
  async getPosts(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[]; meta: any }>(`/posts${qs ? '?' + qs : ''}`);
  }

  async getPost(id: number) {
    return this.request<{ success: boolean; data: any }>(`/posts/${id}`);
  }

  async createPost(data: any) {
    return this.request('/posts', { method: 'POST', body: data });
  }

  async updatePost(id: number, data: any) {
    return this.request(`/posts/${id}`, { method: 'PUT', body: data });
  }

  async deletePost(id: number) {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  }

  async bulkPostAction(action: string, ids: number[], value?: string) {
    return this.request<{ success: boolean; data: { affected: number; total: number; action: string }; error?: string }>('/posts/bulk', {
      method: 'POST',
      body: { action, ids, value },
    });
  }

  // Revisions
  async getRevisions(postId: number, limit = 20) {
    return this.request<{ success: boolean; data: any[] }>(`/posts/${postId}/revisions?limit=${limit}`);
  }

  async getRevision(postId: number, revId: number) {
    return this.request<{ success: boolean; data: any }>(`/posts/${postId}/revisions/${revId}`);
  }

  async restoreRevision(postId: number, revisionId: number) {
    return this.request<{ success: boolean; data: any }>(`/posts/${postId}/revisions/${revisionId}/restore`, {
      method: 'POST',
    });
  }

  // Taxonomies
  async getTaxonomies(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[] }>(`/taxonomies${qs ? '?' + qs : ''}`);
  }

  async createTaxonomy(data: any) {
    return this.request('/taxonomies', { method: 'POST', body: data });
  }

  async updateTaxonomy(id: number, data: any) {
    return this.request(`/taxonomies/${id}`, { method: 'PUT', body: data });
  }

  async deleteTaxonomy(id: number) {
    return this.request(`/taxonomies/${id}`, { method: 'DELETE' });
  }

  // Media
  async getMedia(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[]; meta: any }>(`/media${qs ? '?' + qs : ''}`);
  }

  async getMediaItem(id: number) {
    return this.request<{ success: boolean; data: any }>(`/media/${id}`);
  }

  async uploadMedia(formData: FormData) {
    return this.request('/media', {
      method: 'POST',
      body: formData as unknown as BodyInit,
      contentType: '', // let browser set multipart boundary
    });
  }

  async updateMedia(id: number, data: { alt_text?: string; caption?: string }) {
    return this.request(`/media/${id}`, { method: 'PUT', body: data });
  }

  async deleteMedia(id: number) {
    return this.request(`/media/${id}`, { method: 'DELETE' });
  }

  async bulkMediaAction(action: string, ids: number[]) {
    return this.request<{ success: boolean; data: { affected: number; total: number; action: string }; error?: string }>('/media/bulk', {
      method: 'POST',
      body: { action, ids },
    });
  }

  async registerR2Media(r2_key: string, alt_text?: string) {
    return this.request<{ success: boolean; data: any }>('/media/from-r2', {
      method: 'POST',
      body: { r2_key, alt_text },
    });
  }

  async scanR2Media() {
    return this.request<{ success: boolean; data: { registered: number; total: number; already_tracked: number } }>('/media/scan-r2', {
      method: 'POST',
    });
  }

  // Comments
  async getComments(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[]; meta: any }>(`/comments${qs ? '?' + qs : ''}`);
  }

  async updateComment(id: number, data: any) {
    return this.request(`/comments/${id}`, { method: 'PUT', body: data });
  }

  async deleteComment(id: number) {
    return this.request(`/comments/${id}`, { method: 'DELETE' });
  }

  // Menus
  async getMenus() {
    return this.request<{ success: boolean; data: any[] }>('/menus');
  }

  async createMenu(data: any) {
    return this.request('/menus', { method: 'POST', body: data });
  }

  // Settings
  async getSettings() {
    return this.request<{ success: boolean; data: Record<string, string> }>('/settings');
  }

  async updateSettings(data: any) {
    return this.request('/settings', { method: 'PUT', body: data });
  }

  // Users
  async getUsers() {
    return this.request<{ success: boolean; data: any[] }>('/users');
  }

  // Analytics
  async getAnalytics(params: Record<string, string> = {}) {
    return this.request<{ success: boolean; data: any }>('/analytics/overview');
  }

  // Import
  async importWordPressPreview(xml: string) {
    return this.request('/import/wordpress/preview', {
      method: 'POST',
      body: xml as unknown as BodyInit,
      contentType: 'application/xml',
    });
  }

  async importWordPress(xml: string, language: string = 'tr', importMedia: boolean = true) {
    const params = new URLSearchParams({ language, import_media: String(importMedia) });
    return this.request(`/import/wordpress?${params}`, {
      method: 'POST',
      body: xml as unknown as BodyInit,
      contentType: 'application/xml',
    });
  }

  // Backup
  async exportBackup(sections?: string) {
    const qs = sections ? `?sections=${sections}` : '';
    return this.request(`/backup/export${qs}`);
  }

  // Global Settings (super_admin)
  async getGlobalSettings() {
    return this.request<{ success: boolean; data: Record<string, string> }>('/global-settings');
  }

  async updateGlobalSettings(data: Record<string, string>) {
    return this.request('/global-settings', { method: 'PUT', body: data });
  }

  // Email Templates
  async getEmailEvents() {
    return this.request<{ success: boolean; data: any[] }>('/global-settings/email-events');
  }

  async getEmailTemplate(event: string) {
    return this.request<{ success: boolean; data: any }>(`/global-settings/email-template/${event}`);
  }

  async updateEmailTemplate(event: string, data: { subject?: string; body?: string }) {
    return this.request(`/global-settings/email-template/${event}`, { method: 'PUT', body: data });
  }

  async resetEmailTemplate(event: string) {
    return this.request(`/global-settings/email-template/${event}`, { method: 'DELETE' });
  }

  async sendTestEmail(event: string, to: string) {
    return this.request<{ success: boolean; id?: string; error?: string }>('/global-settings/email-test', {
      method: 'POST',
      body: { event, to },
    });
  }

  // Delete site-level setting override (reset to global)
  async deleteSiteSetting(key: string) {
    return this.request(`/settings/${key}`, { method: 'DELETE' });
  }

  // Redirects (site-scoped)
  async getRedirects() {
    return this.request<{ success: boolean; data: any[] }>('/redirects');
  }

  async createRedirect(data: any) {
    return this.request('/redirects', { method: 'POST', body: data });
  }

  async updateRedirect(id: number, data: any) {
    return this.request(`/redirects/${id}`, { method: 'PUT', body: data });
  }

  async deleteRedirect(id: number) {
    return this.request(`/redirects/${id}`, { method: 'DELETE' });
  }

  // Short URLs (global)
  async getShortUrls() {
    return this.request<{ success: boolean; data: any[] }>('/short-urls');
  }

  async createShortUrl(data: any) {
    return this.request('/short-urls', { method: 'POST', body: data });
  }

  async updateShortUrl(id: number, data: any) {
    return this.request(`/short-urls/${id}`, { method: 'PUT', body: data });
  }

  async deleteShortUrl(id: number) {
    return this.request(`/short-urls/${id}`, { method: 'DELETE' });
  }

  // WorkerCms AI Bot (cms-hub @ bot.workercms.com)
  async getCmsHubConfig() {
    return this.request<{
      success: boolean;
      data: {
        has_key: boolean;
        key_hint?: string;
        valid?: boolean;
        error?: string;
        organization?: { id: string; name: string; slug: string; credit_balance: number } | null;
      };
    }>('/cmshub/config');
  }

  async saveCmsHubConfig(api_key: string) {
    return this.request<{ success: boolean; data: any; error?: string }>('/cmshub/config', {
      method: 'POST',
      body: { api_key },
    });
  }

  async deleteCmsHubConfig() {
    return this.request<{ success: boolean }>('/cmshub/config', { method: 'DELETE' });
  }

  async getCmsHubSites() {
    return this.request<{ success: boolean; data: { sites: any[] }; error?: string }>('/cmshub/sites');
  }

  async getCmsHubContent() {
    return this.request<{ success: boolean; data: { content: any[] }; error?: string }>('/cmshub/content');
  }

  // Contety Content Bot
  async getContetyConfig() {
    return this.request<{ success: boolean; data: any }>('/contety/config');
  }

  async updateContetyConfig(data: any) {
    return this.request('/contety/config', { method: 'PUT', body: data });
  }

  async testContetyConnection() {
    return this.request<{ success: boolean; data: any; error?: string }>('/contety/test', { method: 'POST' });
  }

  async getContetyLanguages() {
    return this.request<{ success: boolean; data: any[] }>('/contety/languages');
  }

  async getContetyTemplates() {
    return this.request<{ success: boolean; data: any[] }>('/contety/templates');
  }

  async getContetyToneOfVoices() {
    return this.request<{ success: boolean; data: any[] }>('/contety/tone-of-voices');
  }

  async getContetyContents(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[] }>(`/contety/contents${qs ? '?' + qs : ''}`);
  }

  async getContetyContentDetail(id: number) {
    return this.request<{ success: boolean; data: any }>(`/contety/contents/${id}`);
  }

  async generateContetyContent(data: any) {
    return this.request<{ success: boolean; data: any; error?: string }>('/contety/generate', { method: 'POST', body: data });
  }

  async importContetyContent(contentId: number, postType: 'post' | 'page' = 'post') {
    return this.request<{ success: boolean; data: any; error?: string }>(`/contety/import/${contentId}`, {
      method: 'POST',
      body: { post_type: postType },
    });
  }

  async getContetyPending() {
    return this.request<{ success: boolean; data: any[] }>('/contety/pending');
  }

  async getContetyLogs(params: Record<string, string> = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; data: any[]; meta: any }>(`/contety/logs${qs ? '?' + qs : ''}`);
  }

  async getContetyGlobalConfig() {
    return this.request<{ success: boolean; data: any }>('/contety/global/config');
  }

  async updateContetyGlobalConfig(data: any) {
    return this.request('/contety/global/config', { method: 'PUT', body: data });
  }

  // Content Types
  async getContentTypes() {
    return this.request<{ success: boolean; data: any[] }>('/content-types');
  }

  async getContentType(slug: string) {
    return this.request<{ success: boolean; data: any }>(`/content-types/${slug}`);
  }

  async createContentType(data: any) {
    return this.request('/content-types', { method: 'POST', body: data });
  }

  async updateContentType(slug: string, data: any) {
    return this.request(`/content-types/${slug}`, { method: 'PUT', body: data });
  }

  async deleteContentType(slug: string) {
    return this.request(`/content-types/${slug}`, { method: 'DELETE' });
  }

  // Plugins
  async getPluginLogs(slug: string, days = 7) {
    return this.request(`/plugins/${slug}/logs?days=${days}`);
  }

  async deployPlugin(data: { slug: string; name: string; code: string; hooks: string[]; permissions?: string[] }) {
    return this.request('/plugins/deploy', { method: 'POST', body: data });
  }

  async undeployPlugin(slug: string) {
    return this.request(`/plugins/${slug}/undeploy`, { method: 'DELETE' });
  }

  // Search index rebuild
  async rebuildSearchIndex() {
    return this.request<{ success: boolean; data: { indexed: number; message: string } }>('/posts/rebuild-search-index', { method: 'POST' });
  }
}

export const api = new ApiClient();
