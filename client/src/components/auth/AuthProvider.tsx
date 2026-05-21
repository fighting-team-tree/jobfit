/**
 * Auth Provider Component
 *
 * Wraps the app and handles initial auth check.
 */
import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../../lib/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { checkAuth, isAuthenticated, isLoading, accessToken, setMockUser } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Development mode: trigger automatic test login if not authenticated and no token exists
    const isDev = import.meta.env.DEV;
    if (isDev && !isLoading && !isAuthenticated && !accessToken) {
      console.log('[Dev Mode] Auto test login triggered');
      setMockUser();
    }
  }, [isLoading, isAuthenticated, accessToken, setMockUser]);

  return <>{children}</>;
}
