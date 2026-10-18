import { create } from 'zustand';
import { api, getStoredToken, setStoredToken, clearStoredToken } from '../api/client';
import type { UserRole } from '../api/types';

interface AuthState {
  token: string | null;
  username: string | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// Read token on boot
const existingToken = getStoredToken();

// Derive role and username if mock token exists
let initialRole: UserRole = 'admin';
let initialUsername = 'admin';
if (existingToken && existingToken.includes('operator')) {
  initialRole = 'operator';
  initialUsername = 'operator';
} else if (existingToken && existingToken.includes('viewer')) {
  initialRole = 'viewer';
  initialUsername = 'viewer';
}

export const useAuthStore = create<AuthState>((set) => ({
  token: existingToken,
  username: existingToken ? initialUsername : null,
  role: initialRole,
  isAuthenticated: !!existingToken,
  isLoading: false,
  error: null,

  login: async (username: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.login({ username, password });
      setStoredToken(res.token);
      set({
        token: res.token,
        username: res.username,
        role: res.role,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wrong username or password';
      set({ isLoading: false, error: msg });
      throw err;
    }
  },

  logout: () => {
    clearStoredToken();
    set({
      token: null,
      username: null,
      role: 'viewer',
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
