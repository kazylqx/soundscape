import type { NextFunction, Request, Response } from 'express';
import { getSessionByToken, touchSession } from '../services/sessionService';
import { unauthorized } from '../utils/errors';
import type { Session } from '../types';

/**
 * Autenticacao por session token.
 *
 * O browser manda `X-Session-Token: <uuid>.<hmac>`. Aqui esse token e
 * validado, a sessao correspondente e recuperada da memoria e anexada em
 * `req.session`. Os tokens do Spotify continuam so no servidor.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export const SESSION_HEADER = 'x-session-token';

function readToken(req: Request): string | undefined {
  const header = req.headers[SESSION_HEADER];
  if (typeof header === 'string' && header.trim().length > 0) return header.trim();
  if (Array.isArray(header) && header[0]) return header[0].trim();

  // Fallback para Authorization: Bearer <sessionToken>
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')) {
    const value = authorization.slice(7).trim();
    if (value.length > 0) return value;
  }
  return undefined;
}

/** Bloqueia a rota se nao houver sessao valida. */
export function requireSession(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    next(unauthorized('Token de sessao ausente.', 'SESSION_MISSING'));
    return;
  }

  const session = getSessionByToken(token);
  if (!session) {
    next(unauthorized('Sessao invalida ou expirada. Conecte o Spotify novamente.', 'SESSION_INVALID'));
    return;
  }

  touchSession(session);
  req.session = session;
  next();
}

/** Anexa a sessao quando existir, mas nao bloqueia a rota. */
export function optionalSession(req: Request, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (token) {
    const session = getSessionByToken(token);
    if (session) {
      touchSession(session);
      req.session = session;
    }
  }
  next();
}

/** Helper para rotas: garante o tipo nao-opcional apos `requireSession`. */
export function getSession(req: Request): Session {
  if (!req.session) {
    throw unauthorized('Sessao nao encontrada na requisicao.', 'SESSION_INVALID');
  }
  return req.session;
}
