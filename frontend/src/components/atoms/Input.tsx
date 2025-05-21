import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(({ error, className, ...rest }, ref) => (
  <div className="w-full">
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-2xl border px-4 py-2.5 outline-none focus:ring-2 transition-all duration-200',
        error
          ? 'border-red-400 focus:ring-red-300 bg-red-50/30'
          : 'border-blue-100 focus:ring-blue-300 hover:border-blue-200 bg-white',
        className
      )}
      {...rest}
    />
    {error && (
      <p className="mt-1.5 text-sm text-red-500 pl-2 border-l-2 border-red-300 animate-fade-in">
        {error}
      </p>
    )}
  </div>
));
Input.displayName = 'Input';