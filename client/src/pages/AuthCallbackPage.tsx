import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, type User } from '../lib/authStore';
import { setAuthToken } from '../lib/authToken';

const API_BASE = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

interface AuthCallbackResponse {
  access_token: string;
  user: {
    sub: string;
    username?: string;
    email?: string;
  };
}

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeLogin, checkAuth } = useAuthStore();
  const [message, setMessage] = useState('로그인 처리 중...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setMessage(`로그인 실패: ${error}`);
      return;
    }

    if (!code) {
      setMessage('로그인 코드가 없습니다.');
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/auth/callback/google?code=${encodeURIComponent(code)}`
        );

        if (!response.ok) {
          throw new Error(`OAuth callback failed: ${response.status}`);
        }

        const data = await response.json() as AuthCallbackResponse;
        const user: User = {
          user_id: data.user.sub,
          username: data.user.username || data.user.email || 'Google User',
          email: data.user.email,
        };

        setAuthToken(data.access_token);
        completeLogin(data.access_token, user);
        await checkAuth();
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '로그인 처리 실패';
        setMessage(errorMessage);
      }
    };

    void exchangeCode();
  }, [checkAuth, completeLogin, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-neutral-300">{message}</p>
      </div>
    </div>
  );
}
