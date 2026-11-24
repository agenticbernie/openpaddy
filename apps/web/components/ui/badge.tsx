import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
        warning: 'bg-amber-100 text-amber-900 border border-amber-300',
        danger: 'bg-red-100 text-red-900 border border-red-300',
        neutral: 'bg-slate-100 text-slate-800 border border-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
