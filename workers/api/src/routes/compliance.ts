import { complianceRecords, contracts, createDb, parcels } from '@openpaddy/db';
import {
  type ComplianceRule,
  ERROR_MESSAGES_VI,
  complianceCheckInSchema,
} from '@openpaddy/shared';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { inspectPhotoExif } from '../lib/exif.js';
import { uploadObjectToR2 } from '../lib/r2.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { validateParcelLocation } from '../middleware/geo-validate.js';
import type { AppVariables, Env } from '../types.js';

export const complianceRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

complianceRoutes.use('*', authMiddleware);

// POST /api/compliance/check-in -> Upload photo + geo-validate + EXIF check + D1 insert (FR-02)
complianceRoutes.post('/check-in', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    throw new AppError(400, ERROR_MESSAGES_VI.VALIDATION_FAILED);
  }

  const photo = formData.get('photo');
  if (!(photo instanceof File) || photo.size === 0) {
    throw new AppError(400, 'Vui lòng đính kèm ảnh chụp thực địa.');
  }

  const parsed = complianceCheckInSchema.safeParse({
    parcel_id: formData.get('parcel_id'),
    milestone_type: formData.get('milestone_type'),
    lat: formData.get('lat'),
    lng: formData.get('lng'),
    timestamp: formData.get('timestamp') ?? Date.now(),
    verified_by: formData.get('verified_by') || c.get('user').username,
  });

  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? ERROR_MESSAGES_VI.VALIDATION_FAILED,
      parsed.error.issues,
    );
  }

  const { parcel_id, milestone_type, lat, lng, timestamp, verified_by } =
    parsed.data;

  const db = createDb(c.env.DB);
  const parcel = await db
    .select()
    .from(parcels)
    .where(eq(parcels.id, parcel_id))
    .get();

  if (!parcel) {
    throw new AppError(404, ERROR_MESSAGES_VI.NOT_FOUND);
  }

  // Check duplicate milestone against contract rules (409)
  const existingRecords = await db
    .select()
    .from(complianceRecords)
    .where(
      and(
        eq(complianceRecords.parcel_id, parcel_id),
        eq(complianceRecords.milestone_type, milestone_type),
      ),
    );

  const contract = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, parcel.contract_id))
    .get();

  const rules = contract
    ? (JSON.parse(contract.compliance_rules) as ComplianceRule[])
    : [];
  const matchingRule = rules.find((r) => r.milestone === milestone_type);
  const maxAllowed =
    matchingRule?.min_count ?? (milestone_type === 'awd_drain' ? 3 : 1);

  if (existingRecords.length >= maxAllowed) {
    throw new AppError(409, ERROR_MESSAGES_VI.DUPLICATE_MILESTONE);
  }

  // FR-02: Geo-tag validation against parcel centroid (100m threshold)
  const geoValidation = validateParcelLocation(lat, lng, parcel.geometry);
  if (!geoValidation.valid) {
    return c.json(
      {
        error: ERROR_MESSAGES_VI.GEO_MISMATCH,
        geoValidation,
        status: 422,
      },
      422,
    );
  }

  // FR-02: EXIF integrity check
  const buffer = await photo.arrayBuffer();
  const exif = inspectPhotoExif(
    buffer,
    photo.type || 'application/octet-stream',
  );

  const recordId = `rec-${crypto.randomUUID().slice(0, 8)}`;
  const ext = photo.name.split('.').pop() || 'jpg';
  const photoKey = `compliance/${parcel_id}/${milestone_type}-${recordId}.${ext}`;

  await uploadObjectToR2(c.env, photoKey, buffer, photo.type || 'image/jpeg');

  const metadata = JSON.stringify({
    exif_data: exif,
    validation_result: geoValidation,
  });

  const newRecord = {
    id: recordId,
    parcel_id,
    milestone_type,
    photo_key: photoKey,
    lat,
    lng,
    timestamp,
    verified_by: verified_by ?? c.get('user').username,
    metadata,
  };

  await db.insert(complianceRecords).values(newRecord);

  return c.json(
    {
      record: newRecord,
      geoValidation,
      exif,
      message: `${geoValidation.messageVi} — Đã ghi nhận check-in thành công.`,
    },
    201,
  );
});
