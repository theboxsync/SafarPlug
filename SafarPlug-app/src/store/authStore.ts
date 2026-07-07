import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../models/userModel';
import { authService } from '../services/authService';

interface AuthStoreState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  /** Restore session from SecureStore on app start */
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Parameters<typeof authService.register>[0]) => Promise<void>;
  updateProfile: (payload: Parameters<typeof authService.updateProfile>[0]) => Promise<void>;
  logout: () => Promise<void>;
  /** Alias kept for backward-compat */
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

// Implement hydrate as a standalone async fn to avoid circular Zustand self-reference
async function _hydrate(
  set: (partial: Partial<AuthStoreState>) => void
): Promise<void> {
  set({ isLoading: true });
  try {
    const token = await SecureStore.getItemAsync('user_token');
    if (token) {
      const user = await authService.getCurrentUser();
      set({ user, token, isLoading: false, isHydrated: true });
    } else {
      set({ isLoading: false, isHydrated: true });
    }
  } catch {
    await SecureStore.deleteItemAsync('user_token').catch(() => {});
    await SecureStore.deleteItemAsync('user_refresh_token').catch(() => {});
    set({ user: null, token: null, isLoading: false, isHydrated: true });
  }
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isHydrated: false,
  error: null,

  hydrate: () => _hydrate(set),

  initializeAuth: () => _hydrate(set),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken } = await authService.login(email, password);
      set({ user, token: accessToken, isLoading: false });
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Login failed. Please check your credentials.',
        isLoading: false,
      });
      throw e;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken } = await authService.register(data);
      set({ user, token: accessToken, isLoading: false });
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Registration failed.',
        isLoading: false,
      });
      throw e;
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(payload);
      set({ user: updatedUser, isLoading: false });
    } catch (e: any) {
      set({
        error: e.response?.data?.message || 'Profile update failed.',
        isLoading: false,
      });
      throw e;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    }
    set({ user: null, token: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
