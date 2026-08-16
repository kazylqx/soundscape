import rateLimit, { type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../utils/env';
import { SESSION_HEADER } from './auth';

/**
 * Rate limiting por sessao (com fallback para IP).
 *
 * Tres niveis:
 *  - `generalLimiter`: teto amplo para toda a API
 *  - `authLimiter`: protege a troca de code por token
 *  - `aiLimiter`: a rota mais cara, limite bem mais baixo
 */

function keyFromRequest(req: Request): string {
  const header = req.headers[SESSION_HEADER];
  const token = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : undefined;
  if (token) {
    // Usa apenas o uuid (antes do hmac) como chave.
    const separator = token.lastIndexOf('.');
    return `session:${separator > 0 ? token.slice(0, separator) : token}`;
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

const shared: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyFromRequest,
  // Deixamos o errorHandler global formatar a resposta.
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas requisicoes em pouco tempo. Aguarde um instante e tente de novo.',
      },
    });
  },
};

export const generalLimiter = rateLimit({
  ...shared,
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
});

export const authLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  max: 30,
});

export const aiLimiter = rateLimit({
  ...shared,
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.aiMax,
});

/** Coleta do snapshot: pesada no Spotify, merece limite proprio. */
export const snapshotLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  max: 40,
});
