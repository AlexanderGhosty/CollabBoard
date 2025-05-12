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
  cards:  (listId: string)    => `/lists/${listId}/cards`,
  move:   (cardId: string)    => `/cards/${cardId}/move`,
  dup:    (cardId: string)    => `/cards/${cardId}/duplicate`,
};

export const boardService = {
  /** Получить все доски текущего пользователя */
  async getBoards(): Promise<Board[]> {
    const { data } = await api.get<Board[]>(ENDPOINTS.boards);
    return data;
  },

  /** Получить доску по ID */
  async getBoardById(id: string): Promise<Board> {
    const { data } = await api.get<Board>(ENDPOINTS.board(id));
    return data;
  },

  /** Создать доску */
  async createBoard(name: string): Promise<Board> {
    const { data } = await api.post<Board>(ENDPOINTS.boards, { name });
    // Рассылаем событие owner‑клиентам
    sendWS({ event: 'board_created', data });
    return data;
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
    const { data } = await api.post<List>(ENDPOINTS.lists(boardId), {
      title,
      position
    });
    sendWS({ event: 'list_created', data });
    return data;
  },

  /** Переместить список (изменить порядок) */
  async moveList(listId: string, position: number): Promise<List> {
    const { data } = await api.post<List>(ENDPOINTS.moveList(listId), { position });
    sendWS({ event: 'list_moved', data });
    return data;
  },

  /** Создать карточку */
  async createCard(listId: string, title: string, description: string = '', position: number): Promise<Card> {
    const { data } = await api.post<Card>(ENDPOINTS.cards(listId), {
      title,
      description,
      position
    });
    sendWS({ event: 'card_created', data });
    return data;
  },

  /** Удалить карточку */
  async deleteCard(cardId: string): Promise<void> {
    await api.delete(ENDPOINTS.cards(cardId));
    sendWS({ event: 'card_deleted', data: { cardId } });
  },

  /** Дублировать карточку */
  async duplicateCard(cardId: string): Promise<Card> {
    const { data } = await api.post<Card>(ENDPOINTS.dup(cardId));
    sendWS({ event: 'card_created', data });
    return data;
  },
};
