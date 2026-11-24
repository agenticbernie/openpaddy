'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Database, LogOut, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/dev/seed', {
        method: 'POST',
      });
      setSeedMessage(res.message);
    } catch {
      setSeedMessage('Không thể nạp dữ liệu mẫu. Kiểm tra API đang chạy.');
    } finally {
      setSeeding(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Tài khoản</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            {user?.display_name ?? 'Doanh nghiệp xuất khẩu'}
          </CardTitle>
          <CardDescription>
            Tên đăng nhập: {user?.username} · Mã DN: {user?.dn_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={handleSeed}
            disabled={seeding}
          >
            <Database className="h-5 w-5 text-emerald-700" />
            {seeding
              ? 'Đang nạp dữ liệu mẫu Cần Thơ...'
              : 'Nạp dữ liệu mẫu Cần Thơ (Demo)'}
          </Button>
          {seedMessage && (
            <p className="text-sm font-medium text-emerald-800">
              {seedMessage}
            </p>
          )}

          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
