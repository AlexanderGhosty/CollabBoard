import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService, Card, List, Board } from '@/services/boardService';
import { wsClient, sendWS, subscribeWS, WSMessage } from '@/services/websocket';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';

interface BoardState {
  /** коллекция всех досок пользователя (лендинг) */
  boards: Board[];
  /** доски, где пользователь является владельцем */
  ownedBoards: Board[];
  /** доски, где пользователь является участником */
  memberBoards: Board[];
  /** активная доска (открыта /board/:id) */
  active: Board | null;
  /** участники активной доски */
  boardMembers: any[];
  /** флаг, указывающий, что модальное окно карточки открыто */
  isCardModalOpen: boolean;
  /** флаг, указывающий, что модальное окно управления участниками открыто */
  isMemberModalOpen: boolean;

  /** REST‑методы */
  fetchBoards: () => Promise<void>;
  fetchBoardsByRole: () => Promise<void>;
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

  /** методы управления участниками */
  fetchBoardMembers: (boardId?: string) => Promise<void>;
  inviteMember: (email: string, role?: 'owner' | 'member') => Promise<void>;
  removeMember: (userId: string) => Promise<void>;

  /** методы управления состоянием модальных окон */
  setCardModalOpen: (isOpen: boolean) => void;
  setMemberModalOpen: (isOpen: boolean) => void;

  /** обработка входящих WS‑ивентов */
  applyWS: (msg: WSMessage) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    boards: [],
    ownedBoards: [],
    memberBoards: [],
    active: null,
    boardMembers: [],
    isCardModalOpen: false,
    isMemberModalOpen: false,

    setCardModalOpen(isOpen) {
      set((s) => {
        s.isCardModalOpen = isOpen;
      });
    },

