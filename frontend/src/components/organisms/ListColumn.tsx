import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { List } from '@/services/boardService';
import CardItem from '@/components/molecules/CardItem';
import ListHeader from '@/components/molecules/ListHeader';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  list: List;
}

export default function ListColumn({ list }: Props) {
  const store = useBoardStore();
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
      className="w-72 shrink-0 rounded-2xl bg-zinc-100 p-3"
    >
      <ListHeader
        list={list}
        onAddCard={() => store.createCard(list.id, 'Новая карточка')}
      />

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {validCards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}