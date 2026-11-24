import type { z } from 'zod';
import type { HARVEST_STATUS, MILESTONE_TYPES } from './constants.js';
import type {
  complianceCheckInSchema,
  complianceRuleSchema,
  createContractSchema,
  createParcelInputSchema,
  greenDossierSchema,
  harvestSlotSchema,
  loginSchema,
} from './schemas.js';

export type MilestoneType = (typeof MILESTONE_TYPES)[number];
export type HarvestStatus = (typeof HARVEST_STATUS)[number];

export type LoginInput = z.infer<typeof loginSchema>;
export type ComplianceRule = z.infer<typeof complianceRuleSchema>;
export type CreateParcelInput = z.infer<typeof createParcelInputSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type ComplianceCheckInInput = z.infer<typeof complianceCheckInSchema>;
export type HarvestSlotInput = z.infer<typeof harvestSlotSchema>;
export type GreenDossierInput = z.infer<typeof greenDossierSchema>;

export interface GeoValidationResult {
  valid: boolean;
  distanceMeters: number;
  thresholdMeters: number;
  messageVi: string;
}

export interface HarvestEstimateResponse {
  parcel_id: string;
  sowing_date: number;
  variety_days: number;
  compliance_delay_days: number;
  estimated_date: number;
  status: HarvestStatus;
  confirmed_by_dn: string | null;
}
