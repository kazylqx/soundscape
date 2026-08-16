import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../utils/env';
import type { ApiFailure } from '../types';

/**
 * Tratamento centralizado de erros.
 * Toda falha sai no formato { ok: false, error: { code, message } },
 * que e exatamente o que o cliente Axios do frontend espera.
 */

/** Envolve handlers async para que rejeicoes cheguem ao errorHandler. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** 404 para rotas inexistentes. */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiFailure = {
    ok: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Rota nao encontrada: ${req.method} ${req.path}`,
    },
  };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // Se o header ja foi enviado, so encerra.
  if (res.headersSent) {
    logger.error('Erro apos o inicio da resposta', { path: req.path, error });
    res.end();
    return;
  }

  if (error instanceof AppError) {
    const level = error.status >= 500 ? 'error' : 'warn';
    logger[level]('Requisicao falhou', {
      path: req.path,
      method: req.method,
      status: error.status,
      code: error.code,
      message: error.message,
    });

    const body: ApiFailure = {
      ok: false,
      error: {
        code: error.code,
        message: error.expose ? error.message : 'Erro interno no servidor.',
        ...(error.details !== undefined && !env.isProduction ? { details: error.details } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  // JSON malformado no corpo da requisicao.
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      ok: false,
      error: { code: 'INVALID_JSON', message: 'Corpo da requisicao nao e um JSON valido.' },
    } satisfies ApiFailure);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error('Erro nao tratado', { path: req.path, method: req.method, message, stack });

  const body: ApiFailure = {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProduction ? 'Erro interno no servidor.' : message,
    },
  };
  res.status(500).json(body);
};
