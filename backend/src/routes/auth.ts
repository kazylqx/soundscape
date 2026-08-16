import { Router } from 'express';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { badRequest } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { getSession, requireSession } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import {
  consumeState,
  createSession,
  createState,
  destroySession,
} from '../services/sessionService';
import { buildAuthorizeUrl, exchangeCodeForTokens } from '../services/tokenService';
import { getMe, toSessionUser } from '../services/spotifyService';

/**
 * Fluxo OAuth do Spotify (Authorization Code).
 *
 *  GET  /auth/login     -> devolve a URL de autorizacao (o frontend redireciona)
 *  POST /auth/callback  -> troca o `code` por tokens e cria a sessao
 *  GET  /auth/me        -> dados do usuario da sessao atual
 *  POST /auth/logout    -> encerra a sessao
 *
 * O client_secret e os tokens do Spotify nunca saem deste processo.
 */

const router = Router();

router.get('/login', (_req, res) => {
  const state = createState();
  const url = buildAuthorizeUrl(state);

  res.json({
    ok: true,
    data: {
      url,
      state,
      redirectUri: env.spotify.redirectUri,
      scopes: env.spotify.scopes,
    },
  });
});

router.post(
  '/callback',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { code?: unknown; state?: unknown; error?: unknown };

    if (typeof body.error === 'string' && body.error.length > 0) {
      // O usuario negou o acesso na tela do Spotify.
      throw badRequest(
        body.error === 'access_denied'
          ? 'Voce recusou a conexao com o Spotify.'
          : `O Spotify retornou um erro: ${body.error}`,
        'SPOTIFY_AUTH_DENIED',
      );
    }

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) throw badRequest('Parametro `code` ausente.', 'CODE_MISSING');

    const state = typeof body.state === 'string' ? body.state : undefined;
    if (!consumeState(state)) {
      throw badRequest(
        'Requisicao de login expirada ou invalida. Volte ao inicio e conecte novamente.',
        'STATE_INVALID',
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    // Sessao temporaria apenas para a primeira chamada /me.
    const bootstrap = createSession(tokens, {
      id: 'pending',
      displayName: 'pending',
      imageUrl: null,
      followers: 0,
      spotifyUrl: '',
    });

    try {
      const profile = await getMe(bootstrap.session);
      const user = toSessionUser(profile);
      bootstrap.session.user = user;

      logger.info('Login concluido', { user: user.displayName, product: user.product });

      res.status(201).json({
        ok: true,
        data: {
          sessionToken: bootstrap.sessionToken,
          user,
          expiresAt: new Date(bootstrap.session.expiresAt).toISOString(),
        },
      });
    } catch (error) {
      destroySession(bootstrap.session.id);
      throw error;
    }
  }),
);

router.get('/me', requireSession, (req, res) => {
  const session = getSession(req);

  res.json({
    ok: true,
    data: {
      user: session.user,
      session: {
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        hasSnapshot: Boolean(session.snapshot),
        hasAIProfile: Boolean(session.aiProfile),
      },
    },
  });
});

router.post('/logout', requireSession, (req, res) => {
  const session = getSession(req);
  destroySession(session.id);
  res.json({ ok: true, data: { message: 'Sessao encerrada.' } });
});

export default router;
