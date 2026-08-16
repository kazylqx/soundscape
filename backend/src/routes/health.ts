import { Router } from 'express';
import { sessionStats } from '../services/sessionService';
import { env } from '../utils/env';

/**
 * Health check usado pela Square Cloud e pelo monitoramento.
 * Nao exige sessao e nao expoe nada sensivel.
 */

const router = Router();

const startedAt = Date.now();

router.get('/', (_req, res) => {
  const stats = sessionStats();

  res.json({
    ok: true,
    data: {
      status: 'healthy',
      service: 'soundscape-api',
      version: '1.0.0',
      environment: env.nodeEnv,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      sessions: stats,
      integrations: {
        spotify: Boolean(env.spotify.clientId && env.spotify.clientSecret),
        ai: env.ai.enabled,
        aiModel: env.ai.enabled ? env.ai.model : null,
      },
      memory: {
        heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
        rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
      },
    },
  });
});

export default router;
