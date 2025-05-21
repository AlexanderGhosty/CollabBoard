import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useState, useEffect } from 'react';
import { List } from '@/services/boardService';
import CardItem from '@/components/molecules/CardItem';
import ListHeader from '@/components/molecules/ListHeader';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  list: List;
}

export default function ListColumn({ list }: Props) {
  // Use a specific selector for the createCard function instead of the entire store
  const createCard = useBoardStore(state => state.createCard);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Define the callback for adding a card before using it in JSX
  const handleAddCard = useCallback(() => {
    createCard(list.id, 'Новая карточка');
  }, [createCard, list.id]);

  const { isOver, setNodeRef } = useDroppable({
    id: list.id,
    data: {
      type: 'list',
      list
    }
  });

  const style = {
    backgroundColor: isOver
      ? 'rgba(219, 234, 254, 0.5)' // Light blue background when hovering
      : 'rgba(255, 255, 255, 0.95)', // Slightly transparent white by default
    transition: 'all 0.3s ease',
    boxShadow: isOver
      ? '0 4px 12px rgba(37, 99, 235, 0.15)'
      : undefined
  };

  // Ensure cards array exists, initialize as empty array if undefined
  const cards = list.cards || [];

  // Filter out any cards without valid IDs to prevent key prop errors
  const validCards = cards.filter(card => card && card.id);

  // Extract card IDs for SortableContext
  const cardIds = validCards.map(card => card.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 shrink-0 rounded-2xl bg-white p-4 flex flex-col shadow-list border border-indigo-100 max-h-full
        list-enter animate-slide-in transition-all duration-300 ease-in-out hover:shadow-lg"
    >
      <ListHeader
        list={list}
        onAddCard={handleAddCard}
      />

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          className="flex flex-col gap-3 overflow-y-auto mt-3 flex-grow scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent pr-1"
          style={{
            maxHeight: `${Math.min(validCards.length * 70 + 20, windowHeight - 180)}px`,
            minHeight: '50px',
            transition: 'max-height 0.3s ease'
          }}
        >
          {validCards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}

          {validCards.length === 0 && (
            <div className="flex items-center justify-center h-20 rounded-xl bg-blue-50/50 border border-dashed border-blue-200 text-blue-400 text-sm">
              Нет карточек
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}