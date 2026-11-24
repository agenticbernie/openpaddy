import { contracts, createDb, greenDossiers } from '@openpaddy/db';
import { ERROR_MESSAGES_VI, greenDossierSchema } from '@openpaddy/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createPresignedR2Url } from '../lib/r2.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import type { AppVariables, Env } from '../types.js';

export const dossierRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

dossierRoutes.use('*', authMiddleware);

// POST /api/dossiers/generate -> Create dossier record, return presigned URL (FR-05)
dossierRoutes.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = greenDossierSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? ERROR_MESSAGES_VI.VALIDATION_FAILED,
    );
  }

  const db = createDb(c.env.DB);
  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, parsed.data.contract_id))
    .get();

  if (!contract) {
    throw new AppError(404, ERROR_MESSAGES_VI.NOT_FOUND);
  }

  const dossierId = `dossier-${crypto.randomUUID().slice(0, 8)}`;
  const pdfKey = `dossiers/${parsed.data.contract_id}/${dossierId}.pdf`;
  const generatedAt = Date.now();

  const record = {
    id: dossierId,
    contract_id: parsed.data.contract_id,
    parcel_ids: JSON.stringify(parsed.data.parcel_ids),
    generated_at: generatedAt,
    pdf_key: pdfKey,
  };

  await db.insert(greenDossiers).values(record);

  const presignedUrl = await createPresignedR2Url(c.env, pdfKey);

  return c.json(
    {
      dossier: {
        ...record,
        parcel_ids: parsed.data.parcel_ids,
      },
      presigned_url: presignedUrl,
      expires_in_seconds: 86_400,
      message: 'Đã tạo hồ sơ Green Dossier thành công.',
    },
    201,
  );
});

// GET /api/dossiers/:id/pdf -> Return presigned R2 URL expiring in 24h (FR-05)
dossierRoutes.get('/:id/pdf', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  const dossier = await db
    .select()
    .from(greenDossiers)
    .where(eq(greenDossiers.id, id))
    .get();

  if (!dossier) {
    throw new AppError(404, ERROR_MESSAGES_VI.NOT_FOUND);
  }

  const presignedUrl = await createPresignedR2Url(c.env, dossier.pdf_key);

  return c.json({
    id: dossier.id,
    contract_id: dossier.contract_id,
    pdf_key: dossier.pdf_key,
    presigned_url: presignedUrl,
    expires_in_seconds: 86_400,
  });
});
