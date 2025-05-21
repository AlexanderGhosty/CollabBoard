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
  success: 'bg-green-50 border-l-green-500 text-green-800 shadow-[0_0_15px_rgba(0,200,0,0.15)]',
  error: 'bg-red-50 border-l-red-500 text-red-800 shadow-[0_0_15px_rgba(200,0,0,0.15)]',
  warning: 'bg-yellow-50 border-l-yellow-500 text-yellow-800 shadow-[0_0_15px_rgba(200,150,0,0.15)]',
  info: 'bg-blue-50 border-l-blue-500 text-blue-800 shadow-[0_0_15px_rgba(0,100,200,0.15)]'
};

const typeIconContainers = {
  success: 'bg-green-100 text-green-600',
  error: 'bg-red-100 text-red-600',
  warning: 'bg-yellow-100 text-yellow-600',
  info: 'bg-blue-100 text-blue-600'
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
        'fixed right-4 max-w-sm border-l-4 rounded-xl shadow-lg p-4 mb-4 transition-all duration-300 backdrop-blur-sm',
        typeClasses[type],
        isExiting
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100'
      )}
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-start gap-3">
        <div className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          typeIconContainers[type]
        )}>
          {typeIcons[type]}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={handleClose}
          className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-400
            hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
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
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
