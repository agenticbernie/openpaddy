import type { OpenPaddyDb } from './connection.js';
import {
  complianceRecords,
  contracts,
  harvestSlots,
  parcels,
} from './schema.js';

// Helper to build a GeoJSON Polygon around a Cần Thơ coordinate
function makeCanThoPolygon(centerLng: number, centerLat: number): string {
  const dLng = 0.0012;
  const dLat = 0.0009;
  return JSON.stringify({
    type: 'Polygon',
    coordinates: [
      [
        [centerLng - dLng, centerLat - dLat],
        [centerLng + dLng, centerLat - dLat],
        [centerLng + dLng, centerLat + dLat],
        [centerLng - dLng, centerLat + dLat],
        [centerLng - dLng, centerLat - dLat],
      ],
    ],
  });
}

const DAY_MS = 86_400_000;
const BASE_TIME = 1761955200000; // 2025-11-01T00:00:00Z

export const SEED_CONTRACTS = [
  {
    id: 'hd-mekong-2026-01',
    dn_id: 'dn-mekong-export',
    htx_id: 'htx-thoi-lai-can-tho',
    price_per_kg: 8800,
    volume_kg: 120000,
    compliance_rules: JSON.stringify([
      { milestone: 'awd_drain', min_count: 2, window_days: 45 },
      { milestone: 'straw_mgmt', min_count: 1, window_days: 15 },
      { milestone: 'harvest', min_count: 1, window_days: 10 },
    ]),
    created_at: BASE_TIME,
    signed_at: BASE_TIME + DAY_MS,
  },
  {
    id: 'hd-loc-troi-2026-02',
    dn_id: 'dn-mekong-export',
    htx_id: 'htx-co-do-can-tho',
    price_per_kg: 9200,
    volume_kg: 85000,
    compliance_rules: JSON.stringify([
      { milestone: 'awd_drain', min_count: 2, window_days: 45 },
      { milestone: 'straw_mgmt', min_count: 1, window_days: 15 },
    ]),
    created_at: BASE_TIME + 5 * DAY_MS,
    signed_at: BASE_TIME + 6 * DAY_MS,
  },
];

export const SEED_PARCELS = [
  {
    id: 'thua-tl-01',
    contract_id: 'hd-mekong-2026-01',
    area_ha: 2.4,
    sowing_date: BASE_TIME + 2 * DAY_MS,
    geometry: makeCanThoPolygon(105.5582, 10.0621), // Thới Lai, Cần Thơ
  },
  {
    id: 'thua-tl-02',
    contract_id: 'hd-mekong-2026-01',
    area_ha: 3.1,
    sowing_date: BASE_TIME + 3 * DAY_MS,
    geometry: makeCanThoPolygon(105.5625, 10.0648),
  },
  {
    id: 'thua-tl-03',
    contract_id: 'hd-mekong-2026-01',
    area_ha: 1.8,
    sowing_date: BASE_TIME + 4 * DAY_MS,
    geometry: makeCanThoPolygon(105.554, 10.0592),
  },
  {
    id: 'thua-cd-01',
    contract_id: 'hd-loc-troi-2026-02',
    area_ha: 4.0,
    sowing_date: BASE_TIME + 7 * DAY_MS,
    geometry: makeCanThoPolygon(105.4265, 10.0954), // Cờ Đỏ, Cần Thơ
  },
  {
    id: 'thua-cd-02',
    contract_id: 'hd-loc-troi-2026-02',
    area_ha: 2.7,
    sowing_date: BASE_TIME + 8 * DAY_MS,
    geometry: makeCanThoPolygon(105.431, 10.0981),
  },
];

