import { create } from "zustand";
import { disconnectSocket, updateSocketToken } from "../lib/socket";
import { authService, AuthUser } from "../services/api/auth.service";

export interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, githubLink?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  setAuthToken: (token: string) => void;
  clearAuth: () => void;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  setAuthToken: (token: string) => {
    set({ accessToken: token, isAuthenticated: true });
    updateSocketToken(token);
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken } = await authService.login({ email, password });
      set({ user, accessToken, isAuthenticated: true, isInitialized: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || "Failed to login", 
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (email, password, name, githubLink) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register({ email, password, name, githubLink });
      // Do not auto-login because email verification is required
      set({ isLoading: false });
    } catch (error: any) {
      const errData = error.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : errData || "Failed to register";
      set({ error: errMsg, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.logout();
    } catch (e) {
      // ignore errors on logout
    } finally {
      disconnectSocket();
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data: Partial<AuthUser>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(data);
      set({ user: updatedUser, isLoading: false });
    } catch (error: any) {
      const errData = error.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : (typeof errData === 'string' ? errData : "Failed to update profile");
      set({ error: errMsg, isLoading: false });
      throw error;
    }
  },

  fetchCurrentUser: async () => {
    set({ isInitialized: false, error: null });
    try {
      // We don't need a manual refresh here. If the token is missing or expired,
      // authService.getMe() will get a 401, and the global axios interceptor 
      // in lib/axios.ts will automatically pause, refresh the token, update 
      // the socket via setAuthToken, and retry the request.
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch {
      // If getMe() ultimately fails (e.g. refresh token expired/missing), 
      // the user must log in again.
      set({ user: null, accessToken: null, isAuthenticated: false, isInitialized: true });
    }
  },

  clearAuth: () => {
    disconnectSocket();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  verifyEmail: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.verifyEmail(token);
      set({ isLoading: false });
    } catch (error: any) {
      const errData = error.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : (typeof errData === 'string' ? errData : "Failed to verify email");
      set({ error: errMsg, isLoading: false });
      throw error;
    }
  },

  resendVerification: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resendVerification(email);
      set({ isLoading: false });
    } catch (error: any) {
      const errData = error.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : (typeof errData === 'string' ? errData : "Failed to resend verification email");
      set({ error: errMsg, isLoading: false });
      throw error;
    }
  },
}));

export default useAuthStore;
