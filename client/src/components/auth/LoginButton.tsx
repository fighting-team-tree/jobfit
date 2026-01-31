/**
 * Login Button for Replit Authentication
 *
 * Uses Replit's built-in authentication via the REPL_AUTH cookie.
 */
import { useEffect } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';

export function LoginButton() {
  const { user, isAuthenticated, isLoading, checkAuth, logout, setMockUser } = useAuthStore();

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-neutral-400">
        <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  // Logged in state
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <User className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-neutral-200">{user.username}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    );
  }

  // Not logged in state
  return (
    <div className="flex items-center gap-2">
      {/* Replit Login Button */}
      <script
        src="https://auth.util.repl.co/script.js"
        // @ts-ignore
        authed="checkAuth()"
      />
      <button
        onClick={() => {
          // Check if we're on Replit
          // @ts-ignore
          if (window.LoginWithReplit) {
            // @ts-ignore
            window.LoginWithReplit();
          } else {
            // For local development, use mock user
            setMockUser();
          }
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
      >
        <LogIn className="w-4 h-4" />
        <span>Log in with Replit</span>
      </button>
    </div>
  );
}

// Make checkAuth available globally for Replit auth script
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.checkAuth = () => {
    useAuthStore.getState().checkAuth();
  };
}
