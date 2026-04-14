export class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async request<T = any>(path: string, options: {
    method?: string;
    body?: any;
    params?: Record<string, string>;
    siteId?: number;
  } = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`,
    };
    if (options.siteId) headers['X-Site-Id'] = String(options.siteId);
    if (options.body) headers['Content-Type'] = 'application/json';

    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json() as any;
    if (!response.ok || data.success === false) {
      throw new Error(data.error || `API error: ${response.status}`);
    }
    return data.data !== undefined ? data.data : data;
  }
}
