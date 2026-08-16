import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getSession, requireSession } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { badRequest } from '../utils/errors';
import { env } from '../utils/env';
import { generateProfile } from '../services/aiService';
import { getSnapshotWithMetrics } from '../services/spotifyService';
import { cacheAIProfile, clearAIProfile, getCachedAIProfile } from '../services/sessionService';

/**
 * Analise de IA.
 *
 *  POST /ai/profile         -> gera (ou devolve do cache) o perfil de IA
 *  GET  /ai/profile         -> somente o cache, sem gastar tokens
 *  DELETE /ai/profile       -> descarta o cache para forcar uma nova geracao
 */

const router = Router();

router.post(
  '/profile',
  requireSession,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const session = getSession(req);
    const body = (req.body ?? {}) as { force?: unknown };
    const force = body.force === true;

    if (!force) {
      const cached = getCachedAIProfile(session);
      if (cached) {
        res.json({ ok: true, data: { profile: cached, cached: true } });
        return;
      }
    }

    const { snapshot, metrics } = await getSnapshotWithMetrics(session);

    if (!snapshot.meta.hasEnoughData) {
      throw badRequest(
        'Ainda nao ha historico suficiente no seu Spotify para montar um perfil. Ouca mais algumas musicas e volte.',
        'NOT_ENOUGH_DATA',
      );
    }

    const profile = await generateProfile(session, snapshot, metrics);
    cacheAIProfile(session, profile);

    res.json({ ok: true, data: { profile, cached: false } });
  }),
);

router.get('/profile', requireSession, (req, res) => {
  const session = getSession(req);
  const cached = getCachedAIProfile(session);

  res.json({
    ok: true,
    data: {
      profile: cached,
      cached: Boolean(cached),
      aiEnabled: env.ai.enabled,
    },
  });
});

router.delete('/profile', requireSession, (req, res) => {
  const session = getSession(req);
  clearAIProfile(session);
  res.json({ ok: true, data: { message: 'Analise de IA descartada.' } });
});

export default router;
