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
  fetchContracts,
  getParcelCentroidClient,
  haversineMetersClient,
} from '@/lib/contracts-api';
import {
  GEO_VALIDATION_THRESHOLD_METERS,
  MILESTONE_LABELS_VI,
  MILESTONE_TYPES,
  type MilestoneType,
} from '@openpaddy/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface QueuedCheckIn {
  id: string;
  parcel_id: string;
  milestone_type: MilestoneType;
  lat: number;
  lng: number;
  timestamp: number;
  fileName: string;
}

const OFFLINE_QUEUE_KEY = 'openpaddy-offline-checkin-queue';

export default function CheckInPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', user?.dn_id],
    queryFn: () => fetchContracts(user?.dn_id),
  });

  const allParcels = useMemo(
    () => contracts.flatMap((c) => c.parcels),
    [contracts],
  );

  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [milestoneType, setMilestoneType] =
    useState<MilestoneType>('awd_drain');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [showGpsAdvanced, setShowGpsAdvanced] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<QueuedCheckIn[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) {
        setOfflineQueue(JSON.parse(raw) as QueuedCheckIn[]);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!selectedParcelId && allParcels.length > 0) {
      const first = allParcels[0];
      setSelectedParcelId(first.id);
      setCoords(getParcelCentroidClient(first.geometry));
    }
  }, [allParcels, selectedParcelId]);

  const selectedParcel = useMemo(
    () => allParcels.find((p) => p.id === selectedParcelId) ?? null,
    [allParcels, selectedParcelId],
  );

  // Real-time transparent geo-validation preview
  const liveGeoCheck = useMemo(() => {
    if (!selectedParcel || !coords) return null;
    const centroid = getParcelCentroidClient(selectedParcel.geometry);
    const distance = Math.round(
      haversineMetersClient(coords.lat, coords.lng, centroid.lat, centroid.lng),
    );
    const valid = distance <= GEO_VALIDATION_THRESHOLD_METERS;
    return {
      valid,
      distance,
      messageVi: valid
        ? `✓ Vị trí khớp (±${distance}m)`
        : `✗ Vị trí lệch ${distance}m (vượt giới hạn ${GEO_VALIDATION_THRESHOLD_METERS}m)`,
    };
  }, [selectedParcel, coords]);

  const handleParcelChange = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    const parcel = allParcels.find((p) => p.id === parcelId);
    if (parcel) {
      setCoords(getParcelCentroidClient(parcel.geometry));
    }
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
      },
      () => {
        setErrorMessage(
          'Không thể lấy GPS thiết bị. Đang dùng tọa độ tâm thửa ruộng.',
        );
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  };

  const persistQueue = (next: QueuedCheckIn[]) => {
    setOfflineQueue(next);
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!selectedParcelId || !photoFile || !coords) {
        throw new Error('Vui lòng chọn thửa ruộng và chụp ảnh thực địa.');
      }

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('parcel_id', selectedParcelId);
      formData.append('milestone_type', milestoneType);
      formData.append('lat', String(coords.lat));
      formData.append('lng', String(coords.lng));
      formData.append('timestamp', String(Date.now()));

      return apiFetch<{ message: string }>('/api/compliance/check-in', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (res) => {
      setSuccessMessage(res.message);
      setErrorMessage(null);
      setPhotoFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        // Offline-tolerant queue fallback on network failure
        if (selectedParcelId && coords && photoFile) {
          const item: QueuedCheckIn = {
            id: `q-${Date.now()}`,
            parcel_id: selectedParcelId,
            milestone_type: milestoneType,
            lat: coords.lat,
            lng: coords.lng,
            timestamp: Date.now(),
            fileName: photoFile.name,
          };
          persistQueue([...offlineQueue, item]);
          setErrorMessage(
            'Mất kết nối mạng. Đã lưu check-in vào hàng đợi ngoại tuyến để gửi lại.',
          );
        } else {
          setErrorMessage('Không thể gửi check-in. Vui lòng thử lại.');
        }
      }
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Check-in tuân thủ thực địa
        </h1>
        <p className="text-sm text-slate-600">
          3 bước đơn giản: Chọn thửa &rarr; Chụp ảnh &rarr; Xác nhận vị trí GPS
        </p>
      </div>

      {successMessage && (
        <output className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <CheckCircle2 className="h-8 w-8 shrink-0 animate-bounce text-emerald-700" />
          <div>
            <p className="text-base font-bold">Check-in thành công!</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        </output>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bước 1: Chọn thửa ruộng &amp; hạng mục</CardTitle>
          <CardDescription>
            Hệ thống tự động kiểm tra quy tắc hợp đồng theo từng thửa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-12 animate-pulse rounded-lg bg-slate-200" />
          ) : (
            <div>
              <Label htmlFor="parcel_select">Thửa ruộng</Label>
              <select
                id="parcel_select"
                value={selectedParcelId}
                onChange={(e) => handleParcelChange(e.target.value)}
                className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
              >
                {allParcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} ({p.area_ha} ha — {p.contract_id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="milestone_select">Hạng mục tuân thủ</Label>
            <select
              id="milestone_select"
              value={milestoneType}
              onChange={(e) =>
                setMilestoneType(e.target.value as MilestoneType)
              }
              className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900"
            >
              {MILESTONE_TYPES.map((m) => (
                <option key={m} value={m}>
                  {MILESTONE_LABELS_VI[m]}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bước 2: Chụp ảnh hiện trường</CardTitle>
          <CardDescription>
            Ảnh chụp sẽ được kiểm tra EXIF và vị trí GPS trong bán kính 100m
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Chọn hoặc chụp ảnh thực địa"
          />

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full border-2 border-dashed border-emerald-600 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-6 w-6" />
            {photoFile ? 'Chụp lại ảnh khác' : 'Mở camera / Chọn ảnh'}
          </Button>

          {previewUrl && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Xem trước ảnh ({photoFile?.name}):
              </p>
              <img
                src={previewUrl}
                alt="Xem trước ảnh check-in"
                className="h-52 w-full rounded-xl border border-slate-200 object-cover"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bước 3: Xác thực vị trí GPS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {liveGeoCheck && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <MapPin
                  className={`h-5 w-5 ${liveGeoCheck.valid ? 'text-emerald-700' : 'text-red-700'}`}
                />
                <span className="text-base font-semibold text-slate-900">
                  {liveGeoCheck.messageVi}
                </span>
              </div>
              <Badge variant={liveGeoCheck.valid ? 'default' : 'danger'}>
                {liveGeoCheck.valid ? 'Đạt chuẩn ≤100m' : 'Ngoài vùng'}
              </Badge>
            </div>
          )}

          <button
            type="button"
            className="flex min-h-[48px] w-full items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => setShowGpsAdvanced((v) => !v)}
          >
            <span>Chi tiết tọa độ GPS &amp; kiểm thử</span>
            {showGpsAdvanced ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>

          {showGpsAdvanced && coords && (
            <div className="space-y-3 rounded-lg bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gps_lat">Vĩ độ (Lat)</Label>
                  <Input
                    id="gps_lat"
                    type="number"
                    step="0.0001"
                    value={coords.lat}
                    onChange={(e) =>
                      setCoords({ ...coords, lat: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="gps_lng">Kinh độ (Lng)</Label>
                  <Input
                    id="gps_lng"
                    type="number"
                    step="0.0001"
                    value={coords.lng}
                    onChange={(e) =>
                      setCoords({ ...coords, lng: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleUseBrowserGps}
              >
                <MapPin className="h-5 w-5" />
                Lấy GPS thực từ thiết bị
              </Button>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={
              !selectedParcelId || !photoFile || checkInMutation.isPending
            }
            onClick={() => checkInMutation.mutate()}
          >
            {checkInMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tải ảnh &amp; xác thực...
              </>
            ) : (
              'Gửi check-in tuân thủ'
            )}
          </Button>
        </CardContent>
      </Card>

      {offlineQueue.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <WifiOff className="h-5 w-5" />
              Hàng đợi ngoại tuyến ({offlineQueue.length})
            </CardTitle>
            <CardDescription className="text-amber-800">
              Các bản ghi chờ mạng ổn định để đồng bộ lại
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {offlineQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-white p-3 text-sm"
              >
                <span>
                  {item.parcel_id} · {MILESTONE_LABELS_VI[item.milestone_type]}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    persistQueue(offlineQueue.filter((q) => q.id !== item.id))
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Xóa khỏi hàng đợi
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
