import { describe, expect, it } from 'vitest';
import {
  GEO_VALIDATION_THRESHOLD_METERS,
  HARVEST_STATUS,
  MILESTONE_TYPES,
} from '../constants.js';
import {
  complianceCheckInSchema,
  createContractSchema,
  greenDossierSchema,
  harvestSlotSchema,
  loginSchema,
} from '../schemas.js';

describe('@openpaddy/shared schemas', () => {
  it('exposes expected domain constants', () => {
    expect(MILESTONE_TYPES).toEqual(['awd_drain', 'straw_mgmt', 'harvest']);
    expect(HARVEST_STATUS).toEqual(['pending', 'confirmed', 'completed']);
    expect(GEO_VALIDATION_THRESHOLD_METERS).toBe(100);
  });

  it('validates loginSchema accept and reject cases', () => {
    expect(
      loginSchema.safeParse({ username: 'admin', password: 'openpaddy2027' })
        .success,
    ).toBe(true);
    expect(loginSchema.safeParse({ username: '', password: '' }).success).toBe(
      false,
    );
  });

  it('validates createContractSchema accept and reject cases', () => {
    const valid = createContractSchema.safeParse({
      dn_id: 'dn-mekong-export',
      htx_id: 'htx-can-tho-01',
      price_per_kg: 8500,
      volume_kg: 50000,
      compliance_rules: [
        { milestone: 'awd_drain', min_count: 2, window_days: 45 },
        { milestone: 'straw_mgmt', min_count: 1, window_days: 15 },
      ],
    });
    expect(valid.success).toBe(true);

    const invalidEmptyRules = createContractSchema.safeParse({
      dn_id: 'dn-1',
      htx_id: 'htx-1',
      price_per_kg: -100,
      volume_kg: 0,
      compliance_rules: [],
    });
    expect(invalidEmptyRules.success).toBe(false);
  });

  it('validates complianceCheckInSchema accept and reject cases', () => {
    const valid = complianceCheckInSchema.safeParse({
      parcel_id: 'parcel-01',
      milestone_type: 'awd_drain',
      lat: 10.0452,
      lng: 105.7469,
      timestamp: 1732492800000,
    });
    expect(valid.success).toBe(true);

    const invalidLat = complianceCheckInSchema.safeParse({
      parcel_id: 'parcel-01',
      milestone_type: 'invalid_type',
      lat: 95,
      lng: 105.7469,
      timestamp: -1,
    });
    expect(invalidLat.success).toBe(false);
  });

  it('validates harvestSlotSchema accept and reject cases', () => {
    const valid = harvestSlotSchema.safeParse({
      parcel_id: 'parcel-01',
      estimated_date: 1740000000000,
      status: 'confirmed',
    });
    expect(valid.success).toBe(true);

    const invalid = harvestSlotSchema.safeParse({
      parcel_id: '',
      estimated_date: 0,
      status: 'unknown',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates greenDossierSchema accept and reject cases', () => {
    const valid = greenDossierSchema.safeParse({
      contract_id: 'contract-01',
      parcel_ids: ['parcel-01', 'parcel-02'],
    });
    expect(valid.success).toBe(true);

    const invalid = greenDossierSchema.safeParse({
      contract_id: 'contract-01',
      parcel_ids: [],
    });
    expect(invalid.success).toBe(false);
  });
});
