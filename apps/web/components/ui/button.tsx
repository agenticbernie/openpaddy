import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:pointer-events-none disabled:opacity-50 min-h-[48px] px-4 py-2 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-emerald-700 text-white hover:bg-emerald-800',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
        outline:
          'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
        secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
        ghost: 'text-slate-900 hover:bg-slate-100',
      },
      size: {
        default: 'min-h-[48px] px-4 py-2',
        lg: 'min-h-[56px] px-6 text-lg',
        icon: 'min-h-[48px] min-w-[48px] p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
