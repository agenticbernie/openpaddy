import { createDb, seedDatabase } from '@openpaddy/db';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middleware/error-handler.js';
import { authRoutes } from './routes/auth.js';
import { complianceRoutes } from './routes/compliance.js';
import { contractRoutes } from './routes/contracts.js';
import { dossierRoutes } from './routes/dossiers.js';
import { parcelRoutes } from './routes/parcels.js';
import type { AppVariables, Env } from './types.js';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.onError(errorHandler);

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'openpaddy-api', timestamp: Date.now() }),
);

// Dev helper endpoint to seed local D1 database for demo
app.post('/api/dev/seed', async (c) => {
  const db = createDb(c.env.DB);
  await seedDatabase(db);
  return c.json({ ok: true, message: 'Đã nạp dữ liệu mẫu Cần Thơ.' });
});

app.route('/api/auth', authRoutes);
app.route('/api/contracts', contractRoutes);
app.route('/api/compliance', complianceRoutes);
app.route('/api/parcels', parcelRoutes);
app.route('/api/dossiers', dossierRoutes);

export default app;
export { app };
