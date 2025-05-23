import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useState, useEffect } from 'react';
import { List } from '@/services/boardService';
import CardItem from '@/components/molecules/CardItem';
import ListHeader from '@/components/molecules/ListHeader';
import { useCardsStore } from '@/store/board';

interface Props {
  list: List;
}

export default function ListColumn({ list }: Props) {
  // Use specific selectors for the store functions
  const createCard = useCardsStore(state => state.createCard);
  const getSortedCardsByListId = useCardsStore(state => state.getSortedCardsByListId);
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
      ? 'var(--list-hover-bg, rgba(219, 234, 254, 0.5))' // Light blue background when hovering
      : 'var(--list-bg, rgba(255, 255, 255, 0.95))', // Slightly transparent white by default
    transition: 'all 0.3s ease',
    boxShadow: isOver
      ? 'var(--list-hover-shadow, 0 4px 12px rgba(37, 99, 235, 0.15))'
      : undefined
  };

  // CSS variables for list styling are now managed globally by the theme store

  // Get cards directly from the store to ensure we have the latest data
  const storeCards = getSortedCardsByListId(list.id);

  // Use cards from the store if available, otherwise fall back to list.cards
  const cards = storeCards.length > 0 ? storeCards : (list.cards || []);

  // Log the cards for debugging
  console.log(`ListColumn rendering for list ${list.id} with ${cards.length} cards:`, cards);

  // Filter out any cards without valid IDs to prevent key prop errors
  const validCards = cards.filter(card => card && card.id);

  // Extract card IDs for SortableContext
  const cardIds = validCards.map(card => card.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-72 shrink-0 rounded-2xl bg-white dark:bg-dark-blue-50 p-4 flex flex-col shadow-list dark:shadow-dark-list border border-indigo-100 dark:border-dark-blue-100 max-h-full
        list-enter animate-slide-in transition-all duration-300 ease-in-out hover:shadow-lg dark:hover:shadow-dark-list"
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
            <div className="flex items-center justify-center h-20 rounded-xl bg-blue-50/50 dark:bg-blue-900/30 border border-dashed border-blue-200 dark:border-blue-800 text-blue-400 dark:text-blue-300 text-sm transition-colors duration-300">
              Нет карточек
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}