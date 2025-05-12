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
  createBoard: (name: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  createCard: (listId: string, title: string, description?: string) => Promise<void>;
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
      // Try to find board in the cache first, otherwise fetch it from the API
      let board = get().boards.find((b) => b.id === id);

      if (!board) {
        try {
          board = await boardService.getBoardById(id);
        } catch (error) {
          console.error("Failed to load board:", error);
          return;
        }
      }

      if (!board) return;

      set((s) => {
        s.active = board;
      });

      wsClient.connect(id);

      subscribeWS('card_created', (d) => get().applyWS({ event: 'card_created', data: d }));
      subscribeWS('card_moved', (d) => get().applyWS({ event: 'card_moved', data: d }));
      subscribeWS('list_created', (d) => get().applyWS({ event: 'list_created', data: d }));
    },

    async createBoard(name) {
      const board = await boardService.createBoard(name);
      set((s) => {
        s.boards.push(board);
      });
    },

    async createList(title) {
      const board = get().active;
      if (!board) return;

      // Calculate position for the new list (at the end)
      const position = board.lists.length > 0
        ? Math.max(...board.lists.map(list => list.position)) + 1
        : 1;

      const list = await boardService.createList(board.id, title, position);

      set((s) => {
        if (s.active) {
          s.active.lists.push(list);
        }
      });
    },

    async createCard(listId, title, description = '') {
      const board = get().active;
      if (!board) return;

      const list = board.lists.find((l: List) => l.id === listId);
      if (!list) return;

      // Calculate position for the new card (at the end)
      const position = list.cards.length > 0
        ? Math.max(...list.cards.map((card: Card) => card.position)) + 1
        : 1;

      const card = await boardService.createCard(listId, title, description, position);

      set((s) => {
        const list = s.active?.lists.find((l: List) => l.id === listId);
        if (list) list.cards.push(card);
      });
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
      await boardService.deleteCard(cardId);

      set((s) => {
        const board = s.active;
        if (!board) return;
        board.lists.forEach((l: List) => {
          const idx = l.cards.findIndex((c: Card) => c.id === cardId);
          if (idx !== -1) l.cards.splice(idx, 1);
        });
      });
    },

    /* ────────────── WebSocket incoming ───────────── */
    applyWS({ event, data }) {
      set((s) => {
        const board = s.active;
        if (!board) return;

        switch (event) {
          case 'card_created': {
            const card = data as Card;
            board.lists.find((l: List) => l.id === card.listId)?.cards.push(card);
            break;
          }
          case 'card_moved': {
            const { cardId, toListId, toPos } = data as {
              cardId: string;
              toListId: string;
              toPos: number;
            };
            const from = board.lists.find((l: List) => l.cards.some((c: Card) => c.id === cardId));
            const to = board.lists.find((l: List) => l.id === toListId);
            if (!from || !to) break;
            const idx = from.cards.findIndex((c: Card) => c.id === cardId);
            const [card] = from.cards.splice(idx, 1);
            card.listId = toListId;
            to.cards.splice(toPos - 1, 0, card);
            break;
          }
          case 'list_created': {
            board.lists.push(data as List);
            break;
          }
          case 'card_deleted': {
            const { cardId } = data as { cardId: string };
            board.lists.forEach((l: List) => {
              const idx = l.cards.findIndex((c: Card) => c.id === cardId);
              if (idx !== -1) l.cards.splice(idx, 1);
            });
            break;
          }
          case 'board_created':
          case 'board_updated': {
            // These events are handled at the board list level
            break;
          }
          // можно расширять другими событиями (list_moved …)
        }
      });
    },
  }))
);
