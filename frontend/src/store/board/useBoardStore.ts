import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService, Board } from '@/services/boardService';
import { listService } from '@/services/listService';
import { memberService } from '@/services/memberService';
import { wsClient } from '@/services/websocket';
import { useToastStore } from '@/store/useToastStore';
import { BoardState } from './types';
import { normalizeId, extractBoardId } from '@/utils/board/idNormalization';
import { setupWebSocketSubscriptions } from './useWebSocketStore';
import { useListsStore } from './useListsStore';
import { useMembersStore } from './useMembersStore';
import { useCardsStore } from './useCardsStore';

export const useBoardStore = create<BoardState>()(
  immer((set, get) => ({
    // State
    boards: {},
    ownedBoardIds: [],
    memberBoardIds: [],
    activeBoard: null,
    boardMembers: {},
    isCardModalOpen: false,
    loading: false,
    error: null,

    // UI state methods
    setCardModalOpen(isOpen) {
      set((s) => {
        s.isCardModalOpen = isOpen;
      });
    },

    // Board operations
    async fetchBoards() {
      set((s) => { s.loading = true; s.error = null; });

      try {
        const boards = await boardService.getBoards();

        set((s) => {
          // Convert array to record
          s.boards = boards.reduce((acc, board) => {
            if (board.id) {
              acc[board.id] = board;
            }
            return acc;
          }, {} as Record<string, Board>);

          s.loading = false;
        });
      } catch (error) {
        console.error("Failed to fetch boards:", error);

        set((s) => {
          s.boards = {};
          s.loading = false;
          s.error = `Failed to fetch boards: ${error}`;
        });
      }
    },

    async fetchBoardsByRole() {
      set((s) => { s.loading = true; s.error = null; });

      try {
        // Fetch boards where user is owner
        const ownedBoards = await boardService.getBoardsByRole('owner');
        // Fetch boards where user is member
        const memberBoards = await boardService.getBoardsByRole('member');

        set((s) => {
          // Convert arrays to records and extract IDs
          const boardsRecord: Record<string, Board> = {};
          const ownedIds: string[] = [];
          const memberIds: string[] = [];

          // Process owned boards - explicitly set role to 'owner'
          ownedBoards.forEach(board => {
            if (board.id) {
              // Ensure the role is explicitly set to 'owner'
              boardsRecord[board.id] = {
                ...board,
                role: 'owner'
              };
              ownedIds.push(board.id);
            }
          });

          // Process member boards - explicitly set role to 'member'
          memberBoards.forEach(board => {
            if (board.id) {
              // Ensure the role is explicitly set to 'member'
              boardsRecord[board.id] = {
                ...board,
                role: 'member'
              };
              memberIds.push(board.id);
            }
          });

          s.boards = boardsRecord;
          s.ownedBoardIds = ownedIds;
          s.memberBoardIds = memberIds;
          s.loading = false;
        });
      } catch (error) {
        console.error("Failed to fetch boards by role:", error);

        set((s) => {
          s.boards = {};
          s.ownedBoardIds = [];
          s.memberBoardIds = [];
          s.loading = false;
          s.error = `Failed to fetch boards: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось загрузить список досок");
      }
    },

    async loadBoard(id) {
      // Validate the board ID
      if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error("Attempted to load board with invalid ID:", id);
        return;
      }

      // Normalize the board ID
      const normalizedId = id.trim();
      console.log(`Loading board with ID: ${normalizedId}`);

      set((s) => { s.loading = true; s.error = null; });

      try {
        // Always fetch the board from the API to ensure we have the latest data
        const board = await boardService.getBoardById(normalizedId);

        // Ensure the board has a valid ID and matches the requested ID
        if (!board || !board.id) {
          console.error("Board loaded without a valid ID:", board);
          return;
        }

        // Verify the loaded board ID matches the requested ID
        if (board.id !== normalizedId) {
          console.error(`Board ID mismatch: requested ${normalizedId}, got ${board.id}`);
          return;
        }

        // Update the lists store with the lists from the board
        const listsStore = useListsStore.getState();

        // Use the setLists method to safely update the lists for this board
        if (board.lists && Array.isArray(board.lists)) {
          console.log(`Setting ${board.lists.length} lists for board ${normalizedId} using setLists`);
          listsStore.setLists(board.lists, normalizedId);

          // Fetch cards for each list
          console.log(`Fetching cards for ${board.lists.length} lists`);

          // Import the batchPromises utility
          const { batchPromises } = await import('@/utils/async/batchPromises');

          // Create an array of card fetching tasks
          const cardFetchingTasks = board.lists.map(list => {
            return async () => {
              try {
                console.log(`Fetching cards for list ${list.id}`);
                const cards = await listService.fetchListCards(list.id);
                console.log(`Fetched ${cards.length} cards for list ${list.id}`);

                // Update the cards store with the fetched cards
                useCardsStore.setState(state => {
                  // Add each card to the cards record
                  cards.forEach(card => {
                    state.cards[card.id] = card;

                    // Make sure the listCards relationship is properly set up
                    if (!state.listCards[list.id]) {
                      state.listCards[list.id] = [];
                    }

                    // Add the card ID to the list's cards if not already there
                    if (!state.listCards[list.id].includes(card.id)) {
                      state.listCards[list.id].push(card.id);
                    }
                  });
                });

                return { listId: list.id, success: true };
              } catch (error) {
                console.error(`Error fetching cards for list ${list.id}:`, error);
                return { listId: list.id, success: false, error };
              }
            };
          });

          // Execute the tasks in batches of 3 (or adjust as needed)
          await batchPromises(cardFetchingTasks, 3);
        } else {
          console.log(`No lists found for board ${normalizedId}`);
          // Still clear any existing lists for this board
          listsStore.setLists([], normalizedId);
        }

        set((s) => {
          // Update the board in the boards record
          s.boards[board.id] = board;
          // Set as active board
          s.activeBoard = board.id;
          s.loading = false;
        });

        // Fetch board members
        await useMembersStore.getState().fetchBoardMembers(normalizedId);

        // Connect to WebSocket for real-time updates with the normalized ID
        console.log(`Connecting to WebSocket for board ${normalizedId}`);
        wsClient.connect(normalizedId);

        // Setup WebSocket subscriptions
        setupWebSocketSubscriptions(normalizedId);

      } catch (error) {
        console.error("Failed to load board:", error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to load board: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось загрузить доску");
      }
    },

    async createBoard(name) {
      set((s) => { s.loading = true; s.error = null; });

      try {
        const board = await boardService.createBoard(name);

        set((s) => {
          // Add to boards record with explicit owner role
          if (board.id) {
            s.boards[board.id] = {
              ...board,
              role: 'owner' // Ensure the creator is marked as owner
            };
            // Add to owned boards
            s.ownedBoardIds.push(board.id);
          }
          s.loading = false;
        });

        // Show success toast
        useToastStore.getState().success("Доска успешно создана");

        return board;
      } catch (error) {
        console.error("Failed to create board:", error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to create board: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось создать доску");

        throw error;
      }
    },

    async deleteBoard(boardId) {
      set((s) => { s.loading = true; s.error = null; });

      try {
        await boardService.deleteBoard(boardId);

        set((s) => {
          // Remove from boards record
          delete s.boards[boardId];

          // Remove from owned/member boards
          s.ownedBoardIds = s.ownedBoardIds.filter(id => id !== boardId);
          s.memberBoardIds = s.memberBoardIds.filter(id => id !== boardId);

          // Clear active board if it's the one being deleted
          if (s.activeBoard === boardId) {
            s.activeBoard = null;
          }

          s.loading = false;
        });

        // Show success toast
        useToastStore.getState().success("Доска успешно удалена");
      } catch (error) {
        console.error(`Error deleting board ${boardId}:`, error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to delete board: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось удалить доску. Пожалуйста, попробуйте снова.");
      }
    },

    async updateBoardName(boardId, name) {
      const boards = get().boards;
      const board = boards[boardId];

      if (!board) {
        console.error(`Cannot update board name: board with ID ${boardId} not found`);
        return;
      }

      // Store the original name for rollback if needed
      const originalName = board.name;

      // Optimistic update
      set((s) => {
        if (s.boards[boardId]) {
          s.boards[boardId].name = name;
        }
      });

      try {
        // Call the API to update the board
        const updatedBoard = await boardService.updateBoard(boardId, name);

        // Show success toast
        useToastStore.getState().success("Название доски обновлено");
      } catch (error) {
        console.error(`Error updating board ${boardId} name:`, error);

        // Revert the optimistic update on error
        set((s) => {
          if (s.boards[boardId]) {
            s.boards[boardId].name = originalName;
          }
        });

        // Show error toast
        useToastStore.getState().error("Не удалось обновить название доски. Пожалуйста, попробуйте снова.");
        throw error;
      }
    },

    // WebSocket event handling
    applyWS(msg) {
      // This will be implemented in useWebSocketStore.ts
      // and will be called from there
    },

    // Cleanup method
    cleanup() {
      // Disconnect WebSocket
      wsClient.disconnect();

      // Reset state
      set((s) => {
        s.activeBoard = null;
        s.boardMembers = {};
      });
    },

    // Board members
    async fetchBoardMembers(boardId: string) {
      // Delegate to the members store
      return useMembersStore.getState().fetchBoardMembers(boardId);
    }
  }))
);
