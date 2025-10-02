import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosHeaders,
} from "axios";

/**
 * Normalize a path so the final URL has exactly one `/api` prefix,
 * no matter what the caller passed:
 *   "auth/login"          -> /api/auth/login
 *   "/auth/login"         -> /api/auth/login
 *   "/api/auth/login"     -> /api/auth/login
 *   "/api/api/auth/login" -> /api/auth/login
 */
function normalizePath(path: string): string {
  // Ensure it starts with a slash
  const p = path.startsWith("/") ? path : `/${path}`;
  // Remove one or more leading `/api/` segments
  const withoutApi = p.replace(/^\/api\/+/i, "/");
  // Prepend exactly one `/api`
  return `/api${withoutApi}`;
}

const api: AxiosInstance = axios.create({
  withCredentials: true, // session-based auth (no JWT)
  timeout: 30000,
});

/**
 * Interceptor: attach normalized URL and keep headers as AxiosHeaders
 */
api.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizePath(config.url);
  }

  // Ensure headers remains an AxiosHeaders instance for TS compatibility
  const headers =
      config.headers instanceof AxiosHeaders
          ? config.headers
          : new AxiosHeaders(config.headers);

  headers.set("X-Requested-With", "XMLHttpRequest");
  config.headers = headers;

  return config;
});

/** Typed helpers */
export async function get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.get<T>(url, config);
}

export async function post<T = unknown>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.post<T>(url, data, config);
}

export async function put<T = unknown>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.put<T>(url, data, config);
}

export async function patch<T = unknown>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.patch<T>(url, data, config);
}

export async function del<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.delete<T>(url, config);
}

export type { AxiosError };
export default api;
