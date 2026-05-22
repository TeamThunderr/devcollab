import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import useAuthStore from '../../stores/authStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios.post<{ accessToken: string }>(
          `${baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        .then(response => {
          const { accessToken } = response.data;
          useAuthStore.getState().setAuthToken(accessToken);
          return accessToken;
        })
        .catch(refreshError => {
          useAuthStore.getState().clearAuth();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const accessToken = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
