import { cn } from '@/lib/utils';
import type * as React from 'react';

export function Input({
  className,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
