import { api } from '@/services/api';
import { LIST_ENDPOINTS, CARD_ENDPOINTS } from '@/utils/api/apiEndpoints';
import { ApiList, normalizeList, ApiCard, normalizeCard } from '@/utils/api/normalizeEntities';
import { handleApiError } from '@/utils/api/errorHandling';
import { WebSocketEventType, sendListEvent, sendListDeletedEvent } from '@/utils/websocket/events';
import { List, Card } from '@/services/boardService';
import { useBoardStore } from '@/store/board';
import { useListsStore } from '@/store/board/useListsStore';
import { useCardsStore } from '@/store/board/useCardsStore';

/**
 * List service - handles list-related operations
 */
export const listService = {
  /** Получить списки для доски */
  async fetchBoardLists(boardId: string): Promise<List[]> {
    try {
      console.log(`Fetching lists for board ${boardId}`);
      const { data } = await api.get<ApiList[]>(LIST_ENDPOINTS.lists(boardId));
      console.log("Raw lists data from API:", data);

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array of lists but got:", data);
        return [];
      }

      // Normalize the lists data
      const normalizedLists = data.map(list => normalizeList(list, boardId));

      // Get the cards store to update it with the fetched cards
      const cardsStore = useCardsStore.getState();

      // For each list, fetch its cards
      for (const list of normalizedLists) {
        try {
          console.log(`Fetching cards for list ${list.id}`);
          const { data: cardsData } = await api.get<ApiCard[]>(CARD_ENDPOINTS.cards(list.id));
          console.log(`Raw cards data for list ${list.id}:`, cardsData);

          // Normalize the cards data
          const normalizedCards = (cardsData || []).map(card => normalizeCard(card, list.id));

          // Add the normalized cards to the list
          list.cards = normalizedCards;

          // Update the cards store with these cards
          useCardsStore.setState(state => {
            // Add each card to the cards record
            normalizedCards.forEach(card => {
              state.cards[card.id] = card;

              // Make sure the listCards relationship is properly set up
              if (!state.listCards[list.id]) {
                state.listCards[list.id] = [];
              }

              // Add the card ID to the list's cards if not already there
              if (!state.listCards[list.id].includes(card.id)) {
                state.listCards[list.id].push(card.id);
              }
            });
          });

          console.log(`Added ${normalizedCards.length} cards to list ${list.id}`);
        } catch (error) {
          console.error(`Error fetching cards for list ${list.id}:`, error);
          list.cards = []; // Ensure cards is at least an empty array if fetch fails
        }
      }

      return normalizedLists;
    } catch (error) {
      console.error(`Error fetching lists for board ${boardId}:`, error);
      throw handleApiError(error);
    }
  },

  /** Создать список */
  async createList(boardId: string, title: string, position: number): Promise<List> {
    try {
      console.log(`Creating list "${title}" at position ${position} for board ${boardId}`);

      const { data } = await api.post<ApiList>(LIST_ENDPOINTS.lists(boardId), {
        title,
        position
      });

      console.log("Raw list data from API:", data);

      // Normalize the list data
      const list = normalizeList(data, boardId);
      console.log("Normalized list data:", list);

      // Add a flag to the WebSocket data to indicate this was created locally
      const wsData = {
        ...list,
        _locallyCreated: true,
        boardId: boardId // Explicitly set the correct boardId
      };

      // Send WebSocket event
      sendListEvent(WebSocketEventType.LIST_CREATED, wsData as List);

      return list;
    } catch (error) {
      console.error(`Error creating list for board ${boardId}:`, error);
      throw handleApiError(error);
    }
  },

  /** Обновить заголовок списка */
  async updateList(listId: string, title: string): Promise<List> {
    try {
      console.log(`Updating list ${listId} with title: ${title}`);

      // Find the board ID for this list
      const boardStore = useBoardStore.getState();
      const activeBoard = boardStore.activeBoard;

      if (!activeBoard) {
        throw new Error("No active board found");
      }

      // Get the list from the lists store
      const listsStore = useListsStore.getState();
      const list = listsStore.lists[listId];

      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Use the correct endpoint format: /boards/:boardId/lists/:id
      const { data } = await api.put<ApiList>(LIST_ENDPOINTS.list(boardId, listId), { title });

      // Normalize the list data
      const normalizedList = normalizeList(data, boardId);
      normalizedList.cards = list.cards || []; // Preserve cards from the original list

      console.log("List updated successfully:", normalizedList);

      // Send WebSocket event
      sendListEvent(WebSocketEventType.LIST_UPDATED, normalizedList);

      return normalizedList;
    } catch (error) {
      console.error("Error updating list:", error);
      throw handleApiError(error);
    }
  },

  /** Переместить список (изменить порядок) */
  async moveList(listId: string, position: number): Promise<List> {
    try {
      console.log(`Moving list ${listId} to position ${position}`);

      // Find the board ID for this list
      const boardStore = useBoardStore.getState();
      const activeBoard = boardStore.activeBoard;

      if (!activeBoard) {
        throw new Error("No active board found");
      }

      // Get the list from the lists store
      const listsStore = useListsStore.getState();
      const list = listsStore.lists[listId];

      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Ensure position is a valid number
      if (isNaN(position) || !isFinite(position)) {
        console.error("Invalid position value:", position);
        position = list.position + 1; // Default to moving it one position forward
      }

      // Convert position to integer to match backend expectations
      const intPosition = Math.round(position);
      console.log(`Sending position ${intPosition} to server (original: ${position})`);

      // Use PUT method as expected by the backend
      const { data } = await api.put<ApiList>(LIST_ENDPOINTS.moveList(boardId, listId), {
        position: intPosition
      });

      console.log("List moved successfully, response:", data);

      // Normalize the list data
      const normalizedList = normalizeList(data, boardId);
      normalizedList.cards = list.cards || []; // Preserve cards from the original list

      // Add the current list count to the WebSocket event data
      const boardLists = listsStore.getListsByBoardId(boardId);
      const wsData = {
        ...normalizedList,
        _expectedListCount: boardLists.length
      };

      // Send WebSocket event
      sendListEvent(WebSocketEventType.LIST_MOVED, wsData as List);

      return normalizedList;
    } catch (error) {
      console.error(`Error moving list ${listId}:`, error);
      throw handleApiError(error);
    }
  },

  /** Удалить список */
  async deleteList(listId: string): Promise<void> {
    try {
      console.log(`Deleting list ${listId}`);

      // Find the board ID for this list
      const boardStore = useBoardStore.getState();
      const activeBoard = boardStore.activeBoard;

      if (!activeBoard) {
        throw new Error("No active board found");
      }

      // Get the list from the lists store
      const listsStore = useListsStore.getState();
      const list = listsStore.lists[listId];

      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Use the correct endpoint format: /boards/:boardId/lists/:id
      await api.delete(LIST_ENDPOINTS.list(boardId, listId));
      console.log("List deleted successfully");

      // Send WebSocket event
      sendListDeletedEvent(listId, boardId);
    } catch (error) {
      console.error("Error deleting list:", error);
      throw handleApiError(error);
    }
  },
};
