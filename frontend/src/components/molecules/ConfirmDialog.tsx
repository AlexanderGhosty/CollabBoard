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
      className="fixed inset-0 z-50 rounded-2xl bg-white p-6 shadow-modal backdrop:bg-black backdrop:bg-opacity-50
        modal-enter animate-modal-in border border-blue-100 max-w-md w-full"
      onClose={onCancel}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          {variant === 'danger' ? (
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
              <span className="text-xl">⚠</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <span className="text-xl">ℹ</span>
            </div>
          )}
          <h3 className="text-xl font-bold text-blue-800">{title}</h3>
        </div>

        <p className="text-blue-700 pl-2 border-l-2 border-blue-200">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="hover:!bg-white"
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
