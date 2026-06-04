import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';

const API_BASE = import.meta.env.VITE_API_URL || 'https://devcollab-backend-15q8.onrender.com'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})


interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  /** Set to true to suppress the global error toast for this request */
  _silentError?: boolean;
}

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // ── 401: Try token refresh first ─────────────────────────────────────────
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && originalRequest.url !== '/api/auth/refresh' && originalRequest.url !== '/api/auth/login') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ accessToken: string, refreshToken?: string }>(
          `${API_BASE}/api/auth/refresh`,
          { refreshToken: localStorage.getItem('refreshToken') },
          { withCredentials: true }
        );

        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        useAuthStore.getState().setAuthToken(data.accessToken);
        originalRequest.headers.Authorization = 'Bearer ' + data.accessToken;

        processQueue(null, data.accessToken);

        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Global HTTP error toasts ─────────────────────────────────────────────
    // Skip if the caller opted out of global error handling
    if (!originalRequest?._silentError) {
      const status = error.response?.status;
      const data = error.response?.data as Record<string, any> | undefined;
      
      let serverMessage = data?.message || error.message;
      if (data?.error) {
        serverMessage = Array.isArray(data.error) ? data.error[0].message : (typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }

      if (!navigator.onLine) {
        toast.error('No internet connection', 'Check your connection and try again');
      } else if (status === 401) {
        // Let auth flow handle this — no toast needed
      } else if (status === 403) {
        toast.error("Access denied", "You don't have permission to do this");
      } else if (status === 404) {
        // 404s are often expected — only toast for explicit user actions
        // (individual callers can override with _silentError)
      } else if (status === 429) {
        toast.warning('Rate limited', 'Too many requests. Please wait a moment.');
      } else if (status && status >= 500) {
        toast.error('Server error', 'Something went wrong on our end. Please try again.');
      } else if (status && status >= 400 && status !== 401 && status !== 404) {
        toast.error('Error', serverMessage || 'An unexpected error occurred');
      }
    }

    return Promise.reject(error);
  }
)

export default api