    setMemberModalOpen(isOpen) {
      set((s) => {
        s.isMemberModalOpen = isOpen;
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

    async fetchBoardsByRole() {
      try {
        // Fetch boards where user is owner
        const ownedBoards = await boardService.getBoardsByRole('owner');
        // Fetch boards where user is member
        const memberBoards = await boardService.getBoardsByRole('member');

        // Log the results for debugging
        console.log("Fetched owned boards:", ownedBoards);
        console.log("Fetched member boards:", memberBoards);

        set((s) => {
          // Ensure we always set arrays, even if the API returns null
          s.ownedBoards = Array.isArray(ownedBoards) ? ownedBoards : [];
          s.memberBoards = Array.isArray(memberBoards) ? memberBoards : [];

          // Also update the combined boards list
          s.boards = [
            ...s.ownedBoards,
            ...s.memberBoards
          ];

          console.log("Updated store with boards:", {
            ownedBoards: s.ownedBoards.length,
            memberBoards: s.memberBoards.length,
            totalBoards: s.boards.length
          });
        });
      } catch (error) {
        console.error("Failed to fetch boards by role:", error);
        set((s) => {
          s.ownedBoards = [];
          s.memberBoards = [];
          s.boards = [];
          s.loading = false;
          s.error = `Failed to fetch boards: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось загрузить список досок");
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

        // Fetch board members after loading the board
        get().fetchBoardMembers(id);

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
        subscribeWS('member_added', (d: any) => get().applyWS({ event: 'member_added', data: d }));
        subscribeWS('member_removed', (d: any) => get().applyWS({ event: 'member_removed', data: d }));

        console.log(`Board ${id} loaded successfully with ${board.lists.length} lists`);
      } catch (error) {
        console.error("Failed to load board:", error);

        // Update the store with the error
        set((s) => {
          s.loading = false;
          s.error = `Failed to load board: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось загрузить доску");
      }
    },

    async createBoard(name) {
      try {
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

        // Show success toast
        useToastStore.getState().success("Доска успешно создана");

        return board;
      } catch (error) {
        console.error("Failed to create board:", error);

        // Show error toast
        useToastStore.getState().error("Не удалось создать доску");

        throw error;
      }
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

          // Get the current list positions for debugging
          const currentPositions = s.active.lists.map(l => ({ id: l.id, position: l.position }));
          console.log("Current list positions before deletion:", currentPositions);

          const listIndex = s.active.lists.findIndex((l: List) => l.id === listId);
          if (listIndex !== -1) {
            console.log(`Removing list ${listId} from board ${s.active.id}`);
            s.active.lists.splice(listIndex, 1);

            // After deletion, normalize the positions of remaining lists
            // This ensures positions are sequential (1, 2, 3, ...) without gaps
            s.active.lists.sort((a: List, b: List) => a.position - b.position);

            // Reassign positions to be sequential
            s.active.lists.forEach((list, idx) => {
              const newPosition = idx + 1;
              if (list.position !== newPosition) {
                console.log(`Normalizing list ${list.id} position from ${list.position} to ${newPosition}`);
                list.position = newPosition;
              }
            });

            console.log("List positions after normalization:",
              s.active.lists.map(l => ({ id: l.id, position: l.position })));
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

    /* ───────────────── BOARD MEMBERS ───────────────── */
    async fetchBoardMembers(boardId) {
      try {
        // Use the active board ID if none is provided
        const targetBoardId = boardId || get().active?.id;
        if (!targetBoardId) {
          console.error("No board ID provided and no active board");
          return;
        }

        console.log("Active board before fetching members:", get().active);

        console.log(`Fetching members for board ${targetBoardId}`);
        const members = await boardService.getBoardMembers(targetBoardId);
        console.log("Board members fetched:", members);

        // Get current user ID from auth store for debugging
        const { user } = useAuthStore.getState();
        console.log("Current user:", user);

        // Check if current user is in the members list and what role they have
        if (user && user.id) {
          // Convert all user IDs to strings for comparison
          const userIdStr = String(user.id);
          const memberUserIds = members.map(m => String(m.userId));

          console.log("All member user IDs:", memberUserIds);
          console.log("Current user ID (string):", userIdStr);
          console.log("Is current user ID in members list?", memberUserIds.includes(userIdStr));

          const currentUserMember = members.find(m => String(m.userId) === userIdStr);
          console.log("Current user member data:", currentUserMember);

          if (currentUserMember) {
            console.log("User role on this board:", currentUserMember.role);
          } else {
            console.log("Current user not found in board members list");

            // Check if the active board has the current user as owner
            const active = get().active;
            if (active) {
              const ownerIdFromUpperCase = active.OwnerID ? String(active.OwnerID) : undefined;
              const ownerIdFromLowerCase = active.ownerId ? String(active.ownerId) : undefined;
              const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;

              console.log("Checking if user is owner of the board:");
              console.log("- Owner ID from uppercase:", ownerIdFromUpperCase);
              console.log("- Owner ID from lowercase:", ownerIdFromLowerCase);
              console.log("- Combined owner ID:", ownerId);
              console.log("- Current user ID:", userIdStr);
              console.log("- Do they match?", ownerId === userIdStr);
            }
          }
        }

        set((s) => {
          s.boardMembers = members || [];
          console.log("Board members set in store:", s.boardMembers);

          // Update the user's role in the active board if needed
          if (s.active && user && user.id) {
            const userIdStr = String(user.id);
            const currentUserMember = members.find(m => String(m.userId) === userIdStr);

            // Get owner ID from board data
            const ownerIdFromUpperCase = s.active.OwnerID ? String(s.active.OwnerID) : undefined;
            const ownerIdFromLowerCase = s.active.ownerId ? String(s.active.ownerId) : undefined;
            const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;

            console.log("Checking user role in active board:");
            console.log("- Current user ID:", userIdStr);
            console.log("- Owner ID from board:", ownerId);
            console.log("- Current role in board:", s.active.role);
            console.log("- User found in members?", !!currentUserMember);
            if (currentUserMember) {
              console.log("- Role in members:", currentUserMember.role);
            }

            if (currentUserMember) {
              // User found in members list, update role
              const newRole = currentUserMember.role as 'owner' | 'member';

              if (s.active.role !== newRole) {
                console.log(`Updating user role in active board from ${s.active.role} to ${newRole}`);
                s.active.role = newRole;
              }
            } else if (ownerId === userIdStr) {
              // User is the owner but not in members list
              console.log("User is the owner but not in members list, setting role to owner");
              s.active.role = 'owner';
            }
          }
        });
      } catch (error) {
        console.error("Failed to fetch board members:", error);
        set((s) => {
          s.boardMembers = [];
        });

        // Show error toast
        useToastStore.getState().error("Не удалось загрузить список участников");
      }
    },

    async inviteMember(email, role = 'member') {
      try {
        const active = get().active;
        const boardId = active?.id;
        if (!boardId) {
          console.error("No active board");
          throw new Error("Нет активной доски");
        }

        // Check if current user is the owner of the board
        const isOwnerByRole = active?.role === 'owner';
        const boardMembers = get().boardMembers;
        const currentUser = useAuthStore.getState().user;

        // Convert IDs to strings for comparison
        const currentUserIdStr = currentUser?.id ? String(currentUser.id) : '';

        const isUserOwnerInMembers = boardMembers.some(m =>
          String(m.userId) === currentUserIdStr && m.role === 'owner');

        // Check both uppercase and lowercase ownerId properties
        const ownerIdFromUpperCase = active?.OwnerID ? String(active.OwnerID) : undefined;
        const ownerIdFromLowerCase = active?.ownerId ? String(active.ownerId) : undefined;
        const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;
        const isOwnerByBoardData = ownerId === currentUserIdStr;

        // Combined check - user is owner if any of the checks pass
        const isOwner = isOwnerByRole || isUserOwnerInMembers || isOwnerByBoardData;

        console.log("Checking if user can invite members:");
        console.log("- Current user ID (string):", currentUserIdStr);
        console.log("- Owner ID from uppercase:", ownerIdFromUpperCase);
        console.log("- Owner ID from lowercase:", ownerIdFromLowerCase);
        console.log("- Combined owner ID:", ownerId);
        console.log("- Is owner by role?", isOwnerByRole);
        console.log("- Is owner in members?", isUserOwnerInMembers);
        console.log("- Is owner by board data?", isOwnerByBoardData);
        console.log("- Is owner (combined)?", isOwner);

        // Log member user IDs for comparison
        if (boardMembers.length > 0) {
          console.log("Member user IDs (as strings):", boardMembers.map(m => String(m.userId)));
          console.log("Member with owner role:", boardMembers.find(m => m.role === 'owner'));
        }

        if (!isOwner) {
          console.error("User is not the owner of the board");
          throw new Error("Только владелец доски может приглашать участников");
        }

        // Validate email format before sending to API
        if (!email || !email.includes('@')) {
          throw new Error("Некорректный формат email");
        }

        // Check if user is already a member
        const existingMembers = get().boardMembers;
        const isAlreadyMember = existingMembers.some(
          (member) => member.email.toLowerCase() === email.toLowerCase()
        );

        if (isAlreadyMember) {
          throw new Error("Этот пользователь уже является участником доски");
        }

        // Send invitation
        await boardService.inviteMemberByEmail(boardId, email, role);

        // Refresh the members list
        await get().fetchBoardMembers();

        // Show success toast
        useToastStore.getState().success(`Пользователь ${email} успешно приглашен на доску`);

        return true;
      } catch (error) {
        console.error("Failed to invite member:", error);

        // Handle specific error cases
        let errorMessage = 'Не удалось пригласить пользователя';

        if (error instanceof Error) {
          // Check for specific error messages from the backend
          if (error.message.includes('not found')) {
            errorMessage = 'Пользователь с таким email не найден';
          } else if (error.message.includes('already')) {
            errorMessage = 'Этот пользователь уже является участником доски';
          } else {
            errorMessage = error.message;
          }
        }

        // Show error toast
        useToastStore.getState().error(errorMessage);

        // Re-throw the error so the component can handle it
        throw error;
      }
    },

    async removeMember(userId) {
      try {
        const active = get().active;
        const boardId = active?.id;
        if (!boardId) {
          console.error("No active board");
          throw new Error("Нет активной доски");
        }

        // Check if current user is the owner of the board
        const isOwnerByRole = active?.role === 'owner';
        const boardMembers = get().boardMembers;
        const currentUser = useAuthStore.getState().user;

        // Convert IDs to strings for comparison
        const currentUserIdStr = currentUser?.id ? String(currentUser.id) : '';

        const isUserOwnerInMembers = boardMembers.some(m =>
          String(m.userId) === currentUserIdStr && m.role === 'owner');

        // Check both uppercase and lowercase ownerId properties
        const ownerIdFromUpperCase = active?.OwnerID ? String(active.OwnerID) : undefined;
        const ownerIdFromLowerCase = active?.ownerId ? String(active.ownerId) : undefined;
        const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;
        const isOwnerByBoardData = ownerId === currentUserIdStr;

        // Combined check - user is owner if any of the checks pass
        const isOwner = isOwnerByRole || isUserOwnerInMembers || isOwnerByBoardData;

        console.log("Checking if user can remove members:");
        console.log("- Current user ID (string):", currentUserIdStr);
        console.log("- Owner ID from uppercase:", ownerIdFromUpperCase);
        console.log("- Owner ID from lowercase:", ownerIdFromLowerCase);
        console.log("- Combined owner ID:", ownerId);
        console.log("- Is owner by role?", isOwnerByRole);
        console.log("- Is owner in members?", isUserOwnerInMembers);
        console.log("- Is owner by board data?", isOwnerByBoardData);
        console.log("- Is owner (combined)?", isOwner);

        // Log member user IDs for comparison
        if (boardMembers.length > 0) {
          console.log("Member user IDs (as strings):", boardMembers.map(m => String(m.userId)));
          console.log("Member with owner role:", boardMembers.find(m => m.role === 'owner'));
        }

        if (!isOwner) {
          console.error("User is not the owner of the board");
          throw new Error("Только владелец доски может удалять участников");
        }

        try {
          await boardService.removeMember(boardId, userId);
          // Refresh the members list
          await get().fetchBoardMembers();
        } catch (error) {
          console.error("Error removing member:", error);
          // Re-throw the error to be handled by the caller
          throw error;
        }

        // Show success toast
        useToastStore.getState().success('Пользователь удален с доски');
      } catch (error) {
        console.error("Failed to remove member:", error);

        // Show error toast
        if (error instanceof Error) {
          useToastStore.getState().error(error.message);
        } else {
          useToastStore.getState().error('Не удалось удалить пользователя');
        }
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

            // Get the current list positions for debugging
            const currentPositions = board.lists.map(l => ({ id: l.id, position: l.position }));
            console.log("Current list positions before applying WebSocket event:", currentPositions);

            // Check if this is a WebSocket event for a change we initiated
            // Only ignore if the list exists AND has the exact same position AND the total list count matches
            // This prevents ignoring events after list deletion where positions may have been normalized
            const listExists = board.lists.some(l => l.id === listId);
            const hasMatchingPosition = board.lists.some(l => l.id === listId && l.position === position);
            const expectedListCount = rawList._expectedListCount;
            const actualListCount = board.lists.length;

            // If we have position mismatch or list count mismatch, we should apply the update
            const shouldApplyUpdate = !listExists || !hasMatchingPosition ||
                                     (expectedListCount && expectedListCount !== actualListCount);

            if (!shouldApplyUpdate) {
              console.log(`Ignoring list_moved event for list ${listId} as it matches our local state`);
              break;
            } else {
              console.log(`Applying list_moved event for list ${listId} (position=${position})`);
              if (!listExists) {
                console.log(`List ${listId} not found in local state, applying update`);
              } else if (!hasMatchingPosition) {
                console.log(`List ${listId} has different position in local state, applying update`);
              } else if (expectedListCount && expectedListCount !== actualListCount) {
                console.log(`List count mismatch (expected=${expectedListCount}, actual=${actualListCount}), applying update`);
              }
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

              // If the list doesn't exist locally but we received a move event,
              // it might be due to a sync issue. Consider refreshing the board data.
              console.log("List not found locally but received move event. Consider refreshing board data.");
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
            const rawData = data as any;
            const listId = rawData.listId || rawData.id;
            if (!listId) {
              console.error("Received list_deleted event without listId:", rawData);
              break;
            }

            console.log("Received list_deleted event:", rawData);

            // Get the current list positions for debugging
            const currentPositions = board.lists.map(l => ({ id: l.id, position: l.position }));
            console.log("Current list positions before deletion:", currentPositions);

            const listIndex = board.lists.findIndex((l: List) => l.id === String(listId));
            if (listIndex !== -1) {
              console.log(`Removing list ${listId} from board ${board.id} via WebSocket`);
              board.lists.splice(listIndex, 1);

              // After deletion, normalize the positions of remaining lists
              // This ensures positions are sequential (1, 2, 3, ...) without gaps
              board.lists.sort((a: List, b: List) => a.position - b.position);

              // Reassign positions to be sequential
              board.lists.forEach((list, idx) => {
                const newPosition = idx + 1;
                if (list.position !== newPosition) {
                  console.log(`Normalizing list ${list.id} position from ${list.position} to ${newPosition}`);
                  list.position = newPosition;
                }
              });

              console.log("List positions after normalization:",
                board.lists.map(l => ({ id: l.id, position: l.position })));
            } else {
              console.log(`List ${listId} not found in board ${board.id}, cannot remove`);
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

          case 'member_added': {
            // Handle member_added event
            const rawData = data as any;
            console.log("Received member_added event with data:", rawData);

            // Extract the board ID (handle both formats)
            const boardId = String(rawData.BoardID || rawData.boardId || rawData.board_id || '');

            // Extract the user ID (handle both formats)
            const userId = String(rawData.UserID || rawData.userId || rawData.user_id || '');

            // Extract the email (handle both formats)
            const email = rawData.Email || rawData.email || '';

            console.log("Extracted from member_added event:");
            console.log("- Board ID:", boardId);
            console.log("- User ID:", userId);
            console.log("- Email:", email);
            console.log("- Current board ID:", board.id);

            // If we're on the board where the member was added, refresh the members list
            if (boardId && board.id === boardId) {
              console.log("Member added to current board, refreshing members list");

              // We need to call fetchBoardMembers outside of the immer setter
              setTimeout(() => get().fetchBoardMembers(), 0);

              // Show a toast notification
              useToastStore.getState().info("Новый участник добавлен на доску");
            } else {
              console.log("Member added to a different board, no action needed");
            }
            break;
          }

          case 'member_removed': {
            // Handle member_removed event
            const rawData = data as any;
            console.log("Received member_removed event with data:", rawData);

            // Extract the user ID (handle both formats)
            const userId = String(rawData.userId || rawData.UserID || rawData.user_id || '');

            // Extract the board ID (handle both formats)
            const boardId = String(rawData.boardId || rawData.BoardID || rawData.board_id || '');

            console.log("Extracted from member_removed event:");
            console.log("- User ID:", userId);
            console.log("- Board ID:", boardId);
            console.log("- Current board ID:", board.id);
            console.log("- Current user ID:", useAuthStore.getState().user?.id);

            // If we're on a board and our user ID matches the removed member, redirect to home
            const currentUserId = useAuthStore.getState().user?.id;
            if (currentUserId && userId === String(currentUserId)) {
              // We've been removed from this board
              useToastStore.getState().info("Вы были удалены с этой доски");
              console.log("Current user was removed from this board, redirecting to home");

              // Redirect to home page
              setTimeout(() => {
                window.location.href = '/';
              }, 1500);
            } else if (board && (!boardId || boardId === board.id)) {
              // Someone else was removed from this board, refresh the members list
              console.log("Another user was removed from this board, refreshing members list");

              // Find the removed member's name if available
              const members = s.boardMembers;
              const removedMember = members.find(m => String(m.userId) === userId);
              const memberName = removedMember ? (removedMember.name || removedMember.email || 'Пользователь') : 'Пользователь';

              // Show a toast notification
              useToastStore.getState().info(`${memberName} был удален с доски`);

              // Refresh the members list
              setTimeout(() => get().fetchBoardMembers(), 0);
            } else {
              console.log("Member removed from a different board, no action needed");
            }
            break;
          }
          // можно расширять другими событиями
        }
      });
    },
  }))
);
