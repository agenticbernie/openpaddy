import {
  complianceRecords,
  createDb,
  harvestSlots,
  parcels,
} from '@openpaddy/db';
import {
  ERROR_MESSAGES_VI,
  type HarvestEstimateResponse,
  harvestSlotSchema,
} from '@openpaddy/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import type { AppVariables, Env } from '../types.js';

const DAY_MS = 86_400_000;
const DEFAULT_VARIETY_DAYS = 95;

export const parcelRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

parcelRoutes.use('*', authMiddleware);

// GET /api/parcels/:id/harvest-estimate -> Rule-based harvest date estimation (FR-04)
parcelRoutes.get('/:id/harvest-estimate', async (c) => {
  const parcelId = c.req.param('id');
  const db = createDb(c.env.DB);

  const parcel = await db
    .select()
    .from(parcels)
    .where(eq(parcels.id, parcelId))
    .get();

  if (!parcel) {
    throw new AppError(404, ERROR_MESSAGES_VI.NOT_FOUND);
  }

  const records = await db
    .select()
    .from(complianceRecords)
    .where(eq(complianceRecords.parcel_id, parcelId));

  const existingSlot = await db
    .select()
    .from(harvestSlots)
    .where(eq(harvestSlots.parcel_id, parcelId))
    .get();

  const hasAwd = records.some((r) => r.milestone_type === 'awd_drain');
  const hasStraw = records.some((r) => r.milestone_type === 'straw_mgmt');
  const complianceDelayDays = (hasAwd ? 0 : 3) + (hasStraw ? 0 : 2);

  const ruleEstimatedDate =
    parcel.sowing_date + (DEFAULT_VARIETY_DAYS + complianceDelayDays) * DAY_MS;

  const response: HarvestEstimateResponse = {
    parcel_id: parcel.id,
    sowing_date: parcel.sowing_date,
    variety_days: DEFAULT_VARIETY_DAYS,
    compliance_delay_days: complianceDelayDays,
    estimated_date: existingSlot?.estimated_date ?? ruleEstimatedDate,
    status: existingSlot?.status ?? 'pending',
    confirmed_by_dn: existingSlot?.confirmed_by_dn ?? null,
  };

  return c.json(response);
});

// PATCH /api/parcels/:id/harvest-estimate -> DN edits/confirms harvest date (FR-04)
parcelRoutes.patch('/:id/harvest-estimate', async (c) => {
  const parcelId = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = harvestSlotSchema.safeParse({
    ...(typeof body === 'object' && body !== null ? body : {}),
    parcel_id: parcelId,
  });

  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? ERROR_MESSAGES_VI.VALIDATION_FAILED,
    );
  }

  const db = createDb(c.env.DB);
  const parcel = await db
    .select()
    .from(parcels)
    .where(eq(parcels.id, parcelId))
    .get();

  if (!parcel) {
    throw new AppError(404, ERROR_MESSAGES_VI.NOT_FOUND);
  }

  const existingSlot = await db
    .select()
    .from(harvestSlots)
    .where(eq(harvestSlots.parcel_id, parcelId))
    .get();

  const confirmedBy =
    parsed.data.confirmed_by_dn ?? c.get('user').dn_id ?? 'dn-mekong-export';

  if (existingSlot) {
    await db
      .update(harvestSlots)
      .set({
        estimated_date: parsed.data.estimated_date,
        status: parsed.data.status,
        confirmed_by_dn: confirmedBy,
      })
      .where(eq(harvestSlots.id, existingSlot.id));
  } else {
    await db.insert(harvestSlots).values({
      id: `slot-${crypto.randomUUID().slice(0, 8)}`,
      parcel_id: parcelId,
      estimated_date: parsed.data.estimated_date,
      confirmed_by_dn: confirmedBy,
      status: parsed.data.status,
    });
  }

  return c.json({
    parcel_id: parcelId,
    estimated_date: parsed.data.estimated_date,
    status: parsed.data.status,
    confirmed_by_dn: confirmedBy,
    message: 'Đã cập nhật lịch thu hoạch dự kiến.',
  });
});
