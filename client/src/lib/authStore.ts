/**
 * Auth Store for Replit Authentication
 *
 * Uses Zustand for state management with persistence.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearAuthToken, getAuthHeaders, getAuthToken, setAuthToken } from './authToken';
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
  email?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  logout: () => void;
  completeLogin: (token: string, user?: User) => void;
  setMockUser: () => void;  // For local development
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: getAuthToken(),
      isAuthenticated: false,
      isLoading: true,
      error: null,

      checkAuth: async () => {
        set({ isLoading: true, error: null });

        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            credentials: 'include',
            headers: getAuthHeaders(),
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
                email: data.email,
              },
              accessToken: getAuthToken(),
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
        clearAuthToken();
        // Clear profile data on logout
        useProfileStore.getState().clearAll();
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      completeLogin: (token, user) => {
        setAuthToken(token);
        set({
          user: user ?? null,
          accessToken: token,
          isAuthenticated: Boolean(user),
          isLoading: false,
          error: null,
        });
        useProfileStore.getState().loadFromServer();
      },

      setMockUser: async () => {
        if (DEV_MODE) {
          try {
            const res = await fetch(`${API_BASE_URL}/auth/test-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
              throw new Error('Test login failed on server');
            }

            const data = await res.json();
            if (data.access_token) {
              get().completeLogin(data.access_token, {
                user_id: data.user.sub,
                username: data.user.username,
                email: data.user.email,
              });
            }
          } catch (error) {
            console.error('Failed to perform test login:', error);
            // Fallback to local memory if API fails
            clearAuthToken();
            set({
              user: MOCK_USER,
              accessToken: null,
              isAuthenticated: true,
              isLoading: false,
            });
            useProfileStore.getState().loadFromServer();
          }
        }
      },
    }),
    {
      name: 'jobfit-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
