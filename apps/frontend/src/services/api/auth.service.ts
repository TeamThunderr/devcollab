import api from '../../lib/axios';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio?: string | null;
  skills?: string[];
  githubLink?: string | null;
  platformRole?: 'USER' | 'SUPER_ADMIN';
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export const authService = {
  async register(data: { email: string; password: string; name?: string }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },

  async getMe(): Promise<AuthUser> {
    const response = await api.get<{ user: AuthUser }>('/api/auth/me');
    return response.data.user;
  },

  async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
    const response = await api.patch<{ user: AuthUser }>('/api/auth/me', data);
    return response.data.user;
  }
};
