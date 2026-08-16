import express, { type Application } from 'express';
import helmet from 'helmet';
import { assertEnv, env } from './utils/env';
import { logger } from './utils/logger';
import { corsMiddleware } from './middleware/cors';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { startSessionSweeper, stopSessionSweeper } from './services/sessionService';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import spotifyRoutes from './routes/spotify';
import aiRoutes from './routes/ai';

/**
 * Soundscape API.
 *
 * A API e um proxy seguro entre o frontend e o Spotify/IA:
 * nenhuma credencial de terceiro chega ao browser.
 */

export function createApp(): Application {
  const app = express();

  // A Square Cloud coloca a aplicacao atras de um proxy — necessario para
  // que req.ip e o rate limit funcionem com o IP real do cliente.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // A API so devolve JSON; nao precisamos de CSP para documentos.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  app.use(corsMiddleware);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  // Log leve de acesso (sem corpo, sem headers sensiveis).
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';
      logger[level](`${req.method} ${req.path} ${res.statusCode}`, {
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  });

  app.use(generalLimiter);

  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/spotify', spotifyRoutes);
  app.use('/ai', aiRoutes);

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      data: {
        name: 'Soundscape API',
        version: '1.0.0',
        docs: 'https://github.com/seu-usuario/soundscape#readme',
        endpoints: ['/health', '/auth/login', '/auth/callback', '/spotify/snapshot', '/ai/profile'],
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/* ============================================================
 * Bootstrap
 * ============================================================ */

function start(): void {
  assertEnv();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info('Soundscape API online', {
      port: env.port,
      environment: env.nodeEnv,
      allowedOrigins: env.cors.allowedOrigins,
      ai: env.ai.enabled ? env.ai.model : 'desabilitada (fallback)',
    });
  });

  startSessionSweeper();

  const shutdown = (signal: string) => {
    logger.info(`Recebido ${signal} — encerrando com elegancia`);
    stopSessionSweeper();
    server.close(() => {
      logger.info('Servidor encerrado');
      process.exit(0);
    });
    // Se as conexoes nao fecharem em 10s, encerra de todo modo.
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Promise rejeitada sem tratamento', { reason });
  });
  process.on('uncaughtException', (error) => {
    logger.error('Excecao nao capturada', { message: error.message, stack: error.stack });
  });
}

// Evita subir o servidor quando o modulo e importado (ex.: testes).
if (require.main === module) {
  start();
}
