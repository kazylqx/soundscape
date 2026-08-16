import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import type {
  AIProfile,
  CompareLink,
  MusicSnapshot,
  Session,
  SessionUser,
  SpotifyTokens,
} from '../types';

/**
 * Armazenamento de sessoes em memoria (Map simples, sem banco de dados).
 *
 * Consequencias assumidas desse design:
 *  - Restart do processo = todos deslogados (o frontend trata 401 redirecionando).
 *  - Nao escala horizontalmente. Para 1 instancia na Square Cloud esta perfeito.
 *
 * O token do Spotify vive somente aqui. O browser recebe apenas um
 * `sessionToken` assinado (uuid.hmac) que nao carrega nenhuma informacao.
 */

const sessions = new Map<string, Session>();

/** OAuth states pendentes: state -> criado em (ms). */
const pendingStates = new Map<string, number>();
const STATE_TTL_MS = 10 * 60 * 1000;

/** Links de comparacao: code -> CompareLink. */
const compareLinks = new Map<string, CompareLink>();
const COMPARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/* ============================================================
 * Assinatura do session token
 * ============================================================ */

function sign(sessionId: string): string {
  return createHmac('sha256', env.session.secret).update(sessionId).digest('base64url');
}

/** Token entregue ao browser: `<uuid>.<hmac>`. */
function buildToken(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

/** Valida a assinatura e devolve o uuid, ou null se o token foi adulterado. */
function parseToken(token: string): string | null {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const sessionId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(sessionId);

  if (signature.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return sessionId;
}

/* ============================================================
 * OAuth state (protecao contra CSRF no fluxo de autorizacao)
 * ============================================================ */

export function createState(): string {
  sweepStates();
  const state = randomUUID().replace(/-/g, '');
  pendingStates.set(state, Date.now());
  return state;
}

/** Consome o state (uso unico). Retorna false se invalido/expirado. */
export function consumeState(state: string | undefined): boolean {
  if (!state) return false;
  const createdAt = pendingStates.get(state);
  if (createdAt === undefined) return false;
  pendingStates.delete(state);
  return Date.now() - createdAt <= STATE_TTL_MS;
}

function sweepStates(): void {
  const now = Date.now();
  for (const [state, createdAt] of pendingStates) {
    if (now - createdAt > STATE_TTL_MS) pendingStates.delete(state);
  }
}

/* ============================================================
 * CRUD de sessao
 * ============================================================ */

export interface CreatedSession {
  sessionToken: string;
  session: Session;
}

export function createSession(tokens: SpotifyTokens, user: SessionUser): CreatedSession {
  const now = Date.now();
  const id = randomUUID();

  const session: Session = {
    id,
    tokens,
    user,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: now + env.session.ttlMs,
  };

  sessions.set(id, session);
  logger.info('Sessao criada', { sessionId: id, user: user.displayName, total: sessions.size });

  return { sessionToken: buildToken(id), session };
}

/** Resolve o header X-Session-Token em uma sessao viva. */
export function getSessionByToken(token: string | undefined): Session | null {
  if (!token) return null;
  const sessionId = parseToken(token);
  if (!sessionId) return null;
  return getSessionById(sessionId);
}

export function getSessionById(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    logger.info('Sessao expirada removida', { sessionId });
    return null;
  }
  return session;
}

/** Renova a janela de vida da sessao a cada requisicao autenticada. */
export function touchSession(session: Session): void {
  const now = Date.now();
  session.lastSeenAt = now;
  session.expiresAt = now + env.session.ttlMs;
}

export function updateTokens(session: Session, tokens: SpotifyTokens): void {
  session.tokens = tokens;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
  for (const [code, link] of compareLinks) {
    if (link.ownerSessionId === sessionId) compareLinks.delete(code);
  }
  logger.info('Sessao encerrada', { sessionId, total: sessions.size });
}

/* ============================================================
 * Caches por sessao
 * ============================================================ */

export function cacheSnapshot(session: Session, snapshot: MusicSnapshot): void {
  session.snapshot = snapshot;
  session.snapshotAt = Date.now();
}

export function getCachedSnapshot(session: Session): MusicSnapshot | null {
  if (!session.snapshot || !session.snapshotAt) return null;
  if (Date.now() - session.snapshotAt > env.session.snapshotTtlMs) return null;
  return session.snapshot;
}

export function cacheAIProfile(session: Session, profile: AIProfile): void {
  session.aiProfile = profile;
  session.aiProfileAt = Date.now();
}

export function getCachedAIProfile(session: Session): AIProfile | null {
  return session.aiProfile ?? null;
}

export function clearAIProfile(session: Session): void {
  delete session.aiProfile;
  delete session.aiProfileAt;
}

/* ============================================================
 * Links de comparacao
 * ============================================================ */

export function createCompareLink(session: Session): CompareLink {
  sweepCompareLinks();

  const code = randomUUID().replace(/-/g, '').slice(0, 10);
  const link: CompareLink = {
    code,
    ownerSessionId: session.id,
    ownerName: session.user.displayName,
    ownerImage: session.user.imageUrl,
    createdAt: Date.now(),
    expiresAt: Date.now() + COMPARE_TTL_MS,
  };

  compareLinks.set(code, link);
  return link;
}

export function getCompareLink(code: string): CompareLink | null {
  const link = compareLinks.get(code);
  if (!link) return null;
  if (Date.now() > link.expiresAt) {
    compareLinks.delete(code);
    return null;
  }
  return link;
}

function sweepCompareLinks(): void {
  const now = Date.now();
  for (const [code, link] of compareLinks) {
    if (now > link.expiresAt) compareLinks.delete(code);
  }
}

/* ============================================================
 * Manutencao
 * ============================================================ */

export function sweepSessions(): number {
  const now = Date.now();
  let removed = 0;
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id);
      removed += 1;
    }
  }
  if (removed > 0) logger.debug('Sweep de sessoes', { removed, remaining: sessions.size });
  return removed;
}

export function sessionStats(): { active: number; pendingStates: number; compareLinks: number } {
  return {
    active: sessions.size,
    pendingStates: pendingStates.size,
    compareLinks: compareLinks.size,
  };
}

let sweepTimer: NodeJS.Timeout | null = null;

export function startSessionSweeper(intervalMs = 5 * 60 * 1000): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    sweepSessions();
    sweepStates();
    sweepCompareLinks();
  }, intervalMs);
  sweepTimer.unref();
}

export function stopSessionSweeper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
