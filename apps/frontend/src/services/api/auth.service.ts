import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export const authService = {
  async register(data: { email: string; password: string; name?: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getMe(): Promise<AuthUser> {
    const response = await apiClient.get<{ user: AuthUser }>('/auth/me');
    return response.data.user;
  }
};
