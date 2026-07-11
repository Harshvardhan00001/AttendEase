import type { Response } from 'express';
import { logger } from './logger.js';

export function respondWithServerError(res: Response, context: string, error: unknown) {
  logger.error(`[${context}]`, error);
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : error instanceof Error
        ? error.message
        : 'Internal server error.';
  return res.status(500).json({ success: false, message });
}
