/**
 * Auth Provider Component
 *
 * Wraps the app and handles initial auth check.
 */
import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '../../lib/authStore';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    // Check auth status on app load
    checkAuth();
  }, [checkAuth]);

  // Optional: Show a global loading state while checking auth
  // Commenting out to avoid blocking render
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
  //       <div className="flex flex-col items-center gap-4">
  //         <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  //         <p className="text-neutral-400 text-sm">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return <>{children}</>;
}
