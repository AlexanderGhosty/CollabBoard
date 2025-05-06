import { SortableContext, useDroppable, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  const { isOver, setNodeRef } = useDroppable({ id: list.id });
  const style = { backgroundColor: isOver ? 'rgba(0,0,0,0.04)' : undefined };

  return (
    <div ref={setNodeRef} style={style} className="w-72 shrink-0 rounded-2xl bg-zinc-100 p-3">
      <ListHeader list={list} onAddCard={() => store.createCard(list.id, 'Новая карточка')} />

      <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {list.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}