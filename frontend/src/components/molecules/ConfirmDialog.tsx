import { useEffect, useRef } from 'react';
import Button from '@/components/atoms/Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  variant = 'primary'
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen && dialog) {
      // Only call showModal if the dialog is not already open
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch (error) {
          console.error('Error opening confirm dialog:', error);
          // If showModal fails, try to reset the dialog state
          dialog.close();
          // Try again after a short delay
          setTimeout(() => {
            if (!dialog.open) {
              try {
                dialog.showModal();
              } catch (innerError) {
                console.error('Failed to open confirm dialog after retry:', innerError);
              }
            }
          }, 10);
        }
      }
    } else if (dialog) {
      dialog.close();
    }

    // Clean up function to ensure dialog is closed when component unmounts
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 rounded-2xl bg-white dark:bg-dark-blue-50 p-6 shadow-modal dark:shadow-dark-modal backdrop:bg-black backdrop:bg-opacity-50
        modal-enter animate-modal-in border border-blue-100 dark:border-dark-blue-100 max-w-md w-full transition-colors duration-300"
      onClose={onCancel}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          {variant === 'danger' ? (
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0 transition-colors duration-300">
              <span className="text-xl">⚠</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 transition-colors duration-300">
              <span className="text-xl">ℹ</span>
            </div>
          )}
          <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 transition-colors duration-300">{title}</h3>
        </div>

        <p className="text-blue-700 dark:text-blue-400 pl-2 border-l-2 border-blue-200 dark:border-blue-600 transition-colors duration-300">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="hover:!bg-white dark:hover:!bg-dark-blue-100"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
