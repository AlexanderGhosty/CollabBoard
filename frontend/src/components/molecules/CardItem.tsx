import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/services/boardService';

export interface CardItemProps {
  card: Card;
}

export default function CardItem({ card }: CardItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="rounded-2xl bg-white p-3 shadow hover:bg-zinc-50"
    >
      <p className="text-sm text-zinc-800 break-words">{card.title}</p>
    </div>
  );
}