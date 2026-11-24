import { createContractSchema } from '@openpaddy/shared';
import { describe, expect, it } from 'vitest';
import { app } from '../index.js';
import {
  getParcelCentroid,
  haversineDistanceMeters,
  validateParcelLocation,
} from '../middleware/geo-validate.js';

const CAN_THO_POLYGON = JSON.stringify({
  type: 'Polygon',
  coordinates: [
    [
      [105.557, 10.0612],
      [105.5594, 10.0612],
      [105.5594, 10.063],
      [105.557, 10.063],
      [105.557, 10.0612],
    ],
  ],
});

describe('workers/api geo-validation and routes', () => {
  it('computes parcel centroid accurately', () => {
    const centroid = getParcelCentroid(CAN_THO_POLYGON);
    expect(centroid.lat).toBeCloseTo(10.0621, 4);
    expect(centroid.lng).toBeCloseTo(105.5582, 4);
  });

  it('validates location within 100m with Vietnamese feedback', () => {
    // ~30m offset from centroid
    const result = validateParcelLocation(10.0623, 105.5583, CAN_THO_POLYGON);
    expect(result.valid).toBe(true);
    expect(result.distanceMeters).toBeLessThanOrEqual(100);
    expect(result.messageVi).toContain('✓ Vị trí khớp');
  });

  it('rejects location beyond 100m with transparent Vietnamese message', () => {
    // ~500m away
    const result = validateParcelLocation(10.067, 105.5582, CAN_THO_POLYGON);
    expect(result.valid).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(100);
    expect(result.messageVi).toContain('✗ Vị trí lệch');
  });

  it('computes Haversine distance ~0 for identical points', () => {
    expect(haversineDistanceMeters(10.0621, 105.5582, 10.0621, 105.5582)).toBe(
      0,
    );
  });

  it('returns 401 with Vietnamese message when auth header missing', async () => {
    const res = await app.request('/api/contracts', { method: 'GET' }, {
      JWT_SECRET: 'test-secret',
    } as never);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  });

  it('issues JWT on POST /api/auth/login with mock credentials', async () => {
    const res = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'openpaddy2027',
        }),
      },
      {
        JWT_SECRET: 'test-secret',
      } as never,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      token: string;
      user: { role: string };
    };
    expect(json.token.split('.').length).toBe(3);
    expect(json.user.role).toBe('dn');
  });

  it('validates Zod contract schema integration', () => {
    const parsed = createContractSchema.safeParse({
      dn_id: 'dn-mekong-export',
      htx_id: 'htx-thoi-lai',
      price_per_kg: 8800,
      volume_kg: 50000,
      compliance_rules: [
        { milestone: 'awd_drain', min_count: 2, window_days: 45 },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});
