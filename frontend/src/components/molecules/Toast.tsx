import { useEffect, useState } from 'react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const typeClasses = {
  success: 'bg-gradient-to-r from-blue-50 to-green-50 dark:from-dark-blue-50 dark:to-green-900/30 border-l-green-500 dark:border-l-green-400 text-green-800 dark:text-green-300 shadow-[0_0_15px_rgba(0,200,0,0.15)] dark:shadow-[0_0_15px_rgba(0,200,0,0.25)]',
  error: 'bg-gradient-to-r from-blue-50 to-red-50 dark:from-dark-blue-50 dark:to-red-900/30 border-l-red-500 dark:border-l-red-400 text-red-800 dark:text-red-300 shadow-[0_0_15px_rgba(200,0,0,0.15)] dark:shadow-[0_0_15px_rgba(200,0,0,0.25)]',
  warning: 'bg-gradient-to-r from-blue-50 to-yellow-50 dark:from-dark-blue-50 dark:to-yellow-900/30 border-l-yellow-500 dark:border-l-yellow-400 text-yellow-800 dark:text-yellow-300 shadow-[0_0_15px_rgba(200,150,0,0.15)] dark:shadow-[0_0_15px_rgba(200,150,0,0.25)]',
  info: 'bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-dark-blue-50 dark:to-indigo-900/30 border-l-blue-600 dark:border-l-blue-400 text-blue-800 dark:text-blue-300 shadow-[0_0_15px_rgba(0,100,200,0.15)] dark:shadow-[0_0_15px_rgba(0,100,200,0.25)]'
};

const typeIconContainers = {
  success: 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/50 text-green-600 dark:text-green-400',
  error: 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/50 dark:to-red-800/50 text-red-600 dark:text-red-400',
  warning: 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/50 dark:to-yellow-800/50 text-yellow-600 dark:text-yellow-400',
  info: 'bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-800/50 text-blue-600 dark:text-blue-400'
};

const typeIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

export default function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300); // Start exit animation before actual removal

    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        'fixed right-4 max-w-sm border-l-4 rounded-xl shadow-lg dark:shadow-dark-modal p-4 mb-4 transition-all duration-300 backdrop-blur-sm',
        typeClasses[type],
        isExiting
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100'
      )}
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-start gap-3">
        <div className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300',
          typeIconContainers[type]
        )}>
          {typeIcons[type]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium transition-colors duration-300">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-blue-400 dark:text-blue-300
            hover:text-blue-600 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/50 
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}
