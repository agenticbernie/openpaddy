'use client';

import {
  ParcelMap,
  type ParcelMapHandle,
  type ParcelVisualStatus,
} from '@/components/parcel-map';
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
import { ApiClientError, apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  type ContractDto,
  type ParcelDto,
  fetchContracts,
  formatDateVi,
} from '@/lib/contracts-api';
import { generateGreenDossierPdf } from '@/lib/pdf-generator';
import { HARVEST_STATUS_LABELS_VI } from '@openpaddy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  Loader2,
  RefreshCw,
  Satellite,
  Share2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const DAY_MS = 86_400_000;
const AUTO_REFRESH_MS = 30_000;

function getParcelVisualStatus(parcel: ParcelDto): ParcelVisualStatus {
  if (!parcel.compliant) return 'non_compliant';
  if (parcel.harvest_slot?.status === 'completed') return 'ready';
  const estDate =
    parcel.harvest_slot?.estimated_date ?? parcel.sowing_date + 95 * DAY_MS;
  if (estDate - Date.now() <= 7 * DAY_MS) return 'ready';
  return 'ripening';
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const mapRef = useRef<ParcelMapHandle | null>(null);

  const [contractFilter, setContractFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ParcelVisualStatus>(
    'all',
  );
  const [editingParcelId, setEditingParcelId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [dossierResult, setDossierResult] = useState<{
    id: string;
    presignedUrl: string;
  } | null>(null);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const {
    data: contracts = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['contracts', user?.dn_id],
    queryFn: () => fetchContracts(user?.dn_id),
  });

  // Should-Have: 30-second auto-refresh via setInterval (no WebSockets)
  useEffect(() => {
    const timer = setInterval(() => {
      void refetch();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refetch]);

  const enrichedParcels = useMemo(() => {
    return contracts.flatMap((contract) =>
      contract.parcels.map((parcel) => ({
        parcel,
        contract,
        visualStatus: getParcelVisualStatus(parcel),
      })),
    );
  }, [contracts]);

  const filteredItems = useMemo(() => {
    return enrichedParcels.filter((item) => {
      if (contractFilter !== 'all' && item.contract.id !== contractFilter) {
        return false;
      }
      if (statusFilter !== 'all' && item.visualStatus !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [enrichedParcels, contractFilter, statusFilter]);

  const counts = useMemo(() => {
    let nonCompliant = 0;
    let ripening = 0;
    let ready = 0;
    for (const item of enrichedParcels) {
      if (item.visualStatus === 'non_compliant') nonCompliant += 1;
      else if (item.visualStatus === 'ripening') ripening += 1;
      else ready += 1;
    }
    return { nonCompliant, ripening, ready };
  }, [enrichedParcels]);

  const compliantItems = useMemo(
    () => filteredItems.filter((item) => item.parcel.compliant),
    [filteredItems],
  );

  const updateHarvestMutation = useMutation({
    mutationFn: ({
      parcelId,
      estimatedDateMs,
    }: {
      parcelId: string;
      estimatedDateMs: number;
    }) =>
      apiFetch(`/api/parcels/${parcelId}/harvest-estimate`, {
        method: 'PATCH',
        body: JSON.stringify({
          parcel_id: parcelId,
          estimated_date: estimatedDateMs,
          status: 'confirmed',
        }),
      }),
    onSuccess: () => {
      setEditingParcelId(null);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const handleGenerateDossier = async () => {
    if (compliantItems.length === 0) {
      setDossierError(
        'Chưa có thửa ruộng đạt chuẩn tuân thủ để tạo Green Dossier.',
      );
      return;
    }

    setGeneratingPdf(true);
    setDossierError(null);

    try {
      // Group by first compliant contract for PoC batch action
      const primaryContract: ContractDto = compliantItems[0].contract;
      const targetParcels = compliantItems
        .filter((i) => i.contract.id === primaryContract.id)
        .map((i) => i.parcel);

      const apiRes = await apiFetch<{
        dossier: { id: string };
        presigned_url: string;
      }>('/api/dossiers/generate', {
        method: 'POST',
        body: JSON.stringify({
          contract_id: primaryContract.id,
          parcel_ids: targetParcels.map((p) => p.id),
        }),
      });

      const mapSnapshot = mapRef.current?.captureSnapshot() ?? null;

      const blob = await generateGreenDossierPdf({
        dossierId: apiRes.dossier.id,
        contract: primaryContract,
        parcels: targetParcels,
        presignedUrl: apiRes.presigned_url,
        mapSnapshotDataUrl: mapSnapshot,
      });

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `OpenPaddy-Dossier-${apiRes.dossier.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      setDossierResult({
        id: apiRes.dossier.id,
        presignedUrl: apiRes.presigned_url,
      });
    } catch (err) {
      setDossierError(
        err instanceof ApiClientError
          ? err.message
          : 'Không thể tạo Green Dossier. Vui lòng thử lại.',
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tổng quan thu hoạch &amp; tuân thủ
          </h1>
          <p className="text-sm text-slate-600">
            Tự động cập nhật mỗi 30 giây · Đồng bằng sông Cửu Long
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`}
            />
            Làm mới
          </Button>
          <Button
            type="button"
            disabled={generatingPdf || compliantItems.length === 0}
            onClick={() => void handleGenerateDossier()}
          >
            {generatingPdf ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang xuất PDF...
              </>
            ) : (
              <>
                <FileCheck2 className="h-5 w-5" />
                Tạo dossier ({compliantItems.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {dossierError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-700" />
          <span>{dossierError}</span>
        </div>
      )}

      {dossierResult && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Download className="h-5 w-5" />
              Đã tạo &amp; tải xuống Green Dossier ({dossierResult.id})
            </CardTitle>
            <CardDescription className="text-emerald-800">
              Liên kết chia sẻ có hiệu lực trong 24 giờ (Presigned R2 URL):
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-xs break-all text-slate-800">
              <Share2 className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>{dossierResult.presignedUrl}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Color-coded status summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-slate-600">
                Chưa tuân thủ
              </p>
              <p className="text-2xl font-bold text-red-700">
                {counts.nonCompliant} thửa
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-slate-600">Sắp chín</p>
              <p className="text-2xl font-bold text-amber-700">
                {counts.ripening} thửa
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-600" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-700">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-semibold text-slate-600">
                Sẵn sàng thu hoạch
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {counts.ready} thửa
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-700" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select
          aria-label="Lọc theo hợp đồng"
          value={contractFilter}
          onChange={(e) => setContractFilter(e.target.value)}
          className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
        >
          <option value="all">Tất cả hợp đồng ({contracts.length})</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} — {c.htx_id}
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo trạng thái"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as 'all' | ParcelVisualStatus)
          }
          className="min-h-[48px] rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="non_compliant">Chưa tuân thủ</option>
          <option value="ripening">Sắp chín</option>
          <option value="ready">Sẵn sàng thu hoạch</option>
        </select>
      </div>

      {/* MapLibre parcel polygons */}
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
      ) : (
        <ParcelMap
          ref={mapRef}
          parcels={filteredItems.map((i) => ({
            id: i.parcel.id,
            geometry: i.parcel.geometry,
            area_ha: i.parcel.area_ha,
            status: i.visualStatus,
          }))}
        />
      )}

      {/* Parcel list with Auto-validation alerts & Harvest Date Estimation */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(({ parcel, contract, visualStatus }) => {
            const estimatedMs =
              parcel.harvest_slot?.estimated_date ??
              parcel.sowing_date + 95 * DAY_MS;

            return (
              <Card key={parcel.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>
                        Thửa {parcel.id} ({parcel.area_ha} ha)
                      </CardTitle>
                      <CardDescription>
                        Hợp đồng: {contract.id} · Gieo sạ:{' '}
                        {formatDateVi(parcel.sowing_date)}
                      </CardDescription>
                    </div>
                    {visualStatus === 'ready' ? (
                      <Badge variant="default">Sẵn sàng</Badge>
                    ) : visualStatus === 'ripening' ? (
                      <Badge variant="warning">Sắp chín</Badge>
                    ) : (
                      <Badge variant="danger">Chưa tuân thủ</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parcel.violations.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                      <strong>Cảnh báo tuân thủ:</strong>{' '}
                      {parcel.violations.join(' · ')}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarCheck className="h-5 w-5 text-emerald-700" />
                      <span>
                        Dự kiến thu hoạch:{' '}
                        <strong>{formatDateVi(estimatedMs)}</strong> (
                        {
                          HARVEST_STATUS_LABELS_VI[
                            parcel.harvest_slot?.status ?? 'pending'
                          ]
                        }
                        )
                      </span>
                    </div>

                    {editingParcelId === parcel.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="date"
                          aria-label="Chọn ngày thu hoạch dự kiến"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="w-auto"
                        />
                        <Button
                          type="button"
                          disabled={updateHarvestMutation.isPending}
                          onClick={() => {
                            const ts = new Date(editDateValue).getTime();
                            if (!Number.isNaN(ts)) {
                              updateHarvestMutation.mutate({
                                parcelId: parcel.id,
                                estimatedDateMs: ts,
                              });
                            }
                          }}
                        >
                          Lưu
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingParcelId(parcel.id);
                          setEditDateValue(
                            new Date(estimatedMs).toISOString().slice(0, 10),
                          );
                        }}
                      >
                        Điều chỉnh ngày
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* WON'T HAVE: Satellite/AI verification placeholder */}
      <Card className="border-dashed border-slate-300 bg-slate-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Satellite className="h-5 w-5" />
              Giám sát vệ tinh &amp; AI tự động
            </CardTitle>
            <Badge variant="neutral">Coming Soon</Badge>
          </div>
          <CardDescription>
            Tính năng đối soát ảnh vệ tinh Sentinel-2 và AI phát hiện ngập/khô
            sẽ được tích hợp ở giai đoạn tiếp theo sau PoC.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
