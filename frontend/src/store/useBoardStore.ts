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
  moveList: (listId: string, position: number) => Promise<void>;
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
      try {
        const boards = await boardService.getBoards();
        set((s) => {
          s.boards = boards || [];
        });
      } catch (error) {
        console.error("Failed to fetch boards:", error);
        set((s) => {
          s.boards = [];
        });
      }
    },

    /** Загружаем доску и подключаем WebSocket‑канал */
    async loadBoard(id) {
      // Validate the board ID
      if (!id) {
        console.error("Attempted to load board with undefined ID");
        return;
      }

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

      // Ensure the board has a valid ID
      if (!board.id) {
        console.error("Board loaded without a valid ID:", board);
        return;
      }

      set((s) => {
        s.active = board;
      });

      wsClient.connect(id);

      subscribeWS('card_created', (d: any) => get().applyWS({ event: 'card_created', data: d }));
      subscribeWS('card_moved', (d: any) => get().applyWS({ event: 'card_moved', data: d }));
      subscribeWS('list_created', (d: any) => get().applyWS({ event: 'list_created', data: d }));
      subscribeWS('list_moved', (d: any) => get().applyWS({ event: 'list_moved', data: d }));
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
        ? Math.max(...board.lists.map((list: List) => list.position)) + 1
        : 1;

      const list = await boardService.createList(board.id, title, position);
      console.log("List created via API:", list);

      // Ensure the list has a cards array and valid ID
      if (!list.cards) {
        list.cards = [];
      }

      // Validate that the list has an ID
      if (!list.id) {
        console.error("Created list without ID:", list);
        return;
      }

      set((s) => {
        if (s.active) {
          // Check if a list with this ID already exists (extra safety check)
          const listExists = s.active.lists.some(l => l.id === list.id);
          if (!listExists) {
            s.active.lists.push(list);
            console.log(`Added new list ${list.id} to board ${board.id} from API response`);
          } else {
            console.log(`List ${list.id} already exists in board ${board.id}, not adding duplicate`);
          }
        }
      });
    },

    async moveList(listId, position) {
      const board = get().active;
      if (!board) return;

      await boardService.moveList(listId, position);

      // Optimistic update locally
      set((s) => {
        if (!s.active) return;

        // Find the list to move
        const listIndex = s.active.lists.findIndex((l: List) => l.id === listId);
        if (listIndex === -1) return;

        // Get the list
        const [list] = s.active.lists.splice(listIndex, 1);

        // Update its position
        list.position = position;

        // Re-insert at the correct position based on the new position value
        const insertIndex = s.active.lists.findIndex((l: List) => l.position > position);
        if (insertIndex === -1) {
          // If no list has a higher position, add to the end
          s.active.lists.push(list);
        } else {
          // Otherwise insert at the correct position
          s.active.lists.splice(insertIndex, 0, list);
        }
      });
    },

    async createCard(listId, title, description = '') {
      const board = get().active;
      if (!board) return;

      console.log(`Looking for list with ID: ${listId} in board lists:`, board.lists);

      // Find the list by ID, handling both string and number comparisons
      const list = board.lists.find((l: List) =>
        l.id === listId ||
        String(l.id) === String(listId) ||
        (l.id && parseInt(l.id) === parseInt(listId))
      );

      if (!list) {
        console.error(`List with ID ${listId} not found in board ${board.id}`);
        return;
      }

      console.log(`Found list:`, list);

      // Calculate position for the new card (at the end)
      const position = list.cards.length > 0
        ? Math.max(...list.cards.map((card: Card) => card.position)) + 1
        : 1;

      try {
        // Ensure listId is passed as a string
        const card = await boardService.createCard(String(list.id), title, description, position);
        console.log(`Card created successfully:`, card);

        set((s) => {
          if (!s.active) return;

          // Find the list again using the same flexible matching
          const updatedList = s.active.lists.find((l: List) =>
            l.id === listId ||
            String(l.id) === String(listId) ||
            (l.id && parseInt(l.id) === parseInt(listId))
          );

          if (updatedList) {
            // Check if card already exists to prevent duplicates
            const cardExists = updatedList.cards.some(c => c.id === card.id);
            if (!cardExists) {
              updatedList.cards.push(card);
              console.log(`Added card ${card.id} to list ${updatedList.id}`);
            } else {
              console.log(`Card ${card.id} already exists in list ${updatedList.id}, not adding duplicate`);
            }
          }
        });
      } catch (error) {
        console.error(`Error creating card in list ${listId}:`, error);
      }
    },

    async duplicateCard(cardId) {
      const card = await boardService.duplicateCard(cardId);
      set((s) => {
        const list = s.active?.lists.find((l: List) => l.id === card.listId);
        if (list) list.cards.push(card);
      });
    },

    async moveCard(cardId, toListId, toPos) {
      await boardService.moveCard(cardId, toListId, toPos);

      // optimistic‑update локально
      set((s) => {
        const board = s.active;
        if (!board) return;

        const from = board.lists.find((l: List) => l.cards.some((c: Card) => c.id === cardId));
        const to = board.lists.find((l: List) => l.id === toListId);
        if (!from || !to) return;

        const idx = from.cards.findIndex((c: Card) => c.id === cardId);
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
            const list = board.lists.find((l: List) => l.id === card.listId);

            if (list) {
              // Check if a card with this ID already exists to prevent duplicates
              const cardExists = list.cards.some(c => c.id === card.id);
              if (!cardExists) {
                list.cards.push(card);
                console.log(`Added new card ${card.id} to list ${card.listId}`);
              } else {
                console.log(`Card ${card.id} already exists in list ${card.listId}, skipping`);
              }
            }
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
            const rawList = data as any;

            // Map uppercase property names from backend to lowercase expected by frontend
            const newList: List = {
              // Use ID, id, or generate a fallback
              id: String(rawList.ID || rawList.id || Date.now()),
              // Use BoardID, boardId, or active board's id
              boardId: String(rawList.BoardID || rawList.boardId || rawList.board_id || board.id),
              // Use Title, title
              title: rawList.Title || rawList.title || '',
              // Use Position, position
              position: rawList.Position || rawList.position || 0,
              // Initialize empty cards array
              cards: []
            };

            console.log("Mapped list from WebSocket:", newList);

            // Check if a list with this ID already exists to prevent duplicates
            const listExists = board.lists.some(list => list.id === newList.id);
            if (!listExists) {
              board.lists.push(newList);
              console.log("Added new list from WebSocket event");
            } else {
              console.log("List already exists, skipping WebSocket event");
            }
            break;
          }
          case 'list_moved': {
            const rawList = data as any;

            // Map uppercase property names from backend to lowercase expected by frontend
            const listId = String(rawList.ID || rawList.id || '');
            const position = rawList.Position || rawList.position || 0;

            if (!listId) {
              console.error("Received moved list without ID via WebSocket:", rawList);
              break;
            }

            // Find and update the list with the new position
            const listIndex = board.lists.findIndex((l: List) => l.id === listId);
            if (listIndex !== -1) {
              console.log(`Updating position of list ${listId} to ${position}`);
              board.lists[listIndex].position = position;
              // Sort lists by position
              board.lists.sort((a: List, b: List) => a.position - b.position);
            } else {
              console.log(`List with ID ${listId} not found, cannot update position`);
            }
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
