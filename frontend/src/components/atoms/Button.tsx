import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

const base = 'rounded-2xl px-4 py-2 font-medium transition-colors disabled:opacity-50';
const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-indigo-50 text-blue-800 hover:bg-indigo-100 border border-indigo-100 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

export default function Button({ variant = 'primary', loading, className, children, ...rest }: ButtonProps) {
  return (
    <button className={clsx(base, variants[variant], className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="mr-2 animate-spin border-2 border-current border-r-transparent h-4 w-4 rounded-full inline-block" />}
      {children}
    </button>
  );
}