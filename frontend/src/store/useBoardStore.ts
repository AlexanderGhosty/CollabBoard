import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService, Card, List, Board } from '@/services/boardService';
import { wsClient, sendWS, subscribeWS, WSMessage } from '@/services/websocket';
import { useToastStore } from '@/store/useToastStore';

interface BoardState {
  /** коллекция всех досок пользователя (лендинг) */
  boards: Board[];
  /** активная доска (открыта /board/:id) */
  active: Board | null;
  /** флаг, указывающий, что модальное окно карточки открыто */
  isCardModalOpen: boolean;

  /** REST‑методы */
  fetchBoards: () => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (name: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  updateBoardName: (boardId: string, name: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  updateList: (listId: string, title: string) => Promise<void>;
  moveList: (listId: string, position: number) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  createCard: (listId: string, title: string, description?: string) => Promise<void>;
  updateCard: (cardId: string, updates: { title?: string; description?: string }) => Promise<void>;
  duplicateCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, toListId: string, toPos: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;

  /** методы управления состоянием модального окна */
  setCardModalOpen: (isOpen: boolean) => void;

  /** обработка входящих WS‑ивентов */
  applyWS: (msg: WSMessage) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    boards: [],
    active: null,
    isCardModalOpen: false,

    setCardModalOpen(isOpen) {
      set((s) => {
        s.isCardModalOpen = isOpen;
      });
    },

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

      console.log(`Loading board with ID: ${id}`);

      try {
        // Always fetch the board from the API to ensure we have the latest data
        // This is important for data persistence between page refreshes
        const board = await boardService.getBoardById(id);

        console.log("Loaded board data:", board);

        // Ensure the board has a valid ID
        if (!board || !board.id) {
          console.error("Board loaded without a valid ID:", board);
          return;
        }

        // Sort lists by position
        if (board.lists) {
          board.lists.sort((a: List, b: List) => a.position - b.position);

          // Sort cards within each list by position
          board.lists.forEach((list: List) => {
            if (list.cards) {
              list.cards.sort((a: Card, b: Card) => a.position - b.position);
            }
          });
        }

        // Update the store with the loaded board
        set((s) => {
          s.active = board;

          // Also update the board in the boards array if it exists
          const boardIndex = s.boards.findIndex((b) => b.id === id);
          if (boardIndex !== -1) {
            s.boards[boardIndex] = board;
          } else {
            // Add the board to the boards array if it doesn't exist
            s.boards.push(board);
          }
        });

        // Connect to WebSocket for real-time updates
        wsClient.connect(id);

        // Subscribe to WebSocket events
        subscribeWS('card_created', (d: any) => get().applyWS({ event: 'card_created', data: d }));
        subscribeWS('card_updated', (d: any) => get().applyWS({ event: 'card_updated', data: d }));
        subscribeWS('card_moved', (d: any) => get().applyWS({ event: 'card_moved', data: d }));
        subscribeWS('card_deleted', (d: any) => get().applyWS({ event: 'card_deleted', data: d }));
        subscribeWS('list_created', (d: any) => get().applyWS({ event: 'list_created', data: d }));
        subscribeWS('list_updated', (d: any) => get().applyWS({ event: 'list_updated', data: d }));
        subscribeWS('list_moved', (d: any) => get().applyWS({ event: 'list_moved', data: d }));
        subscribeWS('list_deleted', (d: any) => get().applyWS({ event: 'list_deleted', data: d }));
        subscribeWS('board_created', (d: any) => get().applyWS({ event: 'board_created', data: d }));
        subscribeWS('board_updated', (d: any) => get().applyWS({ event: 'board_updated', data: d }));
        subscribeWS('board_deleted', (d: any) => get().applyWS({ event: 'board_deleted', data: d }));

        console.log(`Board ${id} loaded successfully with ${board.lists.length} lists`);
      } catch (error) {
        console.error("Failed to load board:", error);
      }
    },

    async createBoard(name) {
      const board = await boardService.createBoard(name);
      console.log("Board created successfully:", board);

      // Update the boards array with the new board
      set((s) => {
        // Check if the board already exists to prevent duplicates
        const boardExists = s.boards.some(b => b.id === board.id);
        if (!boardExists) {
          s.boards.push(board);
          console.log(`Added board ${board.id} with name "${board.name}" to boards list`);
        } else {
          console.log(`Board ${board.id} already exists, not adding duplicate`);
        }
      });
    },

    async deleteBoard(boardId) {
      try {
        console.log(`Deleting board ${boardId}`);
        await boardService.deleteBoard(boardId);

        // Update the boards array by removing the deleted board
        set((s) => {
          const boardIndex = s.boards.findIndex(b => b.id === boardId);
          if (boardIndex !== -1) {
            s.boards.splice(boardIndex, 1);
            console.log(`Removed board ${boardId} from boards list`);
          }

          // If the active board is the one being deleted, set active to null
          if (s.active && s.active.id === boardId) {
            s.active = null;
            console.log(`Cleared active board as it was deleted`);
          }
        });

        // Show success toast
        useToastStore.getState().success("Доска успешно удалена");
      } catch (error) {
        console.error(`Error deleting board ${boardId}:`, error);

        // Show error toast
        useToastStore.getState().error("Не удалось удалить доску. Пожалуйста, попробуйте снова.");
      }
    },

    async updateBoardName(boardId, name) {
      const board = get().active;
      if (!board || board.id !== boardId) {
        console.error(`Cannot update board name: active board is null or doesn't match boardId ${boardId}`);
        return;
      }

      try {
        // Store the original name for rollback if needed
        const originalName = board.name;

        // Optimistic update locally
        set((s) => {
          if (s.active && s.active.id === boardId) {
            s.active.name = name;
            console.log(`Optimistically updated board ${boardId} name to "${name}"`);
          }

          // Also update the board in the boards array if it exists
          const boardIndex = s.boards.findIndex(b => b.id === boardId);
          if (boardIndex !== -1) {
            s.boards[boardIndex].name = name;
          }
        });

        // Call the API to update the board
        const updatedBoard = await boardService.updateBoard(boardId, name);
        console.log(`Board ${boardId} updated successfully:`, updatedBoard);

        // Show success toast
        useToastStore.getState().success("Название доски обновлено");
      } catch (error) {
        console.error(`Error updating board ${boardId} name:`, error);

        // Revert the optimistic update on error
        set((s) => {
          if (s.active && s.active.id === boardId) {
            s.active.name = board.name;
            console.log(`Reverted optimistic update for board ${boardId}`);
          }

          // Also revert in the boards array
          const boardIndex = s.boards.findIndex(b => b.id === boardId);
          if (boardIndex !== -1) {
            s.boards[boardIndex].name = board.name;
          }
        });

        // Show error toast
        useToastStore.getState().error("Не удалось обновить название доски. Пожалуйста, попробуйте снова.");
        throw error;
      }
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

    async updateList(listId, title) {
      const board = get().active;
      if (!board) return;

      try {
        // Find the list to update
        const list = board.lists.find((l: List) => l.id === listId);
        if (!list) {
          console.error(`List with ID ${listId} not found in board ${board.id}`);
          return;
        }

        // Optimistic update locally
        set((s) => {
          if (!s.active) return;

          const listToUpdate = s.active.lists.find((l: List) => l.id === listId);
          if (listToUpdate) {
            listToUpdate.title = title;
            console.log(`Optimistically updated list ${listId} title to "${title}"`);
          }
        });

        // Call the API to update the list
        const updatedList = await boardService.updateList(listId, title);
        console.log(`List ${listId} updated successfully:`, updatedList);
      } catch (error) {
        console.error(`Error updating list ${listId}:`, error);

        // Revert the optimistic update on error
        set((s) => {
          if (!s.active) return;

          const list = board.lists.find((l: List) => l.id === listId);
          if (list) {
            const listToRevert = s.active.lists.find((l: List) => l.id === listId);
            if (listToRevert) {
              listToRevert.title = list.title;
              console.log(`Reverted optimistic update for list ${listId}`);
            }
          }
        });

        throw error;
      }
    },

    async moveList(listId, position) {
      const board = get().active;
      if (!board) return;

      try {
        console.log(`Moving list ${listId} to position ${position}`);

        // Find the list to move
        const listIndex = board.lists.findIndex((l: List) => l.id === listId);
        if (listIndex === -1) {
          console.error(`List with ID ${listId} not found in board ${board.id}`);
          useToastStore.getState().error(`List not found. Please refresh the page and try again.`);
          return;
        }

        // Get the list title for better error messages
        const listTitle = board.lists[listIndex].title;

        // Store the original lists state for rollback if needed
        const originalLists = JSON.parse(JSON.stringify(board.lists));

        // Perform optimistic update
        set((s) => {
          if (!s.active) return;

          // Get the list to move
          const list = s.active.lists.find((l: List) => l.id === listId);
          if (!list) return;

          const oldPosition = list.position;
          console.log(`Optimistically moving list ${listId} from position ${oldPosition} to ${position}`);

          // Update the position of the moved list
          list.position = position;

          // Update positions of other lists
          s.active.lists.forEach((l: List) => {
            // If moving forward (e.g., from pos 2 to pos 4)
            if (oldPosition < position) {
              if (l.id !== listId && l.position > oldPosition && l.position <= position) {
                l.position--;
              }
            }
            // If moving backward (e.g., from pos 4 to pos 2)
            else if (oldPosition > position) {
              if (l.id !== listId && l.position >= position && l.position < oldPosition) {
                l.position++;
              }
            }
          });

          // Sort lists by position
          s.active.lists.sort((a: List, b: List) => a.position - b.position);

          console.log("Lists after optimistic update:",
            s.active.lists.map(l => ({ id: l.id, position: l.position })));
        });

        // Call the API to persist the change
        await boardService.moveList(listId, position);
        console.log(`List ${listId} moved to position ${position} successfully`);

        // Show success toast
        useToastStore.getState().success(`List "${listTitle}" moved successfully`);
      } catch (error) {
        console.error(`Error moving list ${listId}:`, error);

        // Determine the specific error message based on the error
        let errorMessage = "Failed to move list. Please try again.";

        if (error instanceof Error) {
          if (error.message.includes("not a member")) {
            errorMessage = "You don't have permission to move this list.";
          } else if (error.message.includes("position conflict")) {
            errorMessage = "Position conflict detected. The list order will be fixed automatically.";
          } else if (error.message.includes("network")) {
            errorMessage = "Network error. Please check your connection and try again.";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Request timed out. The server might be busy, please try again.";
          }
        }

        // Show error toast
        useToastStore.getState().error(errorMessage);

        // Revert the optimistic update on error
        set((s) => {
          if (!s.active) return;

          // Restore the original lists state
          s.active.lists = JSON.parse(JSON.stringify(originalLists));
          console.log("Reverted optimistic update due to error");
        });
      }
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

    async updateCard(cardId, updates) {
      const board = get().active;
      if (!board) return;

      // Find the list that contains the card
      const list = board.lists.find((l: List) => l.cards.some((c: Card) => c.id === cardId));
      if (!list) {
        console.error(`Could not find list containing card ${cardId}`);
        return;
      }

      try {
        const updatedCard = await boardService.updateCard(cardId, list.id, updates);

        // Update the card in the store
        set((s) => {
          if (!s.active) return;

          // Find the list that contains the card
          const listToUpdate = s.active.lists.find((l: List) => l.id === list.id);
          if (!listToUpdate) return;

          // Find the card index
          const cardIndex = listToUpdate.cards.findIndex((c: Card) => c.id === cardId);
          if (cardIndex === -1) return;

          // Update the card
          listToUpdate.cards[cardIndex] = {
            ...listToUpdate.cards[cardIndex],
            ...updatedCard
          };

          console.log(`Updated card ${cardId} in list ${list.id}`);
        });
      } catch (error) {
        console.error(`Error updating card ${cardId}:`, error);
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

    async deleteList(listId) {
      const board = get().active;
      if (!board) return;

      try {
        await boardService.deleteList(listId);

        // Update the UI after successful deletion
        set((s) => {
          if (!s.active) return;

          const listIndex = s.active.lists.findIndex((l: List) => l.id === listId);
          if (listIndex !== -1) {
            console.log(`Removing list ${listId} from board ${s.active.id}`);
            s.active.lists.splice(listIndex, 1);
          }
        });
      } catch (error) {
        console.error(`Error deleting list ${listId}:`, error);
      }
    },

    async deleteCard(cardId) {
      const board = get().active;
      if (!board) return;

      // Find the list that contains the card
      const list = board.lists.find((l: List) => l.cards.some((c: Card) => c.id === cardId));
      if (!list) {
        console.error(`Could not find list containing card ${cardId}`);
        return;
      }

      try {
        await boardService.deleteCard(cardId, list.id);

        // Update the UI after successful deletion
        set((s) => {
          if (!s.active) return;

          s.active.lists.forEach((l: List) => {
            const idx = l.cards.findIndex((c: Card) => c.id === cardId);
            if (idx !== -1) {
              console.log(`Removing card ${cardId} from list ${l.id}`);
              l.cards.splice(idx, 1);
            }
          });
        });
      } catch (error) {
        console.error(`Error deleting card ${cardId}:`, error);
      }
    },

    /* ────────────── WebSocket incoming ───────────── */
    applyWS({ event, data }) {
      set((s) => {
        const board = s.active;
        if (!board) return;

        switch (event) {
          case 'card_created': {
            // Handle the raw data from the backend which might have uppercase property names
            // and pgtype.Text structure for description
            const rawData = data as any;

            // Extract the required fields with fallbacks for different formats
            const cardId = String(rawData.ID || rawData.id || '');
            const listId = String(rawData.ListID || rawData.listId || '');

            // Log the raw data for debugging
            console.log("Received card_created event with data:", rawData);

            if (!cardId || !listId) {
              console.error("Received card_created event with missing ID or listId:", rawData);
              break;
            }

            // Find the list for this card
            const list = board.lists.find((l: List) => l.id === listId);
            if (!list) {
              console.error(`Could not find list ${listId} for new card ${cardId}`);
              break;
            }

            // Create a normalized card object with proper property handling
            const normalizedCard: Card = {
              id: cardId,
              listId: listId,
              title: rawData.Title || rawData.title || '',
              // Handle the description field which could be a string or a pgtype.Text structure
              description: typeof rawData.Description === 'string'
                ? rawData.Description
                : (rawData.Description?.String !== undefined
                  ? rawData.Description.String
                  : (rawData.description || '')),
              position: rawData.Position || rawData.position || 0
            };

            // Check if a card with this ID already exists to prevent duplicates
            const cardExists = list.cards.some(c => c.id === cardId);
            if (!cardExists) {
              list.cards.push(normalizedCard);
              console.log(`Added new card ${cardId} to list ${listId}`);
            } else {
              console.log(`Card ${cardId} already exists in list ${listId}, skipping`);
            }
            break;
          }
          case 'card_moved': {
            // Handle both formats:
            // 1. { cardId, toListId, toPos } from frontend-initiated moves
            // 2. { ID, ListID, Position } from backend-initiated moves
            const rawData = data as any;

            // Extract card ID (handle both formats)
            const cardId = String(rawData.cardId || rawData.ID || '');

            // Extract destination list ID (handle both formats)
            const toListId = String(rawData.toListId || rawData.ListID || '');

            // Extract new position (handle both formats)
            const toPos = rawData.toPos || rawData.Position || 0;

            console.log(`WebSocket card_moved: Card ${cardId} to list ${toListId} at position ${toPos}`);

            if (!cardId || !toListId) {
              console.error("Received card_moved event with missing data:", rawData);
              break;
            }

            // Find source list (the list that currently contains the card)
            const from = board.lists.find((l: List) => l.cards.some((c: Card) => c.id === cardId));

            // Find destination list
            const to = board.lists.find((l: List) => l.id === toListId);

            if (!from || !to) {
              console.error(`Could not find source or destination list for card ${cardId}`);
              break;
            }

            // Find the card in the source list
            const idx = from.cards.findIndex((c: Card) => c.id === cardId);
            if (idx === -1) {
              console.error(`Could not find card ${cardId} in source list ${from.id}`);
              break;
            }

            // Remove the card from the source list
            const [card] = from.cards.splice(idx, 1);

            // Update the card's list ID
            card.listId = toListId;

            // Insert the card at the new position in the destination list
            to.cards.splice(toPos - 1, 0, card);

            console.log(`Card ${cardId} moved from list ${from.id} to list ${to.id} at position ${toPos}`);
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
          case 'list_updated': {
            const rawList = data as any;

            // Map uppercase property names from backend to lowercase expected by frontend
            const listId = String(rawList.ID || rawList.id || '');
            const title = rawList.Title || rawList.title || '';

            if (!listId) {
              console.error("Received updated list without ID via WebSocket:", rawList);
              break;
            }

            // Find and update the list with the new title
            const listIndex = board.lists.findIndex((l: List) => l.id === listId);
            if (listIndex !== -1) {
              console.log(`Updating title of list ${listId} to "${title}"`);
              board.lists[listIndex].title = title;
            } else {
              console.log(`List with ID ${listId} not found, cannot update title`);
            }
            break;
          }
          case 'list_moved': {
            const rawList = data as any;

            // Map uppercase property names from backend to lowercase expected by frontend
            const listId = String(rawList.ID || rawList.id || '');
            const position = rawList.Position || rawList.position || 0;
            const title = rawList.Title || rawList.title || '';
            const boardId = String(rawList.BoardID || rawList.boardId || rawList.board_id || '');

            if (!listId) {
              console.error("Received moved list without ID via WebSocket:", rawList);
              break;
            }

            console.log("Received list_moved event:", rawList);

            // Check if this is a WebSocket event for a change we initiated
            // If it's our own change, we've already updated the UI optimistically
            const isOwnChange = board.lists.some(l => l.id === listId && l.position === position);
            if (isOwnChange) {
              console.log(`Ignoring list_moved event for list ${listId} as it matches our local state`);
              break;
            }

            // Update the list position directly without reloading the board
            const listIndex = board.lists.findIndex((l: List) => l.id === listId);
            if (listIndex !== -1) {
              console.log(`Updating list ${listId}: position=${position}, title="${title}"`);

              // Get the current position before updating
              const oldPosition = board.lists[listIndex].position;

              // Preserve the existing title if the incoming title is empty
              if (title) {
                board.lists[listIndex].title = title;
              }

              // Update positions of all affected lists
              board.lists.forEach((l: List) => {
                // If moving forward (e.g., from pos 2 to pos 4)
                if (oldPosition < position) {
                  if (l.id !== listId && l.position > oldPosition && l.position <= position) {
                    l.position--;
                  }
                }
                // If moving backward (e.g., from pos 4 to pos 2)
                else if (oldPosition > position) {
                  if (l.id !== listId && l.position >= position && l.position < oldPosition) {
                    l.position++;
                  }
                }
              });

              // Update the moved list's position
              board.lists[listIndex].position = position;

              // Sort lists by position
              board.lists.sort((a: List, b: List) => a.position - b.position);

              console.log("Lists after WebSocket update:",
                board.lists.map(l => ({ id: l.id, position: l.position })));
            } else {
              console.log(`List with ID ${listId} not found, cannot update position`);
            }
            break;
          }
          case 'card_updated': {
            // Handle the raw data from the backend which might have uppercase property names
            // and pgtype.Text structure for description
            const rawData = data as any;

            // Extract the required fields with fallbacks for different formats
            const cardId = String(rawData.ID || rawData.id || '');
            const listId = String(rawData.ListID || rawData.listId || '');

            // Log the raw data for debugging
            console.log("Received card_updated event with data:", rawData);

            if (!cardId || !listId) {
              console.error("Received card_updated event with missing ID or listId:", rawData);
              break;
            }

            // Find the list containing the card
            const list = board.lists.find((l: List) => l.id === listId);
            if (!list) {
              console.error(`Could not find list ${listId} for updated card ${cardId}`);
              break;
            }

            // Find the card index
            const cardIndex = list.cards.findIndex((c: Card) => c.id === cardId);
            if (cardIndex === -1) {
              console.error(`Could not find card ${cardId} in list ${list.id}`);
              break;
            }

            // Create a normalized card object with proper property handling
            const normalizedCard: Card = {
              id: cardId,
              listId: listId,
              title: rawData.Title || rawData.title || list.cards[cardIndex].title,
              // Handle the description field which could be a string or a pgtype.Text structure
              description: typeof rawData.Description === 'string'
                ? rawData.Description
                : (rawData.Description?.String !== undefined
                  ? rawData.Description.String
                  : (rawData.description || list.cards[cardIndex].description || '')),
              position: rawData.Position || rawData.position || list.cards[cardIndex].position
            };

            // Update the card
            list.cards[cardIndex] = {
              ...list.cards[cardIndex],
              ...normalizedCard
            };

            console.log(`Updated card ${cardId} in list ${list.id} via WebSocket with:`, normalizedCard);
            break;
          }

          case 'card_deleted': {
            // Handle both formats: { cardId } or { id }
            const cardId = (data as any).cardId || (data as any).id;
            if (!cardId) {
              console.error("Received card_deleted event without cardId:", data);
              break;
            }

            board.lists.forEach((l: List) => {
              const idx = l.cards.findIndex((c: Card) => c.id === String(cardId));
              if (idx !== -1) {
                console.log(`Removing card ${cardId} from list ${l.id} via WebSocket`);
                l.cards.splice(idx, 1);
              }
            });
            break;
          }
          case 'list_deleted': {
            // Handle both formats: { listId } or { id }
            const listId = (data as any).listId || (data as any).id;
            if (!listId) {
              console.error("Received list_deleted event without listId:", data);
              break;
            }

            const listIndex = board.lists.findIndex((l: List) => l.id === String(listId));
            if (listIndex !== -1) {
              console.log(`Removing list ${listId} from board ${board.id} via WebSocket`);
              board.lists.splice(listIndex, 1);
            }
            break;
          }
          case 'board_created': {
            // Handle board_created event
            const rawData = data as any;

            // Extract and normalize the board data
            const boardId = String(rawData.ID || rawData.id || '');
            const boardName = rawData.Name || rawData.name || '';
            const ownerId = rawData.OwnerID ? String(rawData.OwnerID) :
                           (rawData.ownerId ? String(rawData.ownerId) : undefined);

            console.log("Received board_created event with data:", rawData);

            if (!boardId || !boardName) {
              console.error("Received board_created event with missing ID or name:", rawData);
              break;
            }

            // Update the boards array with the new board
            const normalizedBoard = {
              id: boardId,
              name: boardName,
              ownerId: ownerId,
              lists: rawData.lists || []
            };

            // Check if this board is already in the boards array
            const boardExists = s.boards.some(b => b.id === boardId);
            if (!boardExists) {
              s.boards.push(normalizedBoard);
              console.log(`Added board ${boardId} with name "${boardName}" to boards list via WebSocket`);
            } else {
              // Update the existing board
              const boardIndex = s.boards.findIndex(b => b.id === boardId);
              if (boardIndex !== -1) {
                s.boards[boardIndex] = {
                  ...s.boards[boardIndex],
                  ...normalizedBoard
                };
                console.log(`Updated board ${boardId} in boards list via WebSocket`);
              }
            }
            break;
          }

          case 'board_updated': {
            // Handle board_updated event
            const rawData = data as any;

            // Extract and normalize the board data
            const boardId = String(rawData.ID || rawData.id || '');
            const boardName = rawData.Name || rawData.name || '';

            console.log("Received board_updated event with data:", rawData);

            if (!boardId) {
              console.error("Received board_updated event with missing ID:", rawData);
              break;
            }

            // Update the board in the boards array
            const boardIndex = s.boards.findIndex(b => b.id === boardId);
            if (boardIndex !== -1) {
              s.boards[boardIndex] = {
                ...s.boards[boardIndex],
                name: boardName || s.boards[boardIndex].name
              };
              console.log(`Updated board ${boardId} name to "${boardName}" in boards list via WebSocket`);
            }

            // If this is the active board, update it too
            if (board.id === boardId) {
              board.name = boardName || board.name;
              console.log(`Updated active board name to "${boardName}" via WebSocket`);
            }
            break;
          }

          case 'board_deleted': {
            // Handle board_deleted event
            const rawData = data as any;

            // Extract the board ID (handle both formats: { id } or { ID })
            const boardId = String(rawData.id || rawData.ID || '');

            console.log("Received board_deleted event with data:", rawData);

            if (!boardId) {
              console.error("Received board_deleted event with missing ID:", rawData);
              break;
            }

            // Remove the board from the boards array
            const boardIndex = s.boards.findIndex(b => b.id === boardId);
            if (boardIndex !== -1) {
              s.boards.splice(boardIndex, 1);
              console.log(`Removed board ${boardId} from boards list via WebSocket`);
            }

            // If this is the active board, clear it and show a toast notification
            if (board.id === boardId) {
              s.active = null;
              console.log(`Cleared active board as it was deleted via WebSocket`);

              // Show a toast notification
              useToastStore.getState().info("Эта доска была удалена");
            }
            break;
          }
          // можно расширять другими событиями
        }
      });
    },
  }))
);
