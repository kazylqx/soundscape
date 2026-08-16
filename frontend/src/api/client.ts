import axios, { AxiosError, type AxiosRequestConfig, type AxiosInstance } from 'axios';
import type { ApiFailure, ApiSuccess } from '@/types';

/**
 * Cliente HTTP unico do app.
 *
 * Responsabilidades:
 *  - injetar o `X-Session-Token` em toda requisicao
 *  - desembrulhar o envelope { ok, data } do backend
 *  - converter qualquer falha em `ApiError` (com codigo estavel)
 *  - avisar o app quando a sessao morreu (401), para redirecionar
 *
 * Nenhum token do Spotify passa por aqui — apenas o session token opaco.
 */

export const SESSION_STORAGE_KEY = 'soundscape.sessionToken';

const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3333').replace(/\/+$/, '');

/* ============================================================
 * Erro tipado
 * ============================================================ */

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Sessao invalida/expirada: o app deve voltar para a home. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** Conta sem historico suficiente para montar o perfil. */
  get isNotEnoughData(): boolean {
    return this.code === 'NOT_ENOUGH_DATA';
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/* ============================================================
 * Token de sessao
 * ============================================================ */

export function getSessionToken(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    // localStorage pode estar bloqueado (modo privado restrito).
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {
    /* silencioso: o app continua funcionando na sessao atual */
  }
}

export function clearSessionToken(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/* ============================================================
 * Handler global de 401
 * ============================================================ */

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registrado pelo AuthContext para limpar o estado e navegar para a home. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/* ============================================================
 * Instancia
 * ============================================================ */

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  // A coleta do snapshot e a IA sao lentas por natureza.
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getSessionToken();
  if (token) {
    config.headers.set?.('X-Session-Token', token);
  }
  return config;
});

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const axiosError = error as AxiosError<ApiFailure>;

  if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
    return new ApiError(
      'A requisicao demorou demais. Tente novamente em instantes.',
      'TIMEOUT',
      408,
    );
  }

  if (!axiosError.response) {
    return new ApiError(
      'Nao foi possivel falar com o servidor. Verifique sua conexao.',
      'NETWORK_ERROR',
      0,
    );
  }

  const status = axiosError.response.status;
  const payload = axiosError.response.data;

  if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
    return new ApiError(payload.error.message, payload.error.code, status, payload.error.details);
  }

  return new ApiError(`Falha na requisicao (${status}).`, 'REQUEST_FAILED', status);
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);

    if (apiError.isUnauthorized) {
      clearSessionToken();
      unauthorizedHandler?.();
    }

    return Promise.reject(apiError);
  },
);

/* ============================================================
 * Helpers que desembrulham o envelope { ok, data }
 * ============================================================ */

function unwrap<T>(payload: ApiSuccess<T> | ApiFailure): T {
  if (payload && payload.ok === true) return payload.data;

  const failure = payload as ApiFailure;
  throw new ApiError(
    failure?.error?.message ?? 'Resposta inesperada do servidor.',
    failure?.error?.code ?? 'UNEXPECTED_RESPONSE',
    500,
  );
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiSuccess<T> | ApiFailure>(url, config);
  return unwrap<T>(response.data);
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.post<ApiSuccess<T> | ApiFailure>(url, body ?? {}, config);
  return unwrap<T>(response.data);
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiSuccess<T> | ApiFailure>(url, config);
  return unwrap<T>(response.data);
}

export const apiBaseUrl = API_URL;
