'use client';

import { cn } from '@/lib/utils';
import { Camera, FileText, LayoutDashboard, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/contracts', label: 'Hợp đồng', icon: FileText },
  { href: '/check-in', label: 'Check-in', icon: Camera },
  { href: '/profile', label: 'Tài khoản', icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-lg md:static md:border-t-0 md:border-b md:shadow-none"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-1 md:justify-start md:gap-4 md:px-6 md:py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[48px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors md:flex-row md:text-sm',
                active
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
