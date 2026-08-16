import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler } from '@/api/client';
import { useAuthStore, type AuthStatus } from '@/stores/authStore';
import { useMusicStore } from '@/stores/musicStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { SessionUser } from '@/types';

/**
 * Contexto de autenticacao.
 *
 * Duas responsabilidades que precisam da arvore do React:
 *  - confirmar a sessao salva no localStorage quando o app monta
 *  - reagir a um 401 do backend limpando tudo e voltando para a home
 */

export interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  error: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate();

  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const startLogin = useAuthStore((state) => state.startLogin);
  const logoutStore = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const handleUnauthorized = useAuthStore((state) => state.handleUnauthorized);

  const resetMusic = useMusicStore((state) => state.reset);
  const stopPlayer = usePlayerStore((state) => state.stop);

  // Evita rodar o bootstrap duas vezes no StrictMode.
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void bootstrap();
  }, [bootstrap]);

  /* ---------- 401 vindo de qualquer requisicao ---------- */

  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleUnauthorized();
      resetMusic();
      stopPlayer();

      // /callback trata o proprio erro; nao atropelamos a tela dele.
      if (window.location.pathname !== '/' && window.location.pathname !== '/callback') {
        navigate('/', { replace: true });
      }
    });

    return () => setUnauthorizedHandler(null);
  }, [handleUnauthorized, navigate, resetMusic, stopPlayer]);

  const login = useCallback(async () => {
    await startLogin();
  }, [startLogin]);

  const logout = useCallback(async () => {
    await logoutStore();
    resetMusic();
    stopPlayer();
    navigate('/', { replace: true });
  }, [logoutStore, navigate, resetMusic, stopPlayer]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'idle' || status === 'checking' || status === 'authenticating',
      login,
      logout,
      clearError,
    }),
    [status, user, error, login, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ============================================================
 * Guarda de rota
 * ============================================================ */

/** Envolve rotas privadas. Sem sessao, manda para a home. */
export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const status = useAuthStore((state) => state.status);

  if (status === 'idle' || status === 'checking' || status === 'authenticating') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <div className="flex items-end gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className="h-8 w-1.5 origin-bottom rounded-full bg-spotify-bright animate-bar-bounce"
                style={{ animationDelay: `${index * 0.12}s` }}
              />
            ))}
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-chalk-muted">
            verificando sessao
          </p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
