import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(({ error, className, ...rest }, ref) => (
  <div className="w-full">
    <input
      ref={ref}
      className={clsx('w-full rounded-2xl border px-3 py-2 outline-none focus:ring-2', error ? 'border-red-400 focus:ring-red-300' : 'border-zinc-300 focus:ring-blue-300', className)}
      {...rest}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';