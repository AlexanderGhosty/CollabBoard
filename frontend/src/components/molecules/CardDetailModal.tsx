import { useState, useEffect, useRef } from 'react';
import { Card } from '@/services/boardService';
import Button from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useBoardStore } from '@/store/useBoardStore';

interface CardDetailModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
}

export default function CardDetailModal({ card, isOpen, onClose }: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const updateCard = useBoardStore(state => state.updateCard);

  // Reset form when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
  }, [card]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen && dialog) {
      // Only call showModal if the dialog is not already open
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch (error) {
          console.error('Error opening dialog:', error);
          // If showModal fails, try to reset the dialog state
          dialog.close();
          // Try again after a short delay
          setTimeout(() => {
            if (!dialog.open) {
              try {
                dialog.showModal();
              } catch (innerError) {
                console.error('Failed to open dialog after retry:', innerError);
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

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await updateCard(card.id, {
        title: title.trim(),
        description: description.trim()
      });
      onClose();
    } catch (error) {
      console.error('Error updating card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form and close modal
    setTitle(card.title);
    setDescription(card.description || '');
    onClose();
  };

  // Close when clicking outside
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialogDimensions = dialogRef.current?.getBoundingClientRect();
    if (
      dialogDimensions &&
      (e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom)
    ) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 rounded-2xl bg-white p-6 shadow-modal backdrop:bg-black backdrop:bg-opacity-60
        w-full max-w-md modal-enter animate-modal-in border border-blue-100 backdrop-blur"
      onClose={handleCancel}
      onClick={handleDialogClick}
    >
      <div className="flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-blue-800">Редактирование карточки</h3>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600
              hover:bg-blue-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="card-title" className="text-sm font-medium text-blue-700">
            Заголовок
          </label>
          <Input
            id="card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введите заголовок"
            className="focus:border-blue-300 transition-all duration-200 hover:border-blue-200"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="card-description" className="text-sm font-medium text-blue-700">
            Описание
          </label>
          <textarea
            id="card-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Введите описание"
            className="w-full rounded-2xl border border-blue-100 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-300
              min-h-[120px] text-blue-800 resize-none transition-all duration-200 hover:border-blue-200"
          />
        </div>

        <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-blue-50">
          <Button variant="secondary" onClick={handleCancel} className="hover:!bg-white">
            Отмена
          </Button>
          <Button variant="primary" onClick={handleSave} loading={loading}>
            Сохранить
          </Button>
        </div>
      </div>
    </dialog>
  );
}
