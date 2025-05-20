import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback } from 'react';
import ListColumn from '@/components/organisms/ListColumn';
import { useBoardStore } from '@/store/useBoardStore';
import { List, Card } from '@/services/boardService';

export default function BoardTemplate() {
  // Use specific selectors for each piece of state/action needed
  const board = useBoardStore(state => state.active);
  const moveCard = useBoardStore(state => state.moveCard);
  const moveList = useBoardStore(state => state.moveList);

  const sensors = useSensors(useSensor(PointerSensor));

  // Define all hooks before any conditional returns
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    console.log("Drag end event:", event);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      console.log("No valid drop target or same source and target");
      return;
    }

    // Get data from the draggable and droppable elements
    const activeData = active.data?.current;
    const overData = over.data?.current;

    if (!activeData || !overData) {
      console.log("Missing data in drag elements");
      return;
    }

    // Check if this is a card being dragged
    if (activeData.type === 'card') {
      console.log("Card drag detected");

      const cardId = String(active.id);
      const sourceListId = activeData.card.listId;
      const targetListId = String(over.id);

      // If dropped on another card, we need to get its list ID
      const targetList = overData.type === 'card'
        ? overData.card.listId  // Dropped on another card
        : targetListId;         // Dropped directly on a list

      console.log("Card move details:", {
        cardId,
        sourceListId,
        targetList,
        targetListId
      });

      // Find the source and target lists
      const sourceList = board.lists.find(l => l.id === sourceListId);
      const destinationList = board.lists.find(l => l.id === targetList);

      if (!sourceList || !destinationList) {
        console.error("Could not find source or destination list");
        return;
      }

      // Calculate the position in the target list
      // For simplicity, we'll add it to the end of the target list
      const position = destinationList.cards.length > 0
        ? Math.max(...destinationList.cards.map((c: Card) => c.position)) + 1
        : 1;

      // Call the API to move the card
      moveCard(cardId, targetList, position);
      return;
    }

    // Handle list drag
    if (activeData.type === 'list') {
      console.log("List drag detected");

      const oldIdx = board.lists.findIndex((l: List) => l.id === active.id);
      const newIdx = board.lists.findIndex((l: List) => l.id === over.id);

      if (oldIdx === -1 || newIdx === -1) {
        console.log("Could not find list indexes:", {
          oldIdx,
          newIdx,
          activeId: active.id,
          overId: over.id
        });
        return;
      }

      // Get the list being moved
      const movingList = board.lists[oldIdx];
      console.log("Moving list:", movingList);

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

      console.log("New position calculated:", newPosition);

      // Call the API to persist the change
      moveList(movingList.id, newPosition);
    }
  }, [board, moveCard, moveList]);

  // Add the conditional return after all hooks are defined
  if (!board) return null;

  // Ensure all lists have valid IDs for keys
  const listsWithValidIds = board.lists.filter(list => list && list.id);

  // Extract IDs for SortableContext
  const listIds = listsWithValidIds.map(list => list.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {listsWithValidIds.map((list) => (
            <ListColumn key={list.id} list={list} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
