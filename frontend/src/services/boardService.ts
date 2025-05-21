import { api } from '@/services/api';
import { sendWS } from '@/services/websocket';
import { useBoardStore } from '@/store/useBoardStore';

/** Типы сущностей (минимально‑необходимые) */
export type Card  = {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number
};
export type List  = { id: string; boardId: string; title: string; position: number; cards: Card[] };
export type Board = {
  id: string;
  name: string;  // Changed from 'title' to 'name' to match backend
  ownerId?: string; // Added to match backend
  lists: List[]
};

const ENDPOINTS = {
  boards: '/boards',
  board:  (id: string)        => `/boards/${id}`,
  lists:  (boardId: string)   => `/boards/${boardId}/lists`,
  list:   (listId: string)    => `/lists/${listId}`,
  moveList: (boardId: string, listId: string)  => `/boards/${boardId}/lists/${listId}/move`,
  cards:  (listId: string | number) => `/lists/${listId}/cards`,
  card:   (listId: string, cardId: string) => `/lists/${listId}/cards/${cardId}`,
  moveCard: (listId: string, cardId: string) => `/lists/${listId}/cards/${cardId}/move`,
  dup:    (cardId: string)    => `/cards/${cardId}/duplicate`,
};

export const boardService = {
  /** Получить все доски текущего пользователя */
  async getBoards(): Promise<Board[]> {
    const { data } = await api.get<any[]>(ENDPOINTS.boards);
    console.log("Raw board data from API:", data); // Debug log

    // Ensure all IDs are strings and handle the BoardID field from backend
    return data.map(board => {
      // The backend returns BoardID instead of id
      const boardId = board.BoardID || board.boardId || board.id;
      // The backend returns Name or name
      const boardName = board.Name || board.name;

      if (!boardId) {
        console.error("Board without ID received:", board);
      }

      return {
        ...board,
        // Use BoardID as the primary id field if available
        id: boardId ? String(boardId) : undefined,
        // Ensure name is properly set
        name: boardName,
        ownerId: board.OwnerID ? String(board.OwnerID) : (board.ownerId ? String(board.ownerId) : undefined),
        lists: board.lists || []
      };
    }).filter(board => board.id); // Filter out boards without IDs
  },

  /** Получить доску по ID */
  async getBoardById(id: string): Promise<Board> {
    console.log(`Fetching board with ID: ${id}`);

    // Step 1: Fetch the board data
    const { data: boardData } = await api.get<any>(ENDPOINTS.board(id));
    console.log("Raw board data:", boardData);

    // Step 2: Fetch the lists for this board
    const { data: listsData } = await api.get<any[]>(ENDPOINTS.lists(id));
    console.log("Raw lists data:", listsData);

    // Process lists data - handle both uppercase and lowercase property names
    const processedLists = (listsData || []).map((list: any) => {
      const listId = String(list.ID || list.id);
      return {
        ...list,
        id: listId,
        boardId: String(list.BoardID || list.boardId || list.board_id || id),
        title: list.Title || list.title || '',
        position: list.Position || list.position || 0,
        cards: [] // Initialize empty cards array for each list
      };
    });

    // Step 3: For each list, fetch its cards
    for (const list of processedLists) {
      try {
        const { data: cardsData } = await api.get<any[]>(`/lists/${list.id}/cards`);
        console.log(`Raw cards data for list ${list.id}:`, cardsData);

        // Process cards data - handle both uppercase and lowercase property names
        list.cards = (cardsData || []).map((card: any) => ({
          ...card,
          id: String(card.ID || card.id),
          listId: String(card.ListID || card.listId || list.id),
          title: card.Title || card.title || '',
          // Handle the description field which could be a string or a pgtype.Text structure
          description: typeof card.Description === 'string'
            ? card.Description
            : (card.Description?.String !== undefined
              ? card.Description.String
              : (card.description || '')),
          position: card.Position || card.position || 0
        }));
      } catch (error) {
        console.error(`Error fetching cards for list ${list.id}:`, error);
        list.cards = []; // Ensure cards is at least an empty array if fetch fails
      }
    }

    // Step 4: Return the complete board with lists and cards
    return {
      ...boardData,
      id: String(boardData.ID || boardData.id),
      name: boardData.Name || boardData.name,
      ownerId: boardData.OwnerID ? String(boardData.OwnerID) :
               (boardData.ownerId ? String(boardData.ownerId) : undefined),
      lists: processedLists
    };
  },

  /** Создать доску */
  async createBoard(name: string): Promise<Board> {
    const { data } = await api.post<any>(ENDPOINTS.boards, { name });
    console.log("Raw board creation data from API:", data); // Debug log

    // Ensure all IDs are strings and properly normalize property names
    const board = {
      ...data,
      id: String(data.ID || data.id),
      name: data.Name || data.name || name, // Ensure name is properly set
      ownerId: data.OwnerID ? String(data.OwnerID) :
               (data.ownerId ? String(data.ownerId) : undefined),
      lists: data.lists || []
    };

    console.log("Normalized board data:", board); // Debug log

    // Рассылаем событие owner‑клиентам
    sendWS({ event: 'board_created', data: board });
    return board;
  },

  /** Дублировать карточку */
  async duplicateCard(cardId: string): Promise<Card> {
    const { data } = await api.post<Card>(ENDPOINTS.dup(cardId));
    sendWS({ event: 'card_created', data });
    return data;
  },

  /** Переместить карточку (между списками или внутри списка) */
  async moveCard(cardId: string, toListId: string, toPos: number): Promise<void> {
    console.log(`Moving card ${cardId} to list ${toListId} at position ${toPos}`);

    try {
      // Convert listId to number for the backend
      const listIdNum = parseInt(toListId);

      // Use PUT method as expected by the backend
      await api.put(ENDPOINTS.moveCard(toListId, cardId), {
        listId: listIdNum,
        position: toPos
      });

      console.log("Card moved successfully");

      // No need to send WebSocket event here anymore
      // The backend will broadcast the event to all clients including this one
    } catch (error) {
      console.error("Error moving card:", error);
      throw error;
    }
  },

  /** Создать список */
  async createList(boardId: string, title: string, position: number): Promise<List> {
    const { data } = await api.post<any>(ENDPOINTS.lists(boardId), {
      title,
      position
    });

    console.log("Raw list data from API:", data); // Debug log

    // Ensure the list has the correct structure with a cards array
    const list: List = {
      ...data,
      // Handle both uppercase and lowercase property names
      id: String(data.ID || data.id || Date.now()),
      boardId: String(data.BoardID || data.board_id || data.boardId || boardId),
      title: data.Title || data.title || title,
      position: data.Position || data.position || position,
      cards: []
    };

    // Add a flag to the WebSocket data to indicate this was created locally
    // This could be used by other clients to handle the event differently
    const wsData = {
      ...list,
      _locallyCreated: true
    };

    sendWS({ event: 'list_created', data: wsData });
    return list;
  },

  /** Переместить список (изменить порядок) */
  async moveList(listId: string, position: number): Promise<List> {
    console.log(`Moving list ${listId} to position ${position}`);

    // Find the board ID for this list
    const board = useBoardStore.getState().active;
    if (!board) {
      throw new Error("No active board found");
    }

    const list = board.lists.find(l => l.id === listId);
    if (!list) {
      throw new Error(`List with ID ${listId} not found in active board`);
    }

    const boardId = list.boardId;
    console.log(`Found list ${listId} in board ${boardId}`);

    try {
      // Ensure position is a valid number
      if (isNaN(position) || !isFinite(position)) {
        console.error("Invalid position value:", position);
        position = list.position + 1; // Default to moving it one position forward
      }

      // Convert position to integer to match backend expectations
      const intPosition = Math.round(position);
      console.log(`Sending position ${intPosition} to server (original: ${position})`);

      // Log the full request details
      console.log(`Request URL: ${ENDPOINTS.moveList(boardId, listId)}`);
      console.log(`Request payload:`, { position: intPosition });

      // Use PUT method as expected by the backend
      const { data } = await api.put<any>(ENDPOINTS.moveList(boardId, listId), {
        position: intPosition
      });

      console.log("List moved successfully, response:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedList: List = {
        id: String(data.ID || data.id || listId),
        boardId: String(data.BoardID || data.boardId || data.board_id || boardId),
        title: data.Title || data.title || list.title,
        position: data.Position || data.position || intPosition,
        cards: list.cards || []
      };

      // Log the normalized list for debugging
      console.log("Normalized list after move:", normalizedList);

      // The backend will broadcast the event to all clients
      return normalizedList;
    } catch (error) {
      console.error(`Error moving list ${listId}:`, error);

      // Enhance error information for better error handling in the UI
      if (error instanceof Error) {
        // Check for network errors
        if (error.message.includes('Network Error')) {
          throw new Error('network: Failed to connect to the server. Please check your internet connection.');
        }

        // Check for timeout errors
        if (error.message.includes('timeout')) {
          throw new Error('timeout: Request timed out. The server might be busy, please try again.');
        }

        // Check for specific backend errors
        if (error.message.includes('not a member')) {
          throw new Error('not a member: You don\'t have permission to move this list.');
        }

        // Check for position conflicts
        if (error.message.includes('position conflict')) {
          throw new Error('position conflict: Position conflict detected. The list order will be fixed automatically.');
        }
      }

      // If we couldn't identify a specific error, rethrow the original
      throw error;
    }
  },

  /** Создать карточку */
  async createCard(listId: string, title: string, description: string = '', position: number): Promise<Card> {
    // Log the request parameters for debugging
    console.log("Creating card with params:", { listId, title, description, position });

    try {
      const { data } = await api.post<any>(ENDPOINTS.cards(listId), {
        title,
        description,
        position
      });

      console.log("Raw card data from API:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedCard: Card = {
        id: String(data.ID || data.id || Date.now()),
        listId: String(data.ListID || data.listId || listId),
        title: data.Title || data.title || title,
        // Handle the description field which could be a string or a pgtype.Text structure
        description: typeof data.Description === 'string'
          ? data.Description
          : (data.Description?.String !== undefined
            ? data.Description.String
            : (data.description || description)),
        position: data.Position || data.position || position
      };

      sendWS({ event: 'card_created', data: normalizedCard });
      return normalizedCard;
    } catch (error) {
      console.error("Error creating card:", error);
      throw error;
    }
  },

  /** Удалить карточку */
  async deleteCard(cardId: string, listId: string): Promise<void> {
    try {
      console.log(`Deleting card ${cardId} from list ${listId}`);
      await api.delete(ENDPOINTS.card(listId, cardId));
      console.log("Card deleted successfully");
      sendWS({ event: 'card_deleted', data: { cardId } });
    } catch (error) {
      console.error("Error deleting card:", error);
      throw error;
    }
  },

  /** Обновить карточку */
  async updateCard(cardId: string, listId: string, updates: { title?: string; description?: string }): Promise<Card> {
    try {
      console.log(`Updating card ${cardId} in list ${listId}:`, updates);

      const { data } = await api.put<any>(ENDPOINTS.card(listId, cardId), updates);

      console.log("Raw updated card data from API:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedCard: Card = {
        id: String(data.ID || data.id || cardId),
        listId: String(data.ListID || data.listId || listId),
        title: data.Title || data.title || updates.title || '',
        // Handle the description field which could be a string or a pgtype.Text structure
        description: typeof data.Description === 'string'
          ? data.Description
          : (data.Description?.String !== undefined
            ? data.Description.String
            : (data.description || updates.description || '')),
        position: data.Position || data.position || 0
      };

      sendWS({ event: 'card_updated', data: normalizedCard });
      return normalizedCard;
    } catch (error) {
      console.error("Error updating card:", error);
      throw error;
    }
  },

  /** Обновить заголовок списка */
  async updateList(listId: string, title: string): Promise<List> {
    try {
      console.log(`Updating list ${listId} with title: ${title}`);

      // Find the board ID for this list
      const board = useBoardStore.getState().active;
      if (!board) {
        throw new Error("No active board found");
      }

      const list = board.lists.find(l => l.id === listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Use the correct endpoint format: /boards/:boardId/lists/:id
      const updateEndpoint = `${ENDPOINTS.lists(boardId)}/${listId}`;
      console.log(`Using update endpoint: ${updateEndpoint}`);

      const { data } = await api.put<any>(updateEndpoint, { title });

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedList: List = {
        id: String(data.ID || data.id || listId),
        boardId: String(data.BoardID || data.boardId || data.board_id || boardId),
        title: data.Title || data.title || title,
        position: data.Position || data.position || list.position,
        cards: list.cards || []
      };

      console.log("List updated successfully:", normalizedList);
      sendWS({ event: 'list_updated', data: normalizedList });
      return normalizedList;
    } catch (error) {
      console.error("Error updating list:", error);
      throw error;
    }
  },

  /** Удалить список */
  async deleteList(listId: string): Promise<void> {
    try {
      console.log(`Deleting list ${listId}`);

      // Find the board ID for this list
      const board = useBoardStore.getState().active;
      if (!board) {
        throw new Error("No active board found");
      }

      const list = board.lists.find(l => l.id === listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Use the correct endpoint format: /boards/:boardId/lists/:id
      const deleteEndpoint = `${ENDPOINTS.lists(boardId)}/${listId}`;
      console.log(`Using delete endpoint: ${deleteEndpoint}`);

      await api.delete(deleteEndpoint);
      console.log("List deleted successfully");
      sendWS({ event: 'list_deleted', data: { listId } });
    } catch (error) {
      console.error("Error deleting list:", error);
      throw error;
    }
  },

  /** Удалить доску */
  async deleteBoard(boardId: string): Promise<void> {
    try {
      console.log(`Deleting board ${boardId}`);
      await api.delete(ENDPOINTS.board(boardId));
      console.log("Board deleted successfully");

      // The backend will broadcast the board_deleted event to all connected clients
      // We don't need to send a WebSocket event here
    } catch (error) {
      console.error("Error deleting board:", error);
      throw error;
    }
  },

  /** Обновить название доски */
  async updateBoard(boardId: string, name: string): Promise<Board> {
    try {
      console.log(`Updating board ${boardId} with name: ${name}`);

      const { data } = await api.put<any>(ENDPOINTS.board(boardId), { name });
      console.log("Raw updated board data from API:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedBoard: Board = {
        id: String(data.ID || data.id || boardId),
        name: data.Name || data.name || name,
        ownerId: data.OwnerID ? String(data.OwnerID) :
                 (data.ownerId ? String(data.ownerId) : undefined),
        lists: [] // Lists will be populated separately if needed
      };

      console.log("Board updated successfully:", normalizedBoard);
      sendWS({ event: 'board_updated', data: normalizedBoard });
      return normalizedBoard;
    } catch (error) {
      console.error("Error updating board:", error);
      throw error;
    }
  },
};
