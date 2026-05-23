import { create } from "zustand";
import { disconnectSocket, connectSocket } from "../lib/socket";
import { authService, AuthUser } from "../services/api/auth.service";

export interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
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

  setAuthToken: (token: string) => set({ accessToken: token, isAuthenticated: true }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken } = await authService.login({ email, password });
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      // Temporary connect pattern, ideally connected per workspace later
      connectSocket(accessToken, "workspace-test-123");
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || "Failed to login", 
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register({ email, password, name });
      
      const { user, accessToken } = await authService.login({ email, password });
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      connectSocket(accessToken, "workspace-test-123");
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

  fetchCurrentUser: async () => {
    set({ isInitialized: false, error: null });
    try {
      // Calling getMe without a token will result in a 401. 
      // The Axios interceptor will automatically catch the 401, call /auth/refresh using the httpOnly cookie, 
      // set the new accessToken in the store, and retry the request transparently!
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isInitialized: true });
      
      // Also connect socket if we have the token
      const token = useAuthStore.getState().accessToken;
      if (token) {
        connectSocket(token, "workspace-test-123");
      }
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
