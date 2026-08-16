import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getSession, requireSession } from '../middleware/auth';
import { snapshotLimiter } from '../middleware/rateLimit';
import { badRequest, notFound } from '../utils/errors';
import { compareSnapshots, computeMetrics } from '../utils/musicAnalyzer';
import { getSnapshotWithMetrics, refreshNowPlaying, searchArtist } from '../services/spotifyService';
import {
  createCompareLink,
  getCompareLink,
  getSessionById,
} from '../services/sessionService';
import { env } from '../utils/env';

/**
 * Dados musicais.
 *
 *  GET  /spotify/snapshot          -> coleta completa + metricas derivadas
 *  GET  /spotify/now-playing       -> tocando agora (leve, para polling)
 *  GET  /spotify/search/artist     -> busca de artista (usada na tela de recomendacoes)
 *  POST /spotify/compare/link      -> gera o link de comparacao do usuario
 *  GET  /spotify/compare/:code     -> metadados publicos do link
 *  POST /spotify/compare/:code     -> executa a comparacao (exige sessao do amigo)
 */

const router = Router();

router.get(
  '/snapshot',
  requireSession,
  snapshotLimiter,
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    const force = req.query.refresh === 'true' || req.query.refresh === '1';

    const { snapshot, metrics, cached } = await getSnapshotWithMetrics(session, { force });

    res.json({ ok: true, data: { snapshot, metrics, cached } });
  }),
);

router.get(
  '/now-playing',
  requireSession,
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    const current = await refreshNowPlaying(session);
    res.json({ ok: true, data: { currentlyPlaying: current } });
  }),
);

router.get(
  '/search/artist',
  requireSession,
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2) throw badRequest('Informe ao menos 2 caracteres em `q`.', 'QUERY_TOO_SHORT');

    const artist = await searchArtist(session, query);
    res.json({ ok: true, data: { artist } });
  }),
);

/* ============================================================
 * Comparacao com amigos
 * ============================================================ */

router.post(
  '/compare/link',
  requireSession,
  asyncHandler(async (req, res) => {
    const session = getSession(req);

    // Garante que o snapshot do dono esteja pronto antes de compartilhar o link.
    await getSnapshotWithMetrics(session);

    const link = createCompareLink(session);
    const frontend = env.cors.allowedOrigins[0] ?? '';

    res.status(201).json({
      ok: true,
      data: {
        code: link.code,
        url: `${frontend}/compare?code=${link.code}`,
        expiresAt: new Date(link.expiresAt).toISOString(),
      },
    });
  }),
);

router.get('/compare/:code', (req, res) => {
  const code = String(req.params.code || '');
  const link = getCompareLink(code);

  if (!link) {
    throw notFound('Link de comparacao invalido ou expirado.', 'COMPARE_LINK_NOT_FOUND');
  }

  const owner = getSessionById(link.ownerSessionId);

  res.json({
    ok: true,
    data: {
      code: link.code,
      ownerName: link.ownerName,
      ownerImage: link.ownerImage,
      // Se a sessao do dono caiu, a comparacao nao pode acontecer.
      ready: Boolean(owner),
      expiresAt: new Date(link.expiresAt).toISOString(),
    },
  });
});

router.post(
  '/compare/:code',
  requireSession,
  snapshotLimiter,
  asyncHandler(async (req, res) => {
    const guestSession = getSession(req);
    const code = String(req.params.code || '');

    const link = getCompareLink(code);
    if (!link) throw notFound('Link de comparacao invalido ou expirado.', 'COMPARE_LINK_NOT_FOUND');

    const ownerSession = getSessionById(link.ownerSessionId);
    if (!ownerSession) {
      throw notFound(
        'A sessao de quem criou o link expirou. Peca um link novo para comparar.',
        'COMPARE_OWNER_GONE',
      );
    }

    if (ownerSession.id === guestSession.id) {
      throw badRequest('Este link e seu — compartilhe com alguem para comparar.', 'COMPARE_SELF');
    }

    const [owner, guest] = await Promise.all([
      getSnapshotWithMetrics(ownerSession),
      getSnapshotWithMetrics(guestSession),
    ]);

    link.guestSessionId = guestSession.id;

    const result = compareSnapshots(
      { snapshot: owner.snapshot, metrics: owner.metrics },
      { snapshot: guest.snapshot, metrics: guest.metrics },
    );

    res.json({ ok: true, data: { comparison: result } });
  }),
);

/* ============================================================
 * Metricas isoladas (util para debug e para o card de stats)
 * ============================================================ */

router.get(
  '/metrics',
  requireSession,
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    const { snapshot } = await getSnapshotWithMetrics(session);
    res.json({ ok: true, data: { metrics: computeMetrics(snapshot), meta: snapshot.meta } });
  }),
);

export default router;
