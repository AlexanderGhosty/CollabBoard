import { api } from '@/services/api';
import { sendWS } from '@/services/websocket';

/** Типы сущностей (минимально‑необходимые) */
export type Card  = { id: string; listId: string; title: string; position: number };
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
  moveList: (listId: string)  => `/lists/${listId}/move`,
  cards:  (listId: string | number) => `/lists/${listId}/cards`,
  move:   (cardId: string)    => `/cards/${cardId}/move`,
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
    const { data } = await api.get<any>(ENDPOINTS.board(id));
    // Ensure all IDs are strings
    return {
      ...data,
      id: String(data.id),
      ownerId: data.ownerId ? String(data.ownerId) : undefined,
      lists: (data.lists || []).map((list: any) => ({
        ...list,
        id: String(list.id),
        boardId: String(list.boardId),
        cards: (list.cards || []).map((card: any) => ({
          ...card,
          id: String(card.id),
          listId: String(card.listId)
        }))
      }))
    };
  },

  /** Создать доску */
  async createBoard(name: string): Promise<Board> {
    const { data } = await api.post<any>(ENDPOINTS.boards, { name });
    // Ensure all IDs are strings
    const board = {
      ...data,
      id: String(data.id),
      ownerId: data.ownerId ? String(data.ownerId) : undefined,
      lists: data.lists || []
    };
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
    await api.post(ENDPOINTS.move(cardId), { listId: toListId, position: toPos });
    sendWS({ event: 'card_moved', data: { cardId, toListId, toPos } });
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
    const { data } = await api.post<any>(ENDPOINTS.moveList(listId), { position });

    // Normalize the response to ensure it has the expected lowercase property names
    const normalizedList: List = {
      id: String(data.ID || data.id || listId),
      boardId: String(data.BoardID || data.boardId || data.board_id || ''),
      title: data.Title || data.title || '',
      position: data.Position || data.position || position,
      cards: data.cards || []
    };

    sendWS({ event: 'list_moved', data: normalizedList });
    return normalizedList;
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
  async deleteCard(cardId: string): Promise<void> {
    await api.delete(ENDPOINTS.cards(cardId));
    sendWS({ event: 'card_deleted', data: { cardId } });
  },
};
