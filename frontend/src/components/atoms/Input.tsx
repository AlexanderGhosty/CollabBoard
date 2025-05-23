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
        'text-blue-800 dark:text-blue-300',
        error
          ? 'border-red-400 dark:border-red-500 focus:ring-red-300 dark:focus:ring-red-600 bg-red-50/30 dark:bg-red-900/20'
          : 'border-blue-100 dark:border-dark-blue-100 focus:ring-blue-300 dark:focus:ring-blue-700 hover:border-blue-200 dark:hover:border-blue-800 bg-white dark:bg-dark-blue-50',
        className
      )}
      {...rest}
    />
    {error && (
      <p className="mt-1.5 text-sm text-red-500 dark:text-red-400 pl-2 border-l-2 border-red-300 dark:border-red-600 animate-fade-in transition-colors duration-300">
        {error}
      </p>
    )}
  </div>
));
Input.displayName = 'Input';