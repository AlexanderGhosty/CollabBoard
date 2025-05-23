import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const base = 'rounded-2xl px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-dark-blue-300';
const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:shadow-inner active:translate-y-0.5 dark:bg-blue-700 dark:hover:bg-blue-600',
  secondary: 'bg-indigo-50 text-blue-800 hover:bg-indigo-100 border border-indigo-100 shadow-sm hover:shadow-md active:shadow-inner active:translate-y-0.5 dark:bg-dark-blue-100 dark:text-blue-300 dark:hover:bg-dark-blue-50 dark:border-dark-blue-50 dark:shadow-dark-card dark:hover:shadow-dark-card-hover',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md active:shadow-inner active:translate-y-0.5 dark:bg-red-700 dark:hover:bg-red-600',
};

export default function Button({ variant = 'primary', loading, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        base,
        variants[variant],
        className,
        loading && 'relative !text-transparent'
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="animate-spin border-2 border-current border-r-transparent h-5 w-5 rounded-full inline-block" />
        </span>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
}