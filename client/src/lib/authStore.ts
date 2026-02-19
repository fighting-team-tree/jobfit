/**
 * Auth Store for Replit Authentication
 *
 * Uses Zustand for state management with persistence.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProfileStore } from './store';

const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

// Development mode flag
const DEV_MODE = import.meta.env.DEV;

// Mock user for local development (only when DEV_MODE is true)
const MOCK_USER = DEV_MODE ? {
  user_id: 'dev-user-123',
  username: 'DevUser',
} : null;

export interface User {
  user_id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  logout: () => void;
  setMockUser: () => void;  // For local development
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      checkAuth: async () => {
        set({ isLoading: true, error: null });

        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
          });

          if (!res.ok) {
            throw new Error('Failed to check authentication');
          }

          const data = await res.json();

          if (data.authenticated) {
            set({
              user: {
                user_id: data.user_id,
                username: data.username,
              },
              isAuthenticated: true,
              isLoading: false,
            });
            // Load profile from server after successful authentication
            useProfileStore.getState().loadFromServer();
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Authentication check failed',
          });
        }
      },

      logout: () => {
        // Clear profile data on logout
        useProfileStore.getState().clearAll();
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setMockUser: () => {
        if (MOCK_USER) {
          set({
            user: MOCK_USER,
            isAuthenticated: true,
            isLoading: false,
          });
          // Load profile from server for mock user
          useProfileStore.getState().loadFromServer();
        }
      },
    }),
    {
      name: 'jobfit-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
