import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useState, useEffect } from 'react';
import { useBoardStore, useListsStore, useCardsStore } from '@/store/board';
import { List, Card } from '@/services/boardService';
import { subscribeWS } from '@/services/websocket';
import DragOverlay from '@/components/molecules/DragOverlay';
import SortableListColumn from '@/components/molecules/SortableListColumn';

export default function BoardTemplate() {
  // State for board data
  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [listCards, setListCards] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Get store actions
  const moveCard = useCardsStore(state => state.moveCard);
  const moveList = useListsStore(state => state.moveList);
  const createList = useListsStore(state => state.createList);
  const isCardModalOpen = useBoardStore(state => state.isCardModalOpen);

  // Get active board ID once
  const activeBoard = useBoardStore(state => state.activeBoard);
  const boards = useBoardStore(state => state.boards);

  // Function to load data from stores
  const loadBoardData = useCallback(() => {
    if (!activeBoard) {
      console.log("No active board, skipping loadBoardData");
      return;
    }

    console.log(`Loading data for board ${activeBoard}`);

    // Get board data
    const boardData = boards[activeBoard];
    if (!boardData) {
      console.log(`Board data not found for ID ${activeBoard}`);
      return;
    }

    setBoard(boardData);

    // Get lists for this board
    const listsStore = useListsStore.getState();

    // Debug the state of the lists store
    console.log('Lists store state:', {
      lists: listsStore.lists,
      boardLists: listsStore.boardLists,
      activeBoardId: activeBoard
    });

    const listsData = listsStore.getSortedListsByBoardId(activeBoard);
    console.log(`Found ${listsData.length} lists for board ${activeBoard}:`, listsData);

    // If no lists were found but we know they should exist, log a warning
    if (listsData.length === 0) {
      console.warn(`No lists found for board ${activeBoard} in the store. This might indicate a data synchronization issue.`);
    }

    setLists(listsData);

    // Get cards for each list
    const cardsStore = useCardsStore.getState();
    const cardsData = {};

    listsData.forEach(list => {
      const listCards = cardsStore.getSortedCardsByListId(list.id);
      cardsData[list.id] = listCards;
      console.log(`Found ${listCards.length} cards for list ${list.id}`);
    });

    setListCards(cardsData);
    setIsLoading(false);
    console.log("Board data loaded successfully");
  }, [activeBoard, boards]);

  // Load data from stores
  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Subscribe to WebSocket events to update our local state
  useEffect(() => {
    if (!activeBoard) return;

    console.log(`Setting up WebSocket subscriptions for board ${activeBoard}`);

    // Set up WebSocket subscriptions for real-time updates
    const unsubscribers = [
      // List events
      subscribeWS('list_created', (data) => {
        console.log('BoardTemplate received list_created event:', data);
        loadBoardData();
      }),
      subscribeWS('list_updated', (data) => {
        console.log('BoardTemplate received list_updated event:', data);
        loadBoardData();
      }),
      subscribeWS('list_moved', (data) => {
        console.log('BoardTemplate received list_moved event:', data);
        loadBoardData();
      }),
      subscribeWS('list_deleted', (data) => {
        console.log('BoardTemplate received list_deleted event:', data);
        loadBoardData();
      }),

      // Card events
      subscribeWS('card_created', (data) => {
        console.log('BoardTemplate received card_created event:', data);
        loadBoardData();
      }),
      subscribeWS('card_updated', (data) => {
        console.log('BoardTemplate received card_updated event:', data);
        loadBoardData();
      }),
      subscribeWS('card_moved', (data) => {
        console.log('BoardTemplate received card_moved event:', data);
        loadBoardData();
      }),
      subscribeWS('card_deleted', (data) => {
        console.log('BoardTemplate received card_deleted event:', data);
        loadBoardData();
      }),
    ];

    // Clean up subscriptions when component unmounts
    return () => {
      console.log(`Cleaning up WebSocket subscriptions for board ${activeBoard}`);
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [activeBoard, loadBoardData]);

  // Define the createList callback
  const handleCreateList = useCallback(async () => {
    if (activeBoard) {
      console.log(`Creating new list for board ${activeBoard}`);
      try {
        await createList(activeBoard, 'Новый список');
        console.log("List created, reloading board data");
        // Обновляем данные доски после создания списка
        setTimeout(() => loadBoardData(), 100);
      } catch (error) {
        console.error("Error creating list:", error);
      }
    } else {
      console.error("Cannot create list: no active board");
    }
  }, [createList, activeBoard, loadBoardData]);

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
      const sourceList = lists.find(l => l.id === sourceListId);
      const destinationList = lists.find(l => l.id === targetList);

      if (!sourceList || !destinationList) {
        console.error("Could not find source or destination list");
        return;
      }

      // Calculate the position in the target list
      // For simplicity, we'll add it to the end of the target list
      const targetCards = listCards[targetList] || [];
      const position = targetCards.length > 0
        ? Math.max(...targetCards.map((c: Card) => c.position)) + 1
        : 1;

      // Call the API to move the card
      moveCard(cardId, targetList, position);
      return;
    }

    // Handle list drag
    if (activeData.type === 'list') {
      console.log("List drag detected");

      const oldIdx = lists.findIndex((l: List) => l.id === active.id);
      const newIdx = lists.findIndex((l: List) => l.id === over.id);

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
      const movingList = lists[oldIdx];
      if (!movingList) {
        console.error("Could not find the list being moved");
        return;
      }
      console.log("Moving list:", movingList);

      // Calculate the new position
      let newPosition: number;

      // Sort lists by position to ensure correct order
      const sortedLists = [...lists].sort((a, b) => a.position - b.position);

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
      moveList(movingList.id, newPosition);
    }
  }, [lists, listCards, moveCard, moveList]);

  // Add the conditional return after all hooks are defined
  if (isLoading || !board) return null;

  // Filter lists to ensure all have valid IDs
  const listsWithValidIds = lists.filter(list => list && list.id);

  // Extract IDs for SortableContext
  const listIds = listsWithValidIds.map(list => list.id);

  // Create a complete list object with cards for each list
  const listsWithCards = listsWithValidIds.map(list => ({
    ...list,
    cards: listCards[list.id] || []
  }));

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
            {listsWithCards.map((list) => (
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
