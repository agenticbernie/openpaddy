import type {
  ComplianceRule,
  HarvestStatus,
  MilestoneType,
} from '@openpaddy/shared';
import { apiFetch } from './api';

export interface ComplianceRecordDto {
  id: string;
  parcel_id: string;
  milestone_type: MilestoneType;
  photo_key: string;
  lat: number;
  lng: number;
  timestamp: number;
  verified_by: string | null;
  metadata: string | null;
}

export interface HarvestSlotDto {
  id: string;
  parcel_id: string;
  estimated_date: number;
  confirmed_by_dn: string | null;
  status: HarvestStatus | null;
}

export interface ParcelDto {
  id: string;
  contract_id: string;
  area_ha: number;
  sowing_date: number;
  geometry: string;
  records: ComplianceRecordDto[];
  harvest_slot: HarvestSlotDto | null;
  compliant: boolean;
  violations: string[];
}

export interface ContractDto {
  id: string;
  dn_id: string;
  htx_id: string;
  price_per_kg: number;
  volume_kg: number;
  compliance_rules: ComplianceRule[];
  created_at: number;
  signed_at: number | null;
  parcels: ParcelDto[];
}

export async function fetchContracts(dnId?: string): Promise<ContractDto[]> {
  const qs = dnId ? `?dn_id=${encodeURIComponent(dnId)}` : '';
  const data = await apiFetch<{ contracts: ContractDto[] }>(
    `/api/contracts${qs}`,
  );
  return data.contracts;
}

export function getParcelCentroidClient(geometryJson: string): {
  lat: number;
  lng: number;
} {
  try {
    const parsed = JSON.parse(geometryJson) as {
      type?: string;
      coordinates?: unknown;
    };
    if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates)) {
      const ring = parsed.coordinates[0] as [number, number][];
      if (ring && ring.length > 0) {
        const pts = ring.length > 1 ? ring.slice(0, -1) : ring;
        const sum = pts.reduce(
          (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
          { lat: 0, lng: 0 },
        );
        return { lat: sum.lat / pts.length, lng: sum.lng / pts.length };
      }
    }
  } catch {
    // Fallback to Cần Thơ center
  }
  return { lat: 10.0621, lng: 105.5582 };
}

export function haversineMetersClient(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDateVi(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString('vi-VN');
}
