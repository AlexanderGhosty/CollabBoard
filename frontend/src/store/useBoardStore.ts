import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService, Card, List, Board } from '@/services/boardService';
import { wsClient, sendWS, subscribeWS, WSMessage } from '@/services/websocket';

interface BoardState {
  /** коллекция всех досок пользователя (лендинг) */
  boards: Board[];
  /** активная доска (открыта /board/:id) */
  active: Board | null;

  /** REST‑методы */
  fetchBoards: () => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  createCard: (listId: string, title: string) => Promise<void>;
  duplicateCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, toListId: string, toPos: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;

  /** обработка входящих WS‑ивентов */
  applyWS: (msg: WSMessage) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    boards: [],
    active: null,

    /* ───────────────── REST ───────────────── */
    async fetchBoards() {
      const boards = await boardService.getBoards();
      set((s) => {
        s.boards = boards;
      });
    },

    /** Загружаем доску и подключаем WebSocket‑канал */
    async loadBoard(id) {
      const board =
        get().boards.find((b) => b.id === id) ??
        (await boardService
          // временный обход до появления getBoardById
          .getBoards()
          .then((arr) => arr.find((b) => b.id === id)));

      if (!board) return;

      set((s) => {
        s.active = board;
      });

      wsClient.connect(id);

      subscribeWS('card_created', (d) => get().applyWS({ event: 'card_created', data: d }));
      subscribeWS('card_moved', (d) => get().applyWS({ event: 'card_moved', data: d }));
      subscribeWS('list_created', (d) => get().applyWS({ event: 'list_created', data: d }));
    },

    async createBoard(title) {
      const board = await boardService.createBoard(title);
      set((s) => {
        s.boards.push(board);
      });
    },

    async createList(title) {
      const board = get().active;
      if (!board) return;

      const { data: list } = await boardService
        // @ts-expect-error ручной POST, пока нет эндпоинта в boardService
        ._api.post<List>(`/boards/${board.id}/lists`, { title });

      set((s) => {
        board.lists.push(list);
      });
      sendWS({ event: 'list_created', data: list });
    },

    async createCard(listId, title) {
      const { data: card } = await boardService
        // @ts-expect-error ручной POST
        ._api.post<Card>(`/lists/${listId}/cards`, { title });

      set((s) => {
        const list = s.active?.lists.find((l) => l.id === listId);
        if (list) list.cards.push(card);
      });
      sendWS({ event: 'card_created', data: card });
    },

    async duplicateCard(cardId) {
      const card = await boardService.duplicateCard(cardId);
      set((s) => {
        const list = s.active?.lists.find((l) => l.id === card.listId);
        if (list) list.cards.push(card);
      });
    },

    async moveCard(cardId, toListId, toPos) {
      await boardService.moveCard(cardId, toListId, toPos);

      // optimistic‑update локально
      set((s) => {
        const board = s.active;
        if (!board) return;

        const from = board.lists.find((l) => l.cards.some((c) => c.id === cardId));
        const to = board.lists.find((l) => l.id === toListId);
        if (!from || !to) return;

        const idx = from.cards.findIndex((c) => c.id === cardId);
        const [card] = from.cards.splice(idx, 1);
        card.listId = toListId;
        to.cards.splice(toPos - 1, 0, card);
      });
    },

    async deleteCard(cardId) {
      await boardService
        // @ts-expect-error ручной DELETE
        ._api.delete(`/cards/${cardId}`);

      set((s) => {
        const board = s.active;
        if (!board) return;
        board.lists.forEach((l) => {
          const idx = l.cards.findIndex((c) => c.id === cardId);
          if (idx !== -1) l.cards.splice(idx, 1);
        });
      });
      sendWS({ event: 'card_deleted', data: { cardId } });
    },

    /* ────────────── WebSocket incoming ───────────── */
    applyWS({ event, data }) {
      set((s) => {
        const board = s.active;
        if (!board) return;

        switch (event) {
          case 'card_created': {
            const card = data as Card;
            board.lists.find((l) => l.id === card.listId)?.cards.push(card);
            break;
          }
          case 'card_moved': {
            const { cardId, toListId, toPos } = data as {
              cardId: string;
              toListId: string;
              toPos: number;
            };
            const from = board.lists.find((l) => l.cards.some((c) => c.id === cardId));
            const to = board.lists.find((l) => l.id === toListId);
            if (!from || !to) break;
            const idx = from.cards.findIndex((c) => c.id === cardId);
            const [card] = from.cards.splice(idx, 1);
            card.listId = toListId;
            to.cards.splice(toPos - 1, 0, card);
            break;
          }
          case 'list_created': {
            board.lists.push(data as List);
            break;
          }
          // можно расширять другими событиями (card_deleted, list_moved …)
        }
      });
    },
  }))
);
