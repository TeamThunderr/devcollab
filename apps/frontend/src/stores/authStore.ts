/**
 * apps/frontend/src/stores/authStore.ts
 *
 * Zustand auth store.
 * Holds the authenticated user, the JWT access token, and auth state.
 * On clearAuth the socket is disconnected to avoid orphaned connections.
 */

import { create } from "zustand";
import { disconnectSocket } from "../lib/socket";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const useAuthStore = create<AuthStore>()((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  user: null,
  accessToken: null,
  isAuthenticated: false,

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Persist user + token after a successful login or token refresh */
  setAuth: (user, token) =>
    set({ user, accessToken: token, isAuthenticated: true }),

  /**
   * Clear all auth state on logout.
   * Also disconnects the Socket.IO connection so the server cleans up
   * the presence entry immediately (rather than waiting for the TTL).
   */
  clearAuth: () => {
    disconnectSocket();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
