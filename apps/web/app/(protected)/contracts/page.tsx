'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError, apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  type ContractDto,
  fetchContracts,
  formatDateVi,
} from '@/lib/contracts-api';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateContractInput,
  MILESTONE_LABELS_VI,
  MILESTONE_TYPES,
  createContractSchema,
} from '@openpaddy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  FileSignature,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

const DEFAULT_PARCEL_GEO = JSON.stringify({
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

export default function ContractsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParcelAdvanced, setShowParcelAdvanced] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ackFeedback, setAckFeedback] = useState<string | null>(null);

  const {
    data: contracts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['contracts', user?.dn_id],
    queryFn: () => fetchContracts(user?.dn_id),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues: {
      dn_id: user?.dn_id || 'dn-mekong-export',
      htx_id: 'htx-thoi-lai-can-tho',
      price_per_kg: 8800,
      volume_kg: 50000,
      compliance_rules: [
        { milestone: 'awd_drain', min_count: 2, window_days: 45 },
        { milestone: 'straw_mgmt', min_count: 1, window_days: 15 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'compliance_rules',
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateContractInput) =>
      apiFetch<{ contract: ContractDto; message: string }>('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowCreateModal(false);
      setShowParcelAdvanced(false);
      setFormError(null);
      reset();
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tạo hợp đồng. Vui lòng thử lại.',
      );
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (contractId: string) =>
      apiFetch<{ id: string; signed_at: number; message: string }>(
        `/api/contracts/${contractId}/acknowledge`,
        { method: 'POST' },
      ),
    onSuccess: (res) => {
      setAckFeedback(res.message);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const onSubmit = (values: CreateContractInput) => {
    setFormError(null);
    const payload: CreateContractInput = {
      ...values,
      parcels: showParcelAdvanced
        ? [
            {
              area_ha: 2.5,
              sowing_date: Date.now(),
              geometry: DEFAULT_PARCEL_GEO,
            },
          ]
        : undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hợp đồng bao tiêu
          </h1>
          <p className="text-sm text-slate-600">
            Quản lý điều khoản tuân thủ và xác nhận ký kết với Hợp tác xã
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreateModal(true)}>
          <FilePlus2 className="h-5 w-5" />
          Tạo hợp đồng
        </Button>
      </div>

      {ackFeedback && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          <span>{ackFeedback}</span>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-200/70"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-700" />
          <span>Không thể tải danh sách hợp đồng. Kiểm tra kết nối API.</span>
        </div>
      )}

      {!isLoading && !isError && contracts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-base text-slate-700">
              Chưa có hợp đồng nào. Nhấn <strong>Tạo hợp đồng</strong> để bắt
              đầu.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{contract.id}</CardTitle>
                  <CardDescription>
                    HTX: <strong>{contract.htx_id}</strong> · Ngày tạo:{' '}
                    {formatDateVi(contract.created_at)}
                  </CardDescription>
                </div>
                {contract.signed_at ? (
                  <Badge variant="default">
                    <CheckCircle2 className="h-4 w-4" />
                    Đã ký ({formatDateVi(contract.signed_at)})
                  </Badge>
                ) : (
                  <Badge variant="warning">Chờ HTX xác nhận</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="text-slate-600">Giá thu mua</span>
                  <p className="font-bold text-slate-900">
                    {contract.price_per_kg.toLocaleString('vi-VN')} đ/kg
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Sản lượng cam kết</span>
                  <p className="font-bold text-slate-900">
                    {(contract.volume_kg / 1000).toLocaleString('vi-VN')} tấn
                  </p>
                </div>
                <div>
                  <span className="text-slate-600">Số thửa ruộng</span>
                  <p className="font-bold text-slate-900">
                    {contract.parcels.length} thửa
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">
                  Quy tắc tuân thủ bắt buộc:
                </p>
                <div className="flex flex-wrap gap-2">
                  {contract.compliance_rules.map((rule, idx) => (
                    <Badge key={`${rule.milestone}-${idx}`} variant="neutral">
                      {MILESTONE_LABELS_VI[rule.milestone]}: {rule.min_count}{' '}
                      lần / {rule.window_days} ngày
                    </Badge>
                  ))}
                </div>
              </div>

              {!contract.signed_at && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => acknowledgeMutation.mutate(contract.id)}
                >
                  <FileSignature className="h-5 w-5 text-emerald-700" />
                  Xác nhận ký (HTX)
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="create-contract-title"
          className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center border-0 bg-slate-900/50 p-0 sm:items-center sm:p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="create-contract-title"
                className="text-xl font-bold text-slate-900"
              >
                Tạo hợp đồng bao tiêu mới
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Đóng"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <Label htmlFor="htx_id">Mã Hợp tác xã (HTX)</Label>
                <Input
                  id="htx_id"
                  placeholder="htx-thoi-lai-can-tho"
                  {...register('htx_id')}
                />
                {errors.htx_id && (
                  <p className="mt-1 text-sm text-red-700">
                    {errors.htx_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="price_per_kg">Giá thu mua (VNĐ/kg)</Label>
                  <Input
                    id="price_per_kg"
                    type="number"
                    {...register('price_per_kg', { valueAsNumber: true })}
                  />
                  {errors.price_per_kg && (
                    <p className="mt-1 text-sm text-red-700">
                      {errors.price_per_kg.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="volume_kg">Sản lượng cam kết (kg)</Label>
                  <Input
                    id="volume_kg"
                    type="number"
                    {...register('volume_kg', { valueAsNumber: true })}
                  />
                  {errors.volume_kg && (
                    <p className="mt-1 text-sm text-red-700">
                      {errors.volume_kg.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">
                    Quy tắc tuân thủ
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        milestone: 'harvest',
                        min_count: 1,
                        window_days: 10,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Thêm quy tắc
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        aria-label="Loại milestone"
                        className="min-h-[48px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
                        {...register(`compliance_rules.${index}.milestone`)}
                      >
                        {MILESTONE_TYPES.map((m) => (
                          <option key={m} value={m}>
                            {MILESTONE_LABELS_VI[m]}
                          </option>
                        ))}
                      </select>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Xóa quy tắc"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-5 w-5 text-red-700" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor={`min_count_${index}`}>Số lần</Label>
                        <Input
                          id={`min_count_${index}`}
                          type="number"
                          {...register(`compliance_rules.${index}.min_count`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`window_days_${index}`}>
                          Khung ngày
                        </Label>
                        <Input
                          id={`window_days_${index}`}
                          type="number"
                          {...register(
                            `compliance_rules.${index}.window_days`,
                            { valueAsNumber: true },
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="flex min-h-[48px] w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowParcelAdvanced((v) => !v)}
              >
                <span>Tùy chọn nâng cao: Tạo kèm thửa ruộng mẫu Cần Thơ</span>
                {showParcelAdvanced ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>

              {showParcelAdvanced && (
                <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                  Sẽ tự động gắn 1 thửa ruộng mẫu (2.5 ha tại Thới Lai, Cần Thơ)
                  vào hợp đồng này để test check-in ngay.
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang lưu hợp đồng...
                  </>
                ) : (
                  'Lưu & phát hành hợp đồng'
                )}
              </Button>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}
