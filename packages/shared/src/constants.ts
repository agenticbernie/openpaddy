// FR-02, NFR: Shared domain constants and geo-validation thresholds

export const MILESTONE_TYPES = ['awd_drain', 'straw_mgmt', 'harvest'] as const;

export const MILESTONE_LABELS_VI: Record<
  (typeof MILESTONE_TYPES)[number],
  string
> = {
  awd_drain: 'Rút nước khô xen kẽ (AWD)',
  straw_mgmt: 'Xử lý rơm rạ sau thu hoạch',
  harvest: 'Thu hoạch đúng độ chín',
};

export const HARVEST_STATUS = ['pending', 'confirmed', 'completed'] as const;

export const HARVEST_STATUS_LABELS_VI: Record<
  (typeof HARVEST_STATUS)[number],
  string
> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Đã thu hoạch',
};

// NFR: Server validates GPS within 100m of parcel centroid
export const GEO_VALIDATION_THRESHOLD_METERS = 100;

// NFR: All user-facing error messages in plain Vietnamese
export const ERROR_MESSAGES_VI = {
  UNAUTHORIZED: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
  GEO_MISMATCH:
    'Vị trí chụp ảnh không khớp thửa ruộng. Vui lòng chụp lại tại đúng vị trí.',
  DUPLICATE_MILESTONE:
    'Milestone này đã được ghi nhận. Liên hệ cán bộ nếu cần chỉnh sửa.',
  R2_UPLOAD_FAILED: 'Không thể tải ảnh lên. Kiểm tra kết nối mạng và thử lại.',
  D1_TIMEOUT: 'Hệ thống đang xử lý chậm. Vui lòng thử lại sau 30 giây.',
  VALIDATION_FAILED: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
} as const;
