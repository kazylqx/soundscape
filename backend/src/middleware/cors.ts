import cors, { type CorsOptions } from 'cors';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { SESSION_HEADER } from './auth';

/**
 * CORS restrito as origens declaradas em FRONTEND_URL.
 *
 * Em desenvolvimento tambem liberamos localhost/127.0.0.1 em qualquer porta,
 * porque o Vite troca de porta quando a 5173 esta ocupada.
 */

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowed(origin: string): boolean {
  const normalized = origin.replace(/\/+$/, '');
  if (env.cors.allowedOrigins.includes(normalized)) return true;
  if (!env.isProduction && LOCAL_ORIGIN.test(normalized)) return true;
  return false;
}

const options: CorsOptions = {
  origin(origin, callback) {
    // Requisicoes sem Origin (curl, health check da Square Cloud) passam.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowed(origin)) {
      callback(null, true);
      return;
    }

    logger.warn('Origem bloqueada pelo CORS', { origin, allowed: env.cors.allowedOrigins });
    callback(null, false);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', SESSION_HEADER, 'X-Requested-With'],
  exposedHeaders: ['Retry-After'],
  // Nao usamos cookies: a sessao viaja em header proprio.
  credentials: false,
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(options);
export const corsOptions = options;
