import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { logger } from './logger';

/**
 * Leitura e validacao centralizada das variaveis de ambiente.
 * Em producao, variaveis obrigatorias faltando derrubam o boot (fail fast).
 * Em desenvolvimento apenas avisamos, para nao travar quem esta explorando o projeto.
 */

function raw(key: string): string | undefined {
  const value = process.env[key];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function num(key: string, fallback: number): number {
  const value = raw(key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const missing: string[] = [];

function required(key: string, fallback = ''): string {
  const value = raw(key);
  if (!value) {
    missing.push(key);
    return fallback;
  }
  return value;
}

const nodeEnv = (raw('NODE_ENV') || 'development') as 'development' | 'production' | 'test';
const isProduction = nodeEnv === 'production';

const spotifyClientId = required('SPOTIFY_CLIENT_ID');
const spotifyClientSecret = required('SPOTIFY_CLIENT_SECRET');
const spotifyRedirectUri = required('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:5173/callback');
const aiApiKey = raw('AI_API_KEY') || raw('OPENAI_API_KEY') || '';

const frontendUrls = (raw('FRONTEND_URL') || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const env = {
  nodeEnv,
  isProduction,
  port: num('PORT', 3333),

  spotify: {
    clientId: spotifyClientId,
    clientSecret: spotifyClientSecret,
    redirectUri: spotifyRedirectUri,
    accountsUrl: 'https://accounts.spotify.com',
    apiUrl: 'https://api.spotify.com/v1',
    /**
     * Escopos minimos necessarios para tudo que o Soundscape coleta.
     * Nao pedimos escopos de escrita — o app so le dados.
     */
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-read-recently-played',
      'user-library-read',
      'user-follow-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-read-currently-playing',
      'user-read-playback-state',
    ],
  },

  ai: {
    provider: raw('AI_PROVIDER') || 'openai',
    apiKey: aiApiKey,
    model: raw('AI_MODEL') || 'gpt-4o',
    baseUrl: (raw('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    timeoutMs: num('AI_TIMEOUT_MS', 90_000),
    get enabled(): boolean {
      return aiApiKey.length > 0;
    },
  },

  session: {
    secret: raw('SESSION_SECRET') || randomBytes(32).toString('hex'),
    ttlMs: num('SESSION_TTL_HOURS', 12) * 60 * 60 * 1000,
    /** Cache do snapshot do Spotify (evita refazer ~30 requests por navegacao). */
    snapshotTtlMs: num('SNAPSHOT_TTL_MINUTES', 15) * 60 * 1000,
  },

  cors: {
    allowedOrigins: frontendUrls,
  },

  rateLimit: {
    windowMs: num('RATE_LIMIT_WINDOW_MINUTES', 15) * 60 * 1000,
    max: num('RATE_LIMIT_MAX', 300),
    aiMax: num('RATE_LIMIT_AI_MAX', 20),
  },
};

/** Valida o ambiente. Chamado uma vez no boot. */
export function assertEnv(): void {
  if (!raw('SESSION_SECRET')) {
    const message = 'SESSION_SECRET nao definido — usando segredo efemero gerado em memoria.';
    if (isProduction) missing.push('SESSION_SECRET');
    else logger.warn(message);
  }

  if (!env.ai.enabled) {
    logger.warn('AI_API_KEY nao definido — a analise de IA usara o modo fallback deterministico.');
  }

  if (missing.length > 0) {
    const list = [...new Set(missing)].join(', ');
    if (isProduction) {
      logger.error(`Variaveis de ambiente obrigatorias ausentes: ${list}`);
      throw new Error(`Missing required environment variables: ${list}`);
    }
    logger.warn(`Variaveis de ambiente ausentes (modo dev, seguindo mesmo assim): ${list}`);
  }
}
