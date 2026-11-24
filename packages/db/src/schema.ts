import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// FR-01: Digital Contract Creation
export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  dn_id: text('dn_id').notNull(),
  htx_id: text('htx_id').notNull(),
  price_per_kg: integer('price_per_kg').notNull(),
  volume_kg: integer('volume_kg').notNull(),
  compliance_rules: text('compliance_rules').notNull(),
  created_at: integer('created_at').notNull(),
  signed_at: integer('signed_at'),
});

// FR-01 / FR-02: Rice parcels with Cần Thơ GeoJSON boundaries
export const parcels = sqliteTable('parcels', {
  id: text('id').primaryKey(),
  contract_id: text('contract_id')
    .notNull()
    .references(() => contracts.id),
  area_ha: real('area_ha').notNull(),
  sowing_date: integer('sowing_date').notNull(),
  geometry: text('geometry').notNull(),
});

// FR-02 / FR-03: Compliance Check-in records
export const complianceRecords = sqliteTable(
  'compliance_records',
  {
    id: text('id').primaryKey(),
    parcel_id: text('parcel_id')
      .notNull()
      .references(() => parcels.id),
    milestone_type: text('milestone_type', {
      enum: ['awd_drain', 'straw_mgmt', 'harvest'],
    }).notNull(),
    photo_key: text('photo_key').notNull(),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    timestamp: integer('timestamp').notNull(),
    verified_by: text('verified_by'),
    metadata: text('metadata'),
  },
  (table) => [
    check(
      'milestone_type_check',
      sql`${table.milestone_type} IN ('awd_drain','straw_mgmt','harvest')`,
    ),
  ],
);

// FR-04: Harvest Date Estimation slots
export const harvestSlots = sqliteTable(
  'harvest_slots',
  {
    id: text('id').primaryKey(),
    parcel_id: text('parcel_id')
      .notNull()
      .references(() => parcels.id),
    estimated_date: integer('estimated_date').notNull(),
    confirmed_by_dn: text('confirmed_by_dn'),
    status: text('status', {
      enum: ['pending', 'confirmed', 'completed'],
    }),
  },
  (table) => [
    check(
      'harvest_status_check',
      sql`${table.status} IN ('pending','confirmed','completed')`,
    ),
  ],
);

// FR-05: Green Dossier Generator records
export const greenDossiers = sqliteTable('green_dossiers', {
  id: text('id').primaryKey(),
  contract_id: text('contract_id')
    .notNull()
    .references(() => contracts.id),
  parcel_ids: text('parcel_ids').notNull(),
  generated_at: integer('generated_at').notNull(),
  pdf_key: text('pdf_key').notNull(),
});

export type ContractRow = typeof contracts.$inferSelect;
export type NewContractRow = typeof contracts.$inferInsert;
export type ParcelRow = typeof parcels.$inferSelect;
export type NewParcelRow = typeof parcels.$inferInsert;
export type ComplianceRecordRow = typeof complianceRecords.$inferSelect;
export type NewComplianceRecordRow = typeof complianceRecords.$inferInsert;
export type HarvestSlotRow = typeof harvestSlots.$inferSelect;
export type NewHarvestSlotRow = typeof harvestSlots.$inferInsert;
export type GreenDossierRow = typeof greenDossiers.$inferSelect;
export type NewGreenDossierRow = typeof greenDossiers.$inferInsert;
