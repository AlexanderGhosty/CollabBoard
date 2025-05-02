import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { api } from '@/services/api';
import { sendWS } from '@/services/websocket';   // обёртка над native WS (подписка/посылка)

type Card   = { id: string; listId: string; title: string; position: number };
type List   = { id: string; boardId: string; title: string; position: number; cards: Card[] };
type Board  = { id: string; title: string; lists: List[] };

interface BoardState {
  boards: Board[];
  active: Board | null;
  fetchBoards: () => Promise<void>;
  moveCard: (cardId: string, toListId: string, toPos: number) => Promise<void>;
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    boards: [],
    active: null,

    async fetchBoards() {
      const { data } = await api.get<Board[]>('/boards');
      set(state => { state.boards = data; });
    },

    async moveCard(cardId, toListId, toPos) {
      await api.put(`/cards/${cardId}/move`, { toListId, toPos });

      // локально обновляем состояние
      set(state => {
        const board = state.active;
        if (!board) return;

        // вынуть карточку
        const fromList = board.lists.find(l => l.cards.some(c => c.id === cardId));
        if (!fromList) return;
        const cardIdx = fromList.cards.findIndex(c => c.id === cardId);
        const [card] = fromList.cards.splice(cardIdx, 1);

        // вставить в новую позицию
        card.listId = toListId;
        const targetList = board.lists.find(l => l.id === toListId);
        if (!targetList) return;
        targetList.cards.splice(toPos - 1, 0, card);
      });

      // WebSocket‑событие (правило 3)
      sendWS({ event: 'card_moved', data: { cardId, toListId, toPos } });
    },
  })),
);
