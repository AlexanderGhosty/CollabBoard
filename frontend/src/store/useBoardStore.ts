import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService, Card, List, Board } from '@/services/boardService';
import { sendWS, subscribeWS, WSMessage } from '@/services/websocket';

interface BoardState {
  /* коллекция всех досок пользователя (лендинг) */
  boards: Board[];
  /* активная доска (открыта /board/:id) */
  active: Board | null;

  /* REST‑запросы -------------------------------------------------------------- */
  fetchBoards: () => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  createCard: (listId: string, title: string) => Promise<void>;
  duplicateCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, toListId: string, toPos: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;

  /* WebSocket ---------------------------------------------------------------- */
  applyWS: (msg: WSMessage) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    boards: [],
    active: null,

    /* ============ REST‐методы ============================================== */

    async fetchBoards() {
      const boards = await boardService.getBoards();
      set((s) => {
        s.boards = boards;
      });
    },

    async loadBoard(id) {
      /* получаем полную доску и подключаем WS */
      const { data } = await boardService.getBoards().then((arr) =>
        arr.find((b) => b.id === id)
          ? { data: arr.find((b) => b.id === id)! }
          : boardService // fallback на /boards/:id, если в коллекции нет
              // @ts-ignore – ручной GET (не реализован в boardService)
              ._getFullBoard(id),
      );

      set((s) => (s.active = data));

      /* подписываемся на сокет только один раз */
      subscribeWS('card_created', (data) => get().applyWS({ event: 'card_created', data }));
      subscribeWS('card_moved', (data) => get().applyWS({ event: 'card_moved', data }));
      subscribeWS('list_created', (data) => get().applyWS({ event: 'list_created', data }));
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
      const { data } = await boardService  // временно прямой вызов api
        // @ts-ignore – нет метода, обходимся ручным запросом
        ._api.post<List>(`/boards/${board.id}/lists`, { title });

      set((s) => board.lists.push(data));
      sendWS({ event: 'list_created', data });
    },

    async createCard(listId, title) {
      const { data } = await boardService
        // @ts-ignore – ручной POST
        ._api.post<Card>(`/lists/${listId}/cards`, { title });

      set((s) => {
        const list = s.active?.lists.find((l) => l.id === listId);
        if (list) list.cards.push(data);
      });
      sendWS({ event: 'card_created', data });
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
      /* локальный optimistic update */
      set((s) => {
        const board = s.active;
        if (!board) return;

        const fromList = board.lists.find((l) => l.cards.some((c) => c.id === cardId));
        const targetList = board.lists.find((l) => l.id === toListId);
        if (!fromList || !targetList) return;

        const idx = fromList.cards.findIndex((c) => c.id === cardId);
        const [card] = fromList.cards.splice(idx, 1);
        card.listId = toListId;
        targetList.cards.splice(toPos - 1, 0, card);
      });
    },

    async deleteCard(cardId) {
      await boardService
        // @ts-ignore – ручной DELETE
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

    /* ============ WebSocket ================================================ */

    applyWS({ event, data }) {
      set((s) => {
        const board = s.active;
        if (!board) return;

        switch (event) {
          case 'card_created': {
            const card = data as Card;
            const list = board.lists.find((l) => l.id === card.listId);
            if (list) list.cards.push(card);
            break;
          }
          case 'card_moved': {
            const { cardId, toListId, toPos } = data as {
              cardId: string;
              toListId: string;
              toPos: number;
            };
            const fromList = board.lists.find((l) => l.cards.some((c) => c.id === cardId));
            const targetList = board.lists.find((l) => l.id === toListId);
            if (!fromList || !targetList) break;

            const idx = fromList.cards.findIndex((c) => c.id === cardId);
            const [card] = fromList.cards.splice(idx, 1);
            card.listId = toListId;
            targetList.cards.splice(toPos - 1, 0, card);
            break;
          }
          case 'list_created': {
            const list = data as List;
            board.lists.push(list);
            break;
          }
        }
      });
    },
  })),
);
