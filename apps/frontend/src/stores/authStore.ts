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
      // attempting to call getMe() will result in a 401 which logs to the console natively.
      // To avoid this error spam, we proactively try to refresh the token first!
      if (!token) {
        const { api } = await import('../lib/axios');
        const res = await api.post('/api/auth/refresh', {}, { _retry: true } as any);
        token = res.data.accessToken;
        // Persist the refreshed token into the store AND update the socket
        // so that WorkspaceLayout.connectSocket() has a token ready when it fires.
        set({ accessToken: token });
        updateSocketToken(token!);
      }

      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
    } catch (error) {
      disconnectSocket();
      set({ user: null, accessToken: null, isAuthenticated: false, isInitialized: true });
    }
  },

  clearAuth: () => {
    disconnectSocket();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
