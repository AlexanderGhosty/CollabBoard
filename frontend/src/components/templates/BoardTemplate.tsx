import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import ListColumn from '@/components/organisms/ListColumn';
import { useBoardStore } from '@/store/useBoardStore';

export default function BoardTemplate() {
  const store = useBoardStore();
  const board = store.active;
  const sensors = useSensors(useSensor(PointerSensor));

  if (!board) return null;

  const handleDragEnd = (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIdx = board.lists.findIndex((l) => l.id === active.id);
    const newIdx = board.lists.findIndex((l) => l.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    store.setState((s) => {
      s.active!.lists = arrayMove(board.lists, oldIdx, newIdx);
    });
    // TODO — REST + WS «list_moved» при появлении эндпоинта
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={board.lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.lists.map((list) => (
            <ListColumn key={list.id} list={list} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}