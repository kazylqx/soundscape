/** Erro de aplicacao com status HTTP e codigo estavel para o frontend. */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly expose: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { details?: unknown; expose?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.expose = options.expose ?? status < 500;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST', details?: unknown) =>
  new AppError(400, code, message, { details });

export const unauthorized = (message = 'Sessao invalida ou expirada.', code = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

export const forbidden = (message: string, code = 'FORBIDDEN') => new AppError(403, code, message);

export const notFound = (message: string, code = 'NOT_FOUND') => new AppError(404, code, message);

export const tooManyRequests = (message: string, code = 'RATE_LIMITED') =>
  new AppError(429, code, message);

export const upstreamError = (message: string, code = 'UPSTREAM_ERROR', details?: unknown) =>
  new AppError(502, code, message, { details, expose: true });

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