export const SEED_COMPLIANCE_RECORDS = [
  {
    id: 'rec-01',
    parcel_id: 'thua-tl-01',
    milestone_type: 'awd_drain' as const,
    photo_key: 'demo/thua-tl-01-awd-1.jpg',
    lat: 10.0621,
    lng: 105.5582,
    timestamp: BASE_TIME + 20 * DAY_MS,
    verified_by: 'Cán bộ HTX Nguyễn Văn An',
    metadata: JSON.stringify({ distanceMeters: 12, exifValid: true }),
  },
  {
    id: 'rec-02',
    parcel_id: 'thua-tl-01',
    milestone_type: 'awd_drain' as const,
    photo_key: 'demo/thua-tl-01-awd-2.jpg',
    lat: 10.0622,
    lng: 105.5583,
    timestamp: BASE_TIME + 38 * DAY_MS,
    verified_by: 'Cán bộ HTX Nguyễn Văn An',
    metadata: JSON.stringify({ distanceMeters: 18, exifValid: true }),
  },
  {
    id: 'rec-03',
    parcel_id: 'thua-tl-01',
    milestone_type: 'straw_mgmt' as const,
    photo_key: 'demo/thua-tl-01-straw.jpg',
    lat: 10.0621,
    lng: 105.5581,
    timestamp: BASE_TIME + 55 * DAY_MS,
    verified_by: 'Cán bộ HTX Nguyễn Văn An',
    metadata: JSON.stringify({ distanceMeters: 11, exifValid: true }),
  },
  {
    id: 'rec-04',
    parcel_id: 'thua-tl-01',
    milestone_type: 'harvest' as const,
    photo_key: 'demo/thua-tl-01-harvest.jpg',
    lat: 10.062,
    lng: 105.5582,
    timestamp: BASE_TIME + 95 * DAY_MS,
    verified_by: 'Cán bộ HTX Nguyễn Văn An',
    metadata: JSON.stringify({ distanceMeters: 14, exifValid: true }),
  },
  {
    id: 'rec-05',
    parcel_id: 'thua-tl-02',
    milestone_type: 'awd_drain' as const,
    photo_key: 'demo/thua-tl-02-awd-1.jpg',
    lat: 10.0648,
    lng: 105.5625,
    timestamp: BASE_TIME + 22 * DAY_MS,
    verified_by: 'Cán bộ HTX Trần Thị Bích',
    metadata: JSON.stringify({ distanceMeters: 9, exifValid: true }),
  },
  {
    id: 'rec-06',
    parcel_id: 'thua-tl-02',
    milestone_type: 'awd_drain' as const,
    photo_key: 'demo/thua-tl-02-awd-2.jpg',
    lat: 10.0649,
    lng: 105.5624,
    timestamp: BASE_TIME + 40 * DAY_MS,
    verified_by: 'Cán bộ HTX Trần Thị Bích',
    metadata: JSON.stringify({ distanceMeters: 16, exifValid: true }),
  },
  {
    id: 'rec-07',
    parcel_id: 'thua-tl-02',
    milestone_type: 'straw_mgmt' as const,
    photo_key: 'demo/thua-tl-02-straw.jpg',
    lat: 10.0647,
    lng: 105.5625,
    timestamp: BASE_TIME + 60 * DAY_MS,
    verified_by: 'Cán bộ HTX Trần Thị Bích',
    metadata: JSON.stringify({ distanceMeters: 15, exifValid: true }),
  },
  {
    id: 'rec-08',
    parcel_id: 'thua-tl-03',
    milestone_type: 'awd_drain' as const,
    photo_key: 'demo/thua-tl-03-awd-1.jpg',
    lat: 10.0592,
    lng: 105.554,
    timestamp: BASE_TIME + 25 * DAY_MS,
    verified_by: 'Cán bộ HTX Nguyễn Văn An',
    metadata: JSON.stringify({ distanceMeters: 22, exifValid: true }),
  },
  {
    id: 'rec-09',
    parcel_id: 'thua-cd-01',
    milestone_type: 'awd_drain' as const,
    photo_key: 'demo/thua-cd-01-awd-1.jpg',
    lat: 10.0954,
    lng: 105.4265,
    timestamp: BASE_TIME + 27 * DAY_MS,
    verified_by: 'Cán bộ HTX Lê Minh Tâm',
    metadata: JSON.stringify({ distanceMeters: 19, exifValid: true }),
  },
  {
    id: 'rec-10',
    parcel_id: 'thua-cd-02',
    milestone_type: 'straw_mgmt' as const,
    photo_key: 'demo/thua-cd-02-straw.jpg',
    lat: 10.0981,
    lng: 105.431,
    timestamp: BASE_TIME + 30 * DAY_MS,
    verified_by: 'Cán bộ HTX Lê Minh Tâm',
    metadata: JSON.stringify({ distanceMeters: 24, exifValid: true }),
  },
];

export const SEED_HARVEST_SLOTS = [
  {
    id: 'slot-01',
    parcel_id: 'thua-tl-01',
    estimated_date: BASE_TIME + 97 * DAY_MS,
    confirmed_by_dn: 'dn-mekong-export',
    status: 'completed' as const,
  },
  {
    id: 'slot-02',
    parcel_id: 'thua-tl-02',
    estimated_date: BASE_TIME + 98 * DAY_MS,
    confirmed_by_dn: 'dn-mekong-export',
    status: 'confirmed' as const,
  },
  {
    id: 'slot-03',
    parcel_id: 'thua-cd-01',
    estimated_date: BASE_TIME + 104 * DAY_MS,
    confirmed_by_dn: null,
    status: 'pending' as const,
  },
];

export async function seedDatabase(db: OpenPaddyDb): Promise<void> {
  for (const contract of SEED_CONTRACTS) {
    await db.insert(contracts).values(contract).onConflictDoNothing();
  }
  for (const parcel of SEED_PARCELS) {
    await db.insert(parcels).values(parcel).onConflictDoNothing();
  }
  for (const record of SEED_COMPLIANCE_RECORDS) {
    await db.insert(complianceRecords).values(record).onConflictDoNothing();
  }
  for (const slot of SEED_HARVEST_SLOTS) {
    await db.insert(harvestSlots).values(slot).onConflictDoNothing();
  }
}
