/**
 * Login Button for Google OAuth authentication.
 *
 * Starts the backend-managed Google OAuth flow.
 */
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';

export function LoginButton() {
  const { user, isAuthenticated, isLoading, logout, setMockUser } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

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
      <button
        onClick={() => {
          if (import.meta.env.DEV) {
            setMockUser();
            return;
          }
          window.location.href = `${apiBase}/auth/login/google`;
        }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
      >
        <LogIn className="w-4 h-4" />
        <span>Log in with Replit</span>
      </button>
    </div>
  );
}
