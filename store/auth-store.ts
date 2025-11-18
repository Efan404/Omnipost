/**
 * Authentication State Management
 *
 * Zustand store for managing authentication state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { getAuthService } from '@/lib/appwrite/auth';

/**
 * Auth store state
 */
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

/**
 * Auth store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      /**
       * Login
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const auth = getAuthService();
          await auth.login(email, password);

          const user = await auth.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * Register
       */
      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });

        try {
          const auth = getAuthService();
          const user = await auth.register(email, password, name);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * Logout
       */
      logout: async () => {
        set({ isLoading: true });

        try {
          const auth = getAuthService();
          await auth.logout();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      /**
       * Check authentication status
       */
      checkAuth: async () => {
        set({ isLoading: true });

        try {
          const auth = getAuthService();
          const user = await auth.getCurrentUser();

          set({
            user,
            isAuthenticated: user !== null,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      /**
       * Update user data
       */
      updateUser: (updates: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...updates },
          });
        }
      },
    }),
    {
      name: 'omnipost-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Selector hooks
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
