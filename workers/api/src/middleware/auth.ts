import { ERROR_MESSAGES_VI } from '@openpaddy/shared';
import type { MiddlewareHandler } from 'hono';
import { jwtVerify } from 'jose';
import type { AppVariables, AuthUser, Env } from '../types.js';
import { AppError } from './error-handler.js';

// FR-00: Custom jose JWT verification middleware
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AppVariables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, ERROR_MESSAGES_VI.UNAUTHORIZED);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new AppError(401, ERROR_MESSAGES_VI.UNAUTHORIZED);
  }

  try {
    const secret = new TextEncoder().encode(
      c.env.JWT_SECRET || 'openpaddy-dev-jwt-secret-change-in-prod-2027',
    );
    const { payload } = await jwtVerify(token, secret);
    const user: AuthUser = {
      sub: String(payload.sub ?? ''),
      username: String(payload.username ?? ''),
      role: payload.role === 'htx' ? 'htx' : 'dn',
      dn_id: String(payload.dn_id ?? 'dn-mekong-export'),
    };
    c.set('user', user);
    await next();
  } catch (err) {
    throw new AppError(401, ERROR_MESSAGES_VI.UNAUTHORIZED, err);
  }
};
