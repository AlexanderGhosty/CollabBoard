/**
 * This file is a compatibility layer for the refactored board store.
 * It maintains the same API as the original useBoardStore, but delegates
 * to the new modular store implementation.
 */

import { create } from 'zustand';
import {
  useBoardStore as useCoreBoardStore,
  useListsStore,
  useCardsStore,
  useMembersStore,
  useWebSocketStore
} from './board';

/**
 * Original BoardState interface for backward compatibility
 */
interface BoardState {
  /** коллекция всех досок пользователя (лендинг) */
  boards: any[];
  /** доски, где пользователь является владельцем */
  ownedBoards: any[];
  /** доски, где пользователь является участником */
  memberBoards: any[];
  /** активная доска (открыта /board/:id) */
  active: any | null;
  /** участники активной доски */
  boardMembers: any[];
  /** флаг, указывающий, что модальное окно карточки открыто */
  isCardModalOpen: boolean;
  /** флаг, указывающий, что модальное окно управления участниками открыто */
  isMemberModalOpen: boolean;
  /** сообщение об ошибке */
  error?: string;

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
  applyWS: (msg: any) => void;
}

/**
 * This implementation serves as a compatibility layer for the refactored board store.
 * It delegates all operations to the new modular store implementation.
 */
export const useBoardStore = create<BoardState>()((set, get) => {
  // Get references to the new store implementations
  const boardStore = useCoreBoardStore.getState();
  const listsStore = useListsStore.getState();
  const cardsStore = useCardsStore.getState();
  const membersStore = useMembersStore.getState();
  const webSocketStore = useWebSocketStore.getState();

  return {
    // Initialize state with empty values
    boards: [],
    ownedBoards: [],
    memberBoards: [],
    active: null,
    boardMembers: [],
    isCardModalOpen: false,
    isMemberModalOpen: false,

    // UI state methods
    setCardModalOpen(isOpen: boolean) {
      boardStore.setCardModalOpen(isOpen);
      set({ isCardModalOpen: isOpen });
    },

    setMemberModalOpen(isOpen: boolean) {
      boardStore.setMemberModalOpen(isOpen);
      set({ isMemberModalOpen: isOpen });
    },

    // Board operations
    async fetchBoards() {
      await boardStore.fetchBoards();

      // Convert normalized boards to array format for backward compatibility
      const normalizedBoards = boardStore.boards;
      const boardsArray = Object.values(normalizedBoards);

      set({ boards: boardsArray });
    },

    async fetchBoardsByRole() {
      await boardStore.fetchBoardsByRole();

      // Convert normalized data to arrays for backward compatibility
      const normalizedBoards = boardStore.boards;
      const ownedBoardIds = boardStore.ownedBoardIds;
      const memberBoardIds = boardStore.memberBoardIds;

      const ownedBoards = ownedBoardIds.map(id => normalizedBoards[id]).filter(Boolean);
      const memberBoards = memberBoardIds.map(id => normalizedBoards[id]).filter(Boolean);
      const allBoards = [...ownedBoards, ...memberBoards];

      set({
        boards: allBoards,
        ownedBoards,
        memberBoards
      });
    },

    async loadBoard(id: string) {
      if (!id) {
        console.error("Attempted to load board with undefined ID");
        return;
      }

      try {
        // Load the board using the new store
        await boardStore.loadBoard(id);

        // Get the loaded board
        const loadedBoard = boardStore.boards[id];
        if (!loadedBoard) {
          console.error("Board not found after loading:", id);
          return;
        }

        // Get lists for this board
        const boardLists = listsStore.getListsByBoardId(id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Create a complete board object with lists and cards
        const completeBoard = {
          ...loadedBoard,
          lists: listsWithCards
        };

        // Get board members
        const members = membersStore.getMembersByBoardId(id);

        // Update the state for backward compatibility
        set({
          active: completeBoard,
          boardMembers: members,
          boards: get().boards.map(b => b.id === id ? completeBoard : b)
        });
      } catch (error) {
        console.error("Failed to load board:", error);
        set({
          active: null,
          error: `Failed to load board: ${error}`
        });
      }
    },

    async createBoard(name: string) {
      try {
        // Use the new store to create the board
        const board = await boardStore.createBoard(name);

        // Update the local state for backward compatibility
        set(state => ({
          boards: [...state.boards, board]
        }));

        return board;
      } catch (error) {
        console.error("Failed to create board:", error);
        throw error;
      }
    },

    async deleteBoard(boardId: string) {
      try {
        // Use the new store to delete the board
        await boardStore.deleteBoard(boardId);

        // Update the local state for backward compatibility
        set(state => ({
          boards: state.boards.filter(b => b.id !== boardId),
          active: state.active?.id === boardId ? null : state.active
        }));
      } catch (error) {
        console.error(`Error deleting board ${boardId}:`, error);
        throw error;
      }
    },

    async updateBoardName(boardId: string, name: string) {
      const board = get().active;
      if (!board || board.id !== boardId) {
        console.error(`Cannot update board name: active board is null or doesn't match boardId ${boardId}`);
        return;
      }

      try {
        // Use the new store to update the board name
        await boardStore.updateBoardName(boardId, name);

        // Update the local state for backward compatibility
        set(state => ({
          active: state.active ? { ...state.active, name } : null,
          boards: state.boards.map(b => b.id === boardId ? { ...b, name } : b)
        }));
      } catch (error) {
        console.error(`Error updating board ${boardId} name:`, error);
        throw error;
      }
    },

    async createList(title: string) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to create the list
        await listsStore.createList(board.id, title);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error creating list in board ${board.id}:`, error);
      }
    },

    async updateList(listId: string, title: string) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to update the list
        await listsStore.updateList(listId, title);

        // Update the local state for backward compatibility
        set(state => {
          if (!state.active) return state;

          const updatedLists = state.active.lists.map((list: any) =>
            list.id === listId ? { ...list, title } : list
          );

          return {
            active: { ...state.active, lists: updatedLists }
          };
        });
      } catch (error) {
        console.error(`Error updating list ${listId}:`, error);
        throw error;
      }
    },

    async moveList(listId: string, position: number) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to move the list
        await listsStore.moveList(listId, position);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error moving list ${listId}:`, error);
        throw error;
      }
    },

    async createCard(listId: string, title: string, description = '') {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to create the card
        await cardsStore.createCard(listId, title, description);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error creating card in list ${listId}:`, error);
      }
    },

    async updateCard(cardId: string, updates: { title?: string; description?: string }) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to update the card
        await cardsStore.updateCard(cardId, updates);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error updating card ${cardId}:`, error);
      }
    },

    async duplicateCard(cardId: string) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to duplicate the card
        await cardsStore.duplicateCard(cardId);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error duplicating card ${cardId}:`, error);
      }
    },

    async moveCard(cardId: string, toListId: string, toPos: number) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to move the card
        await cardsStore.moveCard(cardId, toListId, toPos);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error moving card ${cardId} to list ${toListId}:`, error);
      }
    },

    async deleteList(listId: string) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to delete the list
        await listsStore.deleteList(listId);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      } catch (error) {
        console.error(`Error deleting list ${listId}:`, error);
      }
    },

    async deleteCard(cardId: string) {
      const board = get().active;
      if (!board) return;

      try {
        // Use the new store to delete the card
        await cardsStore.deleteCard(cardId);

        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
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

        // Use the new store to fetch board members
        await membersStore.fetchBoardMembers(targetBoardId);

        // Get the members for this board
        const members = membersStore.getMembersByBoardId(targetBoardId);

        // Update the state for backward compatibility
        set({ boardMembers: members });

      } catch (error) {
        console.error("Failed to fetch board members:", error);
        set({ boardMembers: [] });
      }
    },

    async inviteMember(email: string, role = 'member'): Promise<void> {
      try {
        const active = get().active;
        const boardId = active?.id;
        if (!boardId) {
          console.error("No active board");
          throw new Error("Нет активной доски");
        }

        // Use the new store to invite a member
        await membersStore.inviteMember(email, role);

        // Refresh the members list for backward compatibility
        await get().fetchBoardMembers();
      } catch (error) {
        console.error("Failed to invite member:", error);
        throw error;
      }
    },

    async removeMember(userId: string) {
      try {
        const active = get().active;
        const boardId = active?.id;
        if (!boardId) {
          console.error("No active board");
          throw new Error("Нет активной доски");
        }

        // Use the new store to remove a member
        await membersStore.removeMember(userId);

        // Refresh the members list for backward compatibility
        await get().fetchBoardMembers();

      } catch (error) {
        console.error("Failed to remove member:", error);
        throw error;
      }
    },

    /* ────────────── WebSocket incoming ───────────── */
    applyWS({ event, data }: { event: string, data: any }) {
      // Delegate to the appropriate store based on the event type
      if (event.startsWith('card_')) {
        // Forward to cards store
        if (event === 'card_created') {
          webSocketStore.handleCardCreated(data);
        } else if (event === 'card_updated') {
          webSocketStore.handleCardUpdated(data);
        } else if (event === 'card_moved') {
          webSocketStore.handleCardMoved(data);
        } else if (event === 'card_deleted') {
          webSocketStore.handleCardDeleted(data);
        }
      } else if (event.startsWith('list_')) {
        // Forward to lists store
        if (event === 'list_created') {
          webSocketStore.handleListCreated(data);
        } else if (event === 'list_updated') {
          webSocketStore.handleListUpdated(data);
        } else if (event === 'list_moved') {
          webSocketStore.handleListMoved(data);
        } else if (event === 'list_deleted') {
          webSocketStore.handleListDeleted(data);
        }
      } else if (event.startsWith('board_')) {
        // Forward to board store
        if (event === 'board_created') {
          webSocketStore.handleBoardCreated(data);
        } else if (event === 'board_updated') {
          webSocketStore.handleBoardUpdated(data);
        } else if (event === 'board_deleted') {
          webSocketStore.handleBoardDeleted(data);
        }
      } else if (event.startsWith('member_')) {
        // Forward to members store
        if (event === 'member_added') {
          webSocketStore.handleMemberAdded(data);
        } else if (event === 'member_removed') {
          webSocketStore.handleMemberRemoved(data);
        }
      } else {
        console.log(`Unknown WebSocket event: ${event}`, data);
      }

      // Update the active board with the latest data if needed
      const board = get().active;
      if (board) {
        // Get the updated lists for this board
        const boardLists = listsStore.getSortedListsByBoardId(board.id);

        // For each list, get its cards
        const listsWithCards = boardLists.map(list => {
          const cards = cardsStore.getSortedCardsByListId(list.id);
          return {
            ...list,
            cards
          };
        });

        // Update the active board with the new lists
        set(state => ({
          active: state.active ? { ...state.active, lists: listsWithCards } : null
        }));
      }
    }
  });
