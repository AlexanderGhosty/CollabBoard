import { api } from '@/services/api';
import { sendWS } from '@/services/websocket';

/** Типы сущностей (минимально‑необходимые) */
export type Card  = { id: string; listId: string; title: string; position: number };
export type List  = { id: string; boardId: string; title: string; position: number; cards: Card[] };
export type Board = { id: string; title: string; lists: List[] };

const ENDPOINTS = {
  boards: '/boards',
  board:  (id: string)        => `/boards/${id}`,
  cards:  (id: string)        => `/cards/${id}`,
  move:   (cardId: string)    => `/cards/${cardId}/move`,
  dup:    (cardId: string)    => `/cards/${cardId}/duplicate`,
};

export const boardService = {
  /** Получить все доски текущего пользователя */
  async getBoards(): Promise<Board[]> {
    const { data } = await api.get<Board[]>(ENDPOINTS.boards);
    return data;
  },

  /** Создать доску */
  async createBoard(title: string): Promise<Board> {
    const { data } = await api.post<Board>(ENDPOINTS.boards, { title });
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
    await api.post(ENDPOINTS.move(cardId), { toListId, toPos });
    sendWS({ event: 'card_moved', data: { cardId, toListId, toPos } });
  },
};
