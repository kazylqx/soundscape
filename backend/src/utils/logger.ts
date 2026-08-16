/**
 * Logger minimalista, sem dependencias.
 * - Respeita LOG_LEVEL (debug | info | warn | error)
 * - Redige automaticamente valores sensiveis (tokens, secrets, codes)
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY = /(token|secret|password|authorization|client_secret|code|api_key|apikey)/i;

function currentLevel(): Level {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return (['debug', 'info', 'warn', 'error'] as Level[]).includes(raw as Level) ? (raw as Level) : 'info';
}

function mask(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/** Remove/oculta segredos antes de qualquer coisa ir para o stdout. */
export function redact(input: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') return input.length > 400 ? `${input.slice(0, 400)}…` : input;
  if (typeof input === 'number' || typeof input === 'boolean') return input;
  if (input instanceof Error) return { name: input.name, message: input.message };
  if (Array.isArray(input)) return input.slice(0, 20).map((item) => redact(item, depth + 1));
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = typeof value === 'string' ? mask(value) : '***';
      } else {
        out[key] = redact(value, depth + 1);
      }
    }
    return out;
  }
  return String(input);
}

function emit(level: Level, message: string, meta?: unknown): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[currentLevel()]) return;

  const stamp = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5, ' ');
  const line = `[${stamp}] ${tag} ${message}`;
  const payload = meta === undefined ? undefined : redact(meta);

  if (level === 'error') {
    if (payload === undefined) console.error(line);
    else console.error(line, payload);
    return;
  }
  if (level === 'warn') {
    if (payload === undefined) console.warn(line);
    else console.warn(line, payload);
    return;
  }
  if (payload === undefined) console.log(line);
  else console.log(line, payload);
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
