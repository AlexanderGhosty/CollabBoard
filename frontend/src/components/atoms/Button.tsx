import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const base = 'rounded-2xl px-4 py-2 font-medium transition-all duration-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1';
const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:shadow-inner active:translate-y-0.5',
  secondary: 'bg-indigo-50 text-blue-800 hover:bg-indigo-100 border border-indigo-100 shadow-sm hover:shadow-md active:shadow-inner active:translate-y-0.5',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md active:shadow-inner active:translate-y-0.5',
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