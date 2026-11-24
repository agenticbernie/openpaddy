import {
  complianceRecords,
  contracts,
  createDb,
  harvestSlots,
  parcels,
} from '@openpaddy/db';
import {
  type ComplianceRule,
  ERROR_MESSAGES_VI,
  createContractSchema,
} from '@openpaddy/shared';
import { desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import type { AppVariables, Env } from '../types.js';

export const contractRoutes = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

contractRoutes.use('*', authMiddleware);

// GET /api/contracts -> List contracts (filter by dn_id query param)
contractRoutes.get('/', async (c) => {
  const db = createDb(c.env.DB);
  const dnId = c.req.query('dn_id');

  const contractRows = dnId
    ? await db
        .select()
        .from(contracts)
        .where(eq(contracts.dn_id, dnId))
        .orderBy(desc(contracts.created_at))
    : await db.select().from(contracts).orderBy(desc(contracts.created_at));

  const contractIds = contractRows.map((row) => row.id);
  const parcelRows =
    contractIds.length > 0
      ? await db
          .select()
          .from(parcels)
          .where(inArray(parcels.contract_id, contractIds))
      : [];

  const parcelIds = parcelRows.map((p) => p.id);
  const recordRows =
    parcelIds.length > 0
      ? await db
          .select()
          .from(complianceRecords)
          .where(inArray(complianceRecords.parcel_id, parcelIds))
      : [];
  const slotRows =
    parcelIds.length > 0
      ? await db
          .select()
          .from(harvestSlots)
          .where(inArray(harvestSlots.parcel_id, parcelIds))
      : [];

  const result = contractRows.map((contract) => {
    const rules = JSON.parse(contract.compliance_rules) as ComplianceRule[];
    const contractParcels = parcelRows
      .filter((p) => p.contract_id === contract.id)
      .map((p) => {
        const recs = recordRows.filter((r) => r.parcel_id === p.id);
        const slot = slotRows.find((s) => s.parcel_id === p.id) ?? null;

        // FR-03: Auto-validation engine against contract rules
        const violations: string[] = [];
        for (const rule of rules) {
          const count = recs.filter(
            (r) => r.milestone_type === rule.milestone,
          ).length;
          if (count < rule.min_count) {
            violations.push(
              `Thiếu ${rule.min_count - count} lần ${rule.milestone}`,
            );
          }
        }

        return {
          ...p,
          records: recs,
          harvest_slot: slot,
          compliant: violations.length === 0,
          violations,
        };
      });

    return {
      ...contract,
      compliance_rules: rules,
      parcels: contractParcels,
    };
  });

  return c.json({ contracts: result });
});

// POST /api/contracts -> Create contract (FR-01)
contractRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createContractSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message ?? ERROR_MESSAGES_VI.VALIDATION_FAILED,
      parsed.error.issues,
    );
  }

  const db = createDb(c.env.DB);
  const now = Date.now();
  const contractId = `hd-${crypto.randomUUID().slice(0, 8)}`;

  const newContract = {
    id: contractId,
    dn_id: parsed.data.dn_id,
    htx_id: parsed.data.htx_id,
    price_per_kg: parsed.data.price_per_kg,
    volume_kg: parsed.data.volume_kg,
    compliance_rules: JSON.stringify(parsed.data.compliance_rules),
    created_at: now,
    signed_at: parsed.data.signed_at ?? null,
  };

  await db.insert(contracts).values(newContract);

  const createdParcels = [];
  if (parsed.data.parcels && parsed.data.parcels.length > 0) {
    for (const p of parsed.data.parcels) {
      const parcelRow = {
        id: p.id || `thua-${crypto.randomUUID().slice(0, 6)}`,
        contract_id: contractId,
        area_ha: p.area_ha,
        sowing_date: p.sowing_date,
        geometry: p.geometry,
      };
      await db.insert(parcels).values(parcelRow);
      createdParcels.push(parcelRow);
    }
  }

  return c.json(
    {
      contract: {
        ...newContract,
        compliance_rules: parsed.data.compliance_rules,
        parcels: createdParcels,
      },
      message: 'Tạo hợp đồng thành công.',
    },
    201,
  );
});

// POST /api/contracts/:id/acknowledge -> HTX acknowledges contract (FR-01)
contractRoutes.post('/:id/acknowledge', async (c) => {
  const id = c.req.param('id');
  const db = createDb(c.env.DB);

  const existing = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, id))
    .get();
  if (!existing) {
    throw new AppError(404, ERROR_MESSAGES_VI.NOT_FOUND);
  }

  const signedAt = Date.now();
  await db
    .update(contracts)
    .set({ signed_at: signedAt })
    .where(eq(contracts.id, id));

  return c.json({
    id,
    signed_at: signedAt,
    message: 'Hợp tác xã đã xác nhận ký hợp đồng.',
  });
});
