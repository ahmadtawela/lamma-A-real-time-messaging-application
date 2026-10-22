import axios from 'axios';
import { env } from '@/config/env';
import { toApiError } from '@/shared/lib/apiError';
import { apiEvents } from '@/shared/lib/apiEvents';
import { mockAdapter } from '@/mocks/mockAdapter';

/** One axios instance for the whole app. Sanctum SPA auth = cookies + XSRF header (CSRF). */
export const http = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  ...(env.useMocks ? { adapter: mockAdapter } : {}),
});

let csrfPromise = null;
export const ensureCsrfCookie = () =>
  (csrfPromise ??= http.get('/sanctum/csrf-cookie').finally(() => { csrfPromise = null; }));

// The server translates validation/auth messages (ar|en) from this header (and from the user's locale once logged in).
http.interceptors.request.use((config) => { config.headers['Accept-Language'] = document.documentElement.lang || 'en'; return config; });

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const apiError = toApiError(error);
    const config = error.config;

    // 419: CSRF token mismatch -> refresh the cookie and retry once.
    if (apiError.status === 419 && config && !config._retried) {
      config._retried = true;
      await ensureCsrfCookie();
      return http(config);
    }
    if (apiError.status === 401) apiEvents.emit({ type: 'unauthenticated' });      // session expired
    else if (apiError.status === 429) apiEvents.emit({ type: 'rate_limited', retryAfter: apiError.retryAfter });
    else if (apiError.status >= 500) apiEvents.emit({ type: 'server_error' });
    else if (apiError.status === 0) apiEvents.emit({ type: 'network_error' });
    else if (apiError.status === 403) apiEvents.emit({ type: 'forbidden' });
    // 404 and 422 are handled by the caller (inline UI / field errors).
    return Promise.reject(apiError);
  }
);
