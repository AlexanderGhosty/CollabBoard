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

  const style = { backgroundColor: isOver ? 'rgba(0,0,0,0.04)' : undefined };

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
      className="w-72 shrink-0 rounded-2xl bg-white p-3 flex flex-col shadow-md border border-indigo-50 max-h-full"
    >
      <ListHeader
        list={list}
        onAddCard={handleAddCard}
      />

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 overflow-y-auto mt-2 flex-grow" style={{
          maxHeight: `${Math.min(validCards.length * 60 + 20, windowHeight - 180)}px`,
          minHeight: '50px'
        }}>
          {validCards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}