/**
 * Shared HTTP client for the myVote API.
 *
 * Used by both the web app (apps/web) and the mobile app (apps/mobile) so
 * every voter / candidate / agent feature stays in lock-step. The web app
 * relies on cookie auth; the mobile app injects a `Bearer` token. Both are
 * supported transparently by the underlying API routes via
 * `resolveMobileUserId`.
 */

export interface ApiClientConfig {
  /**
   * Base URL of the myVote web app. For the web client this should be left
   * empty (relative requests). For the mobile client it must be the public
   * URL where Next.js is running.
   */
  baseUrl?: string;

  /**
   * Returns a fresh bearer token (or null/undefined). Called on every
   * request so token refreshes are picked up automatically. Only used by
   * the mobile client — the web client authenticates via cookies.
   */
  getAuthToken?: () => string | null | undefined;

  /**
   * Optional dev-only fallback: an authenticated user id. Sent as
   * `x-myvote-user-id` when no bearer token is available. Mobile uses this
   * during local development.
   */
  getDevUserId?: () => string | null | undefined;

  /**
   * Per-request `credentials` mode. Web defaults to `same-origin` so the
   * session cookie travels with each request; mobile uses `omit`.
   */
  credentials?: RequestCredentials;

  /**
   * Optional fetch implementation override (useful for tests / SSR).
   */
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** When true, returns the raw `Response` instead of parsing JSON. */
  raw?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig = {}) {
    this.config = config;
  }

  setConfig(config: Partial<ApiClientConfig>) {
    this.config = { ...this.config, ...config };
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = (this.config.baseUrl || '').replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${base}${cleanPath}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        params.append(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const fetchImpl = this.config.fetch || (globalThis as any).fetch;
    if (!fetchImpl) {
      throw new Error('No fetch implementation available');
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const token = this.config.getAuthToken?.();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      const devUserId = this.config.getDevUserId?.();
      if (devUserId) headers['x-myvote-user-id'] = devUserId;
    }

    const init: RequestInit = {
      method: options.method || 'GET',
      headers,
      credentials: this.config.credentials,
      signal: options.signal,
    };

    if (options.body !== undefined) {
      init.body =
        options.body instanceof FormData
          ? (options.body as any)
          : JSON.stringify(options.body);
    }

    const url = this.buildUrl(path, options.query);
    const res = await fetchImpl(url, init);

    if (options.raw) return res as unknown as T;

    let data: any = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message =
        (data && (data.error || data.message)) ||
        `Request failed with status ${res.status}`;
      throw new ApiError(message, res.status, data);
    }

    return data as T;
  }

  get<T = unknown>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'GET' });
  }
  post<T = unknown>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'POST', body });
  }
  patch<T = unknown>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'PATCH', body });
  }
  put<T = unknown>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'PUT', body });
  }
  delete<T = unknown>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return this.request<T>(path, { ...opts, method: 'DELETE' });
  }
}

/**
 * Singleton client used by the framework wrappers. Apps configure it once
 * during initialization (web layout, mobile root layout).
 */
export const apiClient = new ApiClient();

export function configureApiClient(config: Partial<ApiClientConfig>) {
  apiClient.setConfig(config);
}
