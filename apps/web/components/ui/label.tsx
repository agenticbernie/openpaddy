import { cn } from '@/lib/utils';
import type * as React from 'react';

export function Label({
  className,
  htmlFor,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'mb-2 block text-base font-semibold leading-none text-slate-900',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
