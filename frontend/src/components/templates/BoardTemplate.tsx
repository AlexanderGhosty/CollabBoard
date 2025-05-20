import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  Active
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useState } from 'react';
import { useBoardStore } from '@/store/useBoardStore';
import { List, Card } from '@/services/boardService';
import DragOverlay from '@/components/molecules/DragOverlay';
import SortableListColumn from '@/components/molecules/SortableListColumn';

export default function BoardTemplate() {
  // Use specific selectors for each piece of state/action needed
  const board = useBoardStore(state => state.active);
  const moveCard = useBoardStore(state => state.moveCard);
  const moveList = useBoardStore(state => state.moveList);
  const set = useBoardStore.setState;

  // State to track the currently active (dragged) item
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Activate on a small movement to avoid interfering with click
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      }
    })
  );

  // Handle drag start event
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
    setActiveData(active.data?.current);
  }, []);

  // Define all hooks before any conditional returns
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    console.log("Drag end event:", event);
    const { active, over } = event;

    // Reset active drag state
    setActiveId(null);
    setActiveData(null);

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

      if (oldIdx === newIdx) {
        console.log("List dropped in the same position, no action needed");
        return;
      }

      // Get the list being moved
      const movingList = board.lists[oldIdx];
      console.log("Moving list:", movingList);

      // Calculate the new position
      let newPosition: number;

      // Sort lists by position to ensure correct order
      const sortedLists = [...board.lists].sort((a, b) => a.position - b.position);

      // Log the current positions of all lists
      console.log("Current list positions:", sortedLists.map(l => ({ id: l.id, position: l.position })));

      // Find the target position based on the visual order after drag
      // This is simpler and more reliable than trying to calculate intermediate positions
      newPosition = newIdx + 1; // Positions start at 1

      console.log(`Moving list from visual position ${oldIdx + 1} to ${newIdx + 1}`);

      // Ensure position is a valid integer
      newPosition = Math.round(newPosition);

      // Final validation
      if (isNaN(newPosition) || !isFinite(newPosition) || newPosition <= 0) {
        console.error("Invalid position calculated:", newPosition);
        // Fallback to a safe position - at the end
        newPosition = sortedLists.length > 0 ?
          Math.max(...sortedLists.map(l => l.position)) + 1 : 1;
      }

      console.log(`Final position for list ${movingList.id}: ${newPosition}`);


      console.log("New position calculated:", newPosition);

      // Call the API to persist the change
      // The moveList function will handle the optimistic update
      moveList(movingList.id, newPosition);
    }
  }, [board, moveCard, moveList, set]);

  // Add the conditional return after all hooks are defined
  if (!board) return null;

  // Ensure all lists have valid IDs for keys
  const listsWithValidIds = board.lists.filter(list => list && list.id);

  // Extract IDs for SortableContext
  const listIds = listsWithValidIds.map(list => list.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="board-container w-full overflow-visible">
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 overflow-x-auto pb-6 items-start w-full h-[calc(100vh-140px)] pt-2 board-scroll-container">
            {listsWithValidIds.map((list) => (
              <SortableListColumn key={list.id} list={list} />
            ))}
            {/* Add an empty div at the end to ensure there's space for scrolling */}
            <div className="w-4 shrink-0"></div>
          </div>
        </SortableContext>
      </div>

      {/* Custom drag overlay for dragged items */}
      <DragOverlay activeId={activeId} activeData={activeData} />
    </DndContext>
  );
}
