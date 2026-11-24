'use client';

import { BottomNav } from '@/components/bottom-nav';
import { useAuthStore } from '@/lib/auth-store';
import { Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token, user, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-base font-medium text-slate-600">
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">
                OpenPaddy
              </span>
              <span className="ml-2 hidden rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900 sm:inline">
                PoC 2027
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-slate-700">
            <span className="font-semibold">{user?.display_name}</span>
          </div>
        </div>
        <BottomNav />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 md:px-6">{children}</main>
    </div>
  );
}
