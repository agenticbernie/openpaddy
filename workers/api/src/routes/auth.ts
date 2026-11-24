import { ERROR_MESSAGES_VI, loginSchema } from '@openpaddy/shared';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { AppError } from '../middleware/error-handler.js';
import type { Env } from '../types.js';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /api/auth/login -> Issue JWT (mock: admin/openpaddy2027)
authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? ERROR_MESSAGES_VI.VALIDATION_FAILED,
    );
  }

  const { username, password } = parsed.data;
  if (username !== 'admin' || password !== 'openpaddy2027') {
    throw new AppError(
      401,
      'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại.',
    );
  }

  const secret = new TextEncoder().encode(
    c.env.JWT_SECRET || 'openpaddy-dev-jwt-secret-change-in-prod-2027',
  );

  const token = await new SignJWT({
    username: 'admin',
    role: 'dn',
    dn_id: 'dn-mekong-export',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-admin-01')
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return c.json({
    token,
    user: {
      id: 'user-admin-01',
      username: 'admin',
      role: 'dn',
      dn_id: 'dn-mekong-export',
      display_name: 'Mekong Rice Export JSC',
    },
  });
});
