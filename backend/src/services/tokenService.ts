import axios, { AxiosError } from 'axios';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { AppError, unauthorized, upstreamError } from '../utils/errors';
import { updateTokens } from './sessionService';
import type { Session, SpotifyTokenResponse, SpotifyTokens } from '../types';

/**
 * Ciclo de vida dos tokens do Spotify.
 * O client secret e o refresh token nunca saem deste processo.
 */

/** Renova o access token quando faltam menos de 60s para expirar. */
const REFRESH_THRESHOLD_MS = 60 * 1000;

/** Refreshes em andamento por sessao — evita duas renovacoes simultaneas. */
const inFlightRefreshes = new Map<string, Promise<SpotifyTokens>>();

function basicAuthHeader(): string {
  const raw = `${env.spotify.clientId}:${env.spotify.clientSecret}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

/** Monta a URL de autorizacao do Spotify (passo 3 do fluxo de auth). */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.spotify.clientId,
    response_type: 'code',
    redirect_uri: env.spotify.redirectUri,
    state,
    scope: env.spotify.scopes.join(' '),
    show_dialog: 'false',
  });
  return `${env.spotify.accountsUrl}/authorize?${params.toString()}`;
}

function toTokens(payload: SpotifyTokenResponse, previousRefreshToken?: string): SpotifyTokens {
  const refreshToken = payload.refresh_token || previousRefreshToken;
  if (!refreshToken) {
    throw upstreamError(
      'O Spotify nao devolveu refresh_token. Refaca o login.',
      'SPOTIFY_NO_REFRESH_TOKEN',
    );
  }
  return {
    accessToken: payload.access_token,
    refreshToken,
    // Margem de 10s para compensar latencia de rede.
    expiresAt: Date.now() + (payload.expires_in - 10) * 1000,
    scope: payload.scope || env.spotify.scopes.join(' '),
  };
}

function describeSpotifyAuthError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) return error;

  const axiosError = error as AxiosError<{ error?: string; error_description?: string }>;
  const status = axiosError.response?.status;
  const body = axiosError.response?.data;
  const reason = body?.error_description || body?.error;

  logger.error('Falha na troca de tokens com o Spotify', { status, reason });

  if (status === 400 && body?.error === 'invalid_grant') {
    return new AppError(400, 'SPOTIFY_INVALID_GRANT', 'Codigo de autorizacao invalido ou ja utilizado.');
  }
  if (status === 400 && body?.error === 'invalid_client') {
    return new AppError(
      500,
      'SPOTIFY_INVALID_CLIENT',
      'Credenciais do Spotify invalidas. Confira SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.',
      { expose: true },
    );
  }
  if (status === 400 && reason?.toLowerCase().includes('redirect uri')) {
    return new AppError(
      400,
      'SPOTIFY_REDIRECT_MISMATCH',
      'redirect_uri nao registrada no app do Spotify. Adicione a URI exata no dashboard.',
    );
  }
  return upstreamError(reason ? `${fallbackMessage} (${reason})` : fallbackMessage, 'SPOTIFY_AUTH_FAILED');
}

/** Troca o `code` do callback pelos tokens (passo 7 do fluxo de auth). */
export async function exchangeCodeForTokens(code: string, redirectUri?: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri || env.spotify.redirectUri,
  });

  try {
    const { data } = await axios.post<SpotifyTokenResponse>(
      `${env.spotify.accountsUrl}/api/token`,
      body.toString(),
      {
        headers: {
          Authorization: basicAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15_000,
      },
    );
    return toTokens(data);
  } catch (error) {
    throw describeSpotifyAuthError(error, 'Nao foi possivel autenticar com o Spotify.');
  }
}

async function requestRefresh(tokens: SpotifyTokens): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
  });

  try {
    const { data } = await axios.post<SpotifyTokenResponse>(
      `${env.spotify.accountsUrl}/api/token`,
      body.toString(),
      {
        headers: {
          Authorization: basicAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15_000,
      },
    );
    return toTokens(data, tokens.refreshToken);
  } catch (error) {
    const axiosError = error as AxiosError<{ error?: string }>;
    if (axiosError.response?.status === 400) {
      // Refresh token revogado (usuario removeu o acesso ao app).
      throw unauthorized('Autorizacao do Spotify revogada. Conecte novamente.', 'SPOTIFY_REVOKED');
    }
    throw describeSpotifyAuthError(error, 'Nao foi possivel renovar o acesso ao Spotify.');
  }
}

function isExpiring(tokens: SpotifyTokens): boolean {
  return tokens.expiresAt - Date.now() <= REFRESH_THRESHOLD_MS;
}

/**
 * Devolve um access token valido, renovando de forma transparente quando preciso.
 * Chamadas concorrentes para a mesma sessao compartilham o mesmo refresh.
 */
export async function getValidAccessToken(session: Session): Promise<string> {
  if (!isExpiring(session.tokens)) return session.tokens.accessToken;

  const existing = inFlightRefreshes.get(session.id);
  if (existing) {
    const tokens = await existing;
    return tokens.accessToken;
  }

  const refreshPromise = requestRefresh(session.tokens)
    .then((tokens) => {
      updateTokens(session, tokens);
      logger.debug('Access token do Spotify renovado', { sessionId: session.id });
      return tokens;
    })
    .finally(() => {
      inFlightRefreshes.delete(session.id);
    });

  inFlightRefreshes.set(session.id, refreshPromise);
  const tokens = await refreshPromise;
  return tokens.accessToken;
}

/** Forca a renovacao (usado quando a Spotify API responde 401 mesmo com token "valido"). */
export async function forceRefresh(session: Session): Promise<string> {
  session.tokens = { ...session.tokens, expiresAt: 0 };
  return getValidAccessToken(session);
}
