import { z } from 'zod';
import { HARVEST_STATUS, MILESTONE_TYPES } from './constants.js';

// FR-00: Auth login schema
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

// FR-01: Digital Contract Creation rules & parcels
export const complianceRuleSchema = z.object({
  milestone: z.enum(MILESTONE_TYPES),
  min_count: z.number().int().min(1, 'Số lần tối thiểu phải >= 1'),
  window_days: z.number().int().min(1, 'Khung ngày phải >= 1'),
});

export const createParcelInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  area_ha: z.number().positive('Diện tích phải lớn hơn 0'),
  sowing_date: z.number().int().positive('Ngày gieo sạ không hợp lệ'),
  geometry: z.string().min(2, 'Thiếu tọa độ GeoJSON thửa ruộng'),
});

export const createContractSchema = z.object({
  dn_id: z.string().trim().min(1, 'Thiếu mã doanh nghiệp'),
  htx_id: z.string().trim().min(1, 'Thiếu mã hợp tác xã'),
  price_per_kg: z.number().int().positive('Giá thu mua phải lớn hơn 0'),
  volume_kg: z.number().int().positive('Sản lượng cam kết phải lớn hơn 0'),
  compliance_rules: z
    .array(complianceRuleSchema)
    .min(1, 'Cần ít nhất 1 quy tắc tuân thủ'),
  signed_at: z.number().int().positive().nullable().optional(),
  parcels: z.array(createParcelInputSchema).optional(),
});

// FR-02: Compliance Check-in
export const complianceCheckInSchema = z.object({
  parcel_id: z.string().trim().min(1, 'Vui lòng chọn thửa ruộng'),
  milestone_type: z.enum(MILESTONE_TYPES),
  lat: z.coerce
    .number()
    .min(-90, 'Vĩ độ không hợp lệ')
    .max(90, 'Vĩ độ không hợp lệ'),
  lng: z.coerce
    .number()
    .min(-180, 'Kinh độ không hợp lệ')
    .max(180, 'Kinh độ không hợp lệ'),
  timestamp: z.coerce.number().int().positive('Thời gian chụp không hợp lệ'),
  verified_by: z.string().trim().optional(),
  metadata: z.string().optional(),
});

// FR-04: Harvest Date Estimation / Slot
export const harvestSlotSchema = z.object({
  parcel_id: z.string().trim().min(1, 'Thiếu mã thửa ruộng'),
  estimated_date: z.number().int().positive('Ngày dự kiến không hợp lệ'),
  confirmed_by_dn: z.string().trim().nullable().optional(),
  status: z.enum(HARVEST_STATUS).default('pending'),
});

// FR-05: Green Dossier Generator
export const greenDossierSchema = z.object({
  contract_id: z.string().trim().min(1, 'Thiếu mã hợp đồng'),
  parcel_ids: z
    .array(z.string().trim().min(1))
    .min(1, 'Vui lòng chọn ít nhất 1 thửa ruộng đạt chuẩn'),
});
