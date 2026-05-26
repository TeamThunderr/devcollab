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
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
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
      
      const { user, accessToken } = await authService.login({ email, password });
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
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
      let token = useAuthStore.getState().accessToken;
      
      // If we don't have an access token in memory (e.g. after a page reload),
      // proactively try to refresh via the httpOnly cookie before calling getMe().
      if (!token) {
        const { api } = await import('../lib/axios');
        const res = await api.post(
          '/api/auth/refresh',
          {},
          { _retry: true, _silentError: true } as any
        );
        token = res.data.accessToken;
        // Store the refreshed token AND prime the socket so connectSocket()
        // in WorkspaceLayout finds a token ready when it fires.
        set({ accessToken: token });
        updateSocketToken(token!);
      }

      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch {
      // Refresh token missing/expired — user must log in again.
      // Don't call disconnectSocket() here; the socket hasn't connected yet
      // on a fresh page load, and we don't want to clear workspaceId from
      // a socket that's mid-reconnect for an already-authenticated session.
      set({ user: null, accessToken: null, isAuthenticated: false, isInitialized: true });
    }
  },

  clearAuth: () => {
    disconnectSocket();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
