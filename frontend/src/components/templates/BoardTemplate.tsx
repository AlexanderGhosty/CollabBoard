import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import ListColumn from '@/components/organisms/ListColumn';
import { useBoardStore } from '@/store/useBoardStore';
import { List } from '@/services/boardService';

export default function BoardTemplate() {
  const store = useBoardStore();
  const board = store.active;
  const sensors = useSensors(useSensor(PointerSensor));

  if (!board) return null;

  const handleDragEnd = (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIdx = board.lists.findIndex((l: List) => l.id === active.id);
    const newIdx = board.lists.findIndex((l: List) => l.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    // Get the list being moved
    const movingList = board.lists[oldIdx];
    
    // Calculate the new position
    let newPosition: number;
    
    if (newIdx === 0) {
      // Moving to the beginning
      newPosition = board.lists[0].position / 2;
    } else if (newIdx === board.lists.length - 1) {
      // Moving to the end
      newPosition = board.lists[board.lists.length - 1].position + 1;
    } else {
      // Moving between two lists
      const prevPosition = board.lists[newIdx - 1].position;
      const nextPosition = board.lists[newIdx].position;
      newPosition = (prevPosition + nextPosition) / 2;
    }
    
    // Update the UI optimistically
    store.setState((s) => {
      s.active!.lists = arrayMove(board.lists, oldIdx, newIdx);
    });
    
    // Call the API to persist the change
    store.moveList(movingList.id, newPosition);
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
