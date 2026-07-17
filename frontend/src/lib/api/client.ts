import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ─── Remember Me storage ────────────────────────────────────────────────────
// If "Remember Me" is checked, tokens persist in localStorage (survive browser close).
// Otherwise, they go in sessionStorage (cleared when browser/tab closes).

function getStorage(): Storage {
  return localStorage.getItem('remember_me') === 'true' ? localStorage : sessionStorage;
}

function migrateTokens() {
  // On startup, check sessionStorage first, then localStorage
  const ss = sessionStorage.getItem('access_token');
  const ls = localStorage.getItem('access_token');
  if (ss) return; // Session is still active in this tab
  if (ls && localStorage.getItem('remember_me') !== 'true') {
    // Previously stored with remember_me=false but stored in localStorage by old code
    // Don't clear it — user would lose session
  }
}

// Track refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

function setTokens(access: string, refresh: string) {
  const storage = getStorage();
  storage.setItem('access_token', access);
  storage.setItem('refresh_token', refresh);
}

function clearTokens() {
  const keys = [
    'access_token', 'refresh_token', 'user', 'profile',
    'mentor-notes',
    'mentor-recent-topics', 'recent-topics',
    'mentor-ai-layout', 'mentor-ai-workspace',
    'mentor-tabs', 'mentor-active-tab', 'mentor-pinned-lessons',
  ];
  for (const key of keys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith('tab-memory-')) localStorage.removeItem(k);
  }
  window.dispatchEvent(new Event('auth:cache-flush'));
}

function dispatchAuthExpired() {
  window.dispatchEvent(new Event('auth:expired'));
}

// Endpoints that should NEVER have Authorization header
const NO_AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

// ─── Request interceptor: attach Bearer token (except for auth endpoints) ──

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';
    const shouldSkipAuth = NO_AUTH_PATHS.some((path) => url.includes(path));

    if (!shouldSkipAuth) {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: auto-refresh on 401 ──────────────────────────────
// Rules:
//   - 401 on /auth/login or /auth/register → reject, don't touch tokens
//   - 401 on /auth/refresh → clear tokens, reject (refresh token itself is invalid)
//   - 401 on any other path → attempt one-time token refresh, then retry
//   - If refresh succeeds → retry original request with new token
//   - If refresh fails → clear tokens, dispatch auth:expired, reject

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Not a 401, or already retried once → give up
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    if (import.meta.env.DEV) console.debug(`[Interceptor] 401 on ${url}`);

    // Login/register failures → never try to refresh
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return Promise.reject(error);
    }

    // Refresh endpoint failure → refresh token itself is dead
    if (url.includes('/auth/refresh')) {
      if (import.meta.env.DEV) console.debug('[Interceptor] Refresh token expired — clearing auth');
      clearTokens();
      dispatchAuthExpired();
      return Promise.reject(error);
    }

    // Another refresh is in flight → queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // No refresh token available → immediate failure
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      if (import.meta.env.DEV) console.debug('[Interceptor] No refresh token — clearing auth');
      clearTokens();
      dispatchAuthExpired();
      return Promise.reject(error);
    }

    // Attempt one-time token refresh
    originalRequest._retry = true;
    isRefreshing = true;
    if (import.meta.env.DEV) console.debug('[Interceptor] Attempting token refresh...');

    try {
      const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { access_token, refresh_token: newRefreshToken } = res.data;
      if (import.meta.env.DEV) console.debug('[Interceptor] Refresh succeeded');
      setTokens(access_token, newRefreshToken);

      processQueue(null, access_token);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (import.meta.env.DEV) console.debug('[Interceptor] Refresh failed — clearing auth');
      processQueue(refreshError, null);
      clearTokens();
      dispatchAuthExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Helper: fetch current user profile ──────────────────────────────────────

export async function fetchProfile() {
  const res = await apiClient.get('/api/v1/auth/me');
  const profile = res.data;
  const storage = getStorage();
  storage.setItem('profile', JSON.stringify(profile));
  return profile;
}

export interface AuthApi {
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, fullName?: string) => Promise<any>;
  refresh: (refreshToken: string) => Promise<any>;
  logout: (refreshToken?: string) => Promise<any>;
  logoutAll: () => Promise<any>;
  getProfile: () => Promise<any>;
}

export const authApi: AuthApi = {
  login: async (email, password) => {
    // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded with 'username' and 'password' fields
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const res = await apiClient.post('/api/v1/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  },

  register: async (email, password, fullName) => {
    const res = await apiClient.post('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return res.data;
  },

  refresh: async (refreshToken) => {
    const res = await apiClient.post('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
    return res.data;
  },

  logout: async (refreshToken) => {
    const res = await apiClient.post('/api/v1/auth/logout', {
      refresh_token: refreshToken || getRefreshToken(),
    });
    return res.data;
  },

  logoutAll: async () => {
    const res = await apiClient.post('/api/v1/auth/logout-all', {
      refresh_token: getRefreshToken(),
    });
    return res.data;
  },

  getProfile: async () => {
    const res = await apiClient.get('/api/v1/auth/me');
    return res.data;
  },
};

// ─── Auth-injecting fetch wrapper ───────────────────────────────────────────
// All raw fetch() calls that hit protected endpoints MUST use this wrapper.
// It automatically attaches Authorization: Bearer <token> and handles refresh.

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export function mergeHeaders(base: Record<string, string>, more: Record<string, string>): Record<string, string> {
  return { ...base, ...more };
}

/**
 * Convert fetch errors to human-readable messages.
 * - TypeError("Failed to fetch") → "Backend unavailable — ensure the server is running on port 8000"
 * - AbortError → "Request was cancelled"
 * - Server error codes → extracted from response detail if possible
 */
export function classifyFetchError(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const errObj = err as { name: string; message: string };
    if (errObj.name === 'AbortError') return 'Request was cancelled';
    if (errObj.message === 'Failed to fetch') return 'Backend unavailable — ensure the server is running on port 8000';
    if (errObj.message?.includes('NetworkError') || errObj.message?.includes('Network request failed')) {
      return 'Network error — check your connection';
    }
  }
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Backend unavailable — ensure the server is running on port 8000';
  }
  if (err instanceof Error) return err.message;
  return 'Generation failed';
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error(classifyFetchError(err));
  }

  // On 401, attempt one-time token refresh
  if (response.status === 401 && token) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTokens(data.access_token, data.refresh_token);
          // Retry with new token
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${data.access_token}`);
          if (import.meta.env.DEV) console.debug('[fetchWithAuth] Token refreshed, retrying...');
          return fetch(url, { ...options, headers: retryHeaders });
        }
        if (import.meta.env.DEV) console.debug('[fetchWithAuth] Refresh failed — clearing auth');
        clearTokens();
        dispatchAuthExpired();
      } catch {
        clearTokens();
        dispatchAuthExpired();
      }
    }
  }
  return response;
}
