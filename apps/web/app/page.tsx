'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(token ? '/dashboard' : '/login');
  }, [hydrated, token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <p className="text-base font-medium text-slate-600">
        Đang tải OpenPaddy...
      </p>
    </div>
  );
}
