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
  async register(data: { email: string; password: string; name?: string; githubLink?: string }): Promise<{ message: string, user: AuthUser }> {
    const response = await api.post<{ message: string, user: AuthUser }>('/api/auth/register', data);
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
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.get<{ message: string }>(`/api/auth/verify-email?token=${token}`);
    return response.data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/api/auth/resend-verification', { email });
    return response.data;
  }
};
