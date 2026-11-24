import { ERROR_MESSAGES_VI } from '@openpaddy/shared';
import type { Context } from 'hono';

// NFR: All errors return user-friendly Vietnamese messages; log technical details server-side only
export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 404 | 409 | 422 | 500 | 504,
    public readonly userMessage: string,
    public readonly details?: unknown,
  ) {
    super(userMessage);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    console.error(`[API Error ${err.status}]`, err.message, err.details ?? '');
    return c.json(
      {
        error: err.userMessage,
        status: err.status,
      },
      err.status,
    );
  }

  const msg = err.message ?? '';
  if (
    msg.includes('D1') ||
    msg.includes('timeout') ||
    msg.includes('SQLITE_BUSY')
  ) {
    console.error('[D1 Timeout]', err);
    return c.json({ error: ERROR_MESSAGES_VI.D1_TIMEOUT, status: 504 }, 504);
  }

  console.error('[Unhandled API Error]', err);
  return c.json(
    {
      error: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      status: 500,
    },
    500,
  );
}
