import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/services/boardService';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useBoardStore } from '@/store/useBoardStore';

export interface CardItemProps {
  card: Card;
}

export default function CardItem({ card }: CardItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteCard = useBoardStore(state => state.deleteCard);

  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({
    id: card.id,
    data: {
      type: 'card',
      card
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent drag events
    e.stopPropagation();
    e.preventDefault();
    // We don't need to modify attributes directly, as we're handling the delete action separately
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteCard(card.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="relative group">
        {/* Delete button outside the draggable area */}
        <div
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="danger"
            className="!px-1.5 !py-0.5 !text-xs"
            onClick={handleDeleteClick}
            title={`Delete card ${card.title}`}
          >
            ✕
          </Button>
        </div>

        {/* Draggable card content */}
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className="rounded-2xl bg-white p-3 shadow hover:bg-zinc-50"
        >
          <p className="text-sm text-zinc-800 break-words pr-6">{card.title}</p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Удалить карточку"
        message={`Вы уверены, что хотите удалить карточку "${card.title}"?`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}