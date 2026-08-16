import { create } from 'zustand';
import {
  ApiError,
  apiGet,
  apiPost,
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from '@/api/client';
import type { CallbackPayload, LoginPayload, SessionUser } from '@/types';

/**
 * Estado de autenticacao.
 *
 * O fluxo completo:
 *  1. `startLogin()` pede a URL de autorizacao ao backend e redireciona
 *  2. o Spotify volta para /callback?code=...&state=...
 *  3. `completeLogin(code, state)` troca o code por um sessionToken
 *  4. o sessionToken vai para o localStorage e passa a viajar em header
 */

export type AuthStatus = 'idle' | 'checking' | 'authenticating' | 'authenticated' | 'unauthenticated';

/** Guarda o state do OAuth entre o redirect e a volta do Spotify. */
const OAUTH_STATE_KEY = 'soundscape.oauthState';

interface AuthState {
  status: AuthStatus;
  user: SessionUser | null;
  error: string | null;
  expiresAt: string | null;

  /** Le o token salvo e confirma com o backend se a sessao ainda vive. */
  bootstrap: () => Promise<void>;
  startLogin: () => Promise<void>;
  completeLogin: (code: string, state: string | null) => Promise<void>;
  logout: () => Promise<void>;
  /** Chamado pelo interceptor quando o backend devolve 401. */
  handleUnauthorized: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  user: null,
  error: null,
  expiresAt: null,

  bootstrap: async () => {
    const token = getSessionToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null });
      return;
    }

    set({ status: 'checking' });

    try {
      const data = await apiGet<{ user: SessionUser; session: { expiresAt: string } }>('/auth/me');
      set({
        status: 'authenticated',
        user: data.user,
        expiresAt: data.session.expiresAt,
        error: null,
      });
    } catch (error) {
      // 401 ja limpou o token no interceptor.
      clearSessionToken();
      set({
        status: 'unauthenticated',
        user: null,
        error: error instanceof ApiError && !error.isUnauthorized ? error.message : null,
      });
    }
  },

  startLogin: async () => {
    set({ status: 'authenticating', error: null });

    try {
      const data = await apiGet<LoginPayload>('/auth/login');

      try {
        window.sessionStorage.setItem(OAUTH_STATE_KEY, data.state);
      } catch {
        /* sem sessionStorage o state ainda vai na URL do Spotify */
      }

      window.location.assign(data.url);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Nao foi possivel iniciar a conexao com o Spotify.';
      set({ status: 'unauthenticated', error: message });
      throw error;
    }
  },

  completeLogin: async (code, state) => {
    set({ status: 'authenticating', error: null });

    let storedState: string | null = null;
    try {
      storedState = window.sessionStorage.getItem(OAUTH_STATE_KEY);
      window.sessionStorage.removeItem(OAUTH_STATE_KEY);
    } catch {
      /* noop */
    }

    try {
      const data = await apiPost<CallbackPayload>('/auth/callback', {
        code,
        // O state da URL e a fonte da verdade; o guardado e apenas reserva.
        state: state ?? storedState,
      });

      setSessionToken(data.sessionToken);
      set({
        status: 'authenticated',
        user: data.user,
        expiresAt: data.expiresAt,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Nao foi possivel concluir o login.';
      clearSessionToken();
      set({ status: 'unauthenticated', user: null, error: message });
      throw error;
    }
  },

  logout: async () => {
    try {
      await apiPost('/auth/logout');
    } catch {
      // Se o backend nao responder, o logout local ainda vale.
    }
    clearSessionToken();
    set({ status: 'unauthenticated', user: null, expiresAt: null, error: null });
  },

  handleUnauthorized: () => {
    if (get().status === 'unauthenticated') return;
    clearSessionToken();
    set({
      status: 'unauthenticated',
      user: null,
      expiresAt: null,
      error: 'Sua sessao expirou. Conecte o Spotify novamente.',
    });
  },

  clearError: () => set({ error: null }),
}));
