import { create } from 'zustand';

interface AuthState {
  // TODO: user, accessToken, isAuthenticated
}

const useAuthStore = create<AuthState>()(() => ({
  // TODO: initial state
}));

export default useAuthStore;
