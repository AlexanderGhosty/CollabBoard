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
  const createList = useBoardStore(state => state.createList);
  const isCardModalOpen = useBoardStore(state => state.isCardModalOpen);
  const set = useBoardStore.setState;

  // Define the createList callback
  const handleCreateList = useCallback(() => {
    createList('Новый список');
  }, [createList]);

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
    // If a card modal is open, prevent drag operations
    if (isCardModalOpen) {
      // Cancel the drag operation by not setting activeId and activeData
      event.preventDefault();
      return;
    }

    const { active } = event;
    setActiveId(String(active.id));
    setActiveData(active.data?.current);
  }, [isCardModalOpen]);

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
      // Disable drag detection completely when a card modal is open
      autoScroll={!isCardModalOpen}
    >
      <div className={`board-container w-full overflow-visible page-enter animate-fade-in ${isCardModalOpen ? 'dnd-disabled' : ''}`}>
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-5 overflow-x-auto pb-8 items-start w-full h-[calc(100vh-140px)] pt-3 board-scroll-container
            bg-gradient-to-br from-blue-50/50 to-indigo-100/50 rounded-xl p-4">
            {listsWithValidIds.map((list) => (
              <SortableListColumn key={list.id} list={list} />
            ))}

            {/* Add a "Add List" button at the end */}
            <div
              onClick={isCardModalOpen ? undefined : handleCreateList}
              className={`w-72 shrink-0 rounded-2xl bg-white/60 border border-dashed border-blue-200 p-4 h-32
                flex items-center justify-center transition-all duration-300
                backdrop-blur-sm ${isCardModalOpen
                  ? 'opacity-50 cursor-default'
                  : 'cursor-pointer hover:bg-white/80 hover:shadow-md hover:border-blue-300 hover:scale-105 active:scale-95'}`}
            >
              <div className="text-blue-600 font-medium flex flex-col items-center gap-2">
                <span className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">+</span>
                <span>Добавить список</span>
              </div>
            </div>

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
