import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWS, WSMessage, wsClient } from '@/services/websocket';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { WebSocketState } from './types';
import { useBoardStore } from './useBoardStore';
import { useListsStore } from './useListsStore';
import { useCardsStore } from './useCardsStore';
import { useMembersStore } from './useMembersStore';
import { listService } from '@/services/listService';
import {
  normalizeId,
  extractBoardId,
  extractListId,
  extractCardId,
  extractUserId,
  extractDescription
} from '@/utils/board/idNormalization';
import { sortLists, sortCards } from '@/utils/board/sorting';

export const useWebSocketStore = create<WebSocketState>()(
  immer((set, get) => ({
    // WebSocket event handlers
    setupBoardSubscriptions(boardId) {
      // Subscribe to all WebSocket events
      const unsubscribers = [
        subscribeWS('card_created', (data) => get().handleCardCreated(data)),
        subscribeWS('card_updated', (data) => get().handleCardUpdated(data)),
        subscribeWS('card_moved', (data) => get().handleCardMoved(data)),
        subscribeWS('card_deleted', (data) => get().handleCardDeleted(data)),
        subscribeWS('list_created', (data) => get().handleListCreated(data)),
        subscribeWS('list_updated', (data) => get().handleListUpdated(data)),
        subscribeWS('list_moved', (data) => get().handleListMoved(data)),
        subscribeWS('list_deleted', (data) => get().handleListDeleted(data)),
        subscribeWS('board_created', (data) => get().handleBoardCreated(data)),
        subscribeWS('board_updated', (data) => get().handleBoardUpdated(data)),
        subscribeWS('board_deleted', (data) => get().handleBoardDeleted(data)),
        subscribeWS('member_added', (data) => get().handleMemberAdded(data)),
        subscribeWS('member_removed', (data) => get().handleMemberRemoved(data)),
        subscribeWS('member_left', (data) => get().handleMemberLeft(data)),
      ];

      // Return a cleanup function that unsubscribes from all events
      return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    },

    handleCardCreated(data) {
      console.log("Handling card_created event with data:", data);

      const cardId = extractCardId(data);
      const listId = normalizeId(data.ListID || data.listId);

      if (!cardId || !listId) {
        console.error("Received card_created event with missing ID or listId:", data);
        return;
      }

      // Create a normalized card object
      const normalizedCard = {
        id: cardId,
        listId: listId,
        title: data.Title || data.title || '',
        description: extractDescription(data),
        position: data.Position || data.position || 0
      };

      console.log("Normalized card from WebSocket:", normalizedCard);

      // Update the cards store
      const cardsStore = useCardsStore.getState();

      // Check if card already exists to prevent duplicates
      if (!cardsStore.cards[cardId]) {
        useCardsStore.setState(state => {
          // Add to cards record
          state.cards[cardId] = normalizedCard;

          // Add to listCards relationship
          if (!state.listCards[listId]) {
            state.listCards[listId] = [];
          }

          if (!state.listCards[listId].includes(cardId)) {
            state.listCards[listId].push(cardId);
          }
        });

        console.log(`Added new card ${cardId} to list ${listId} via WebSocket`);

        // Debug the state after update
        setTimeout(() => {
          const updatedState = useCardsStore.getState();
          console.log(`After WebSocket update - Cards for list ${listId}:`,
            updatedState.getCardsByListId(listId));

          // Force a state update to trigger UI refresh
          useCardsStore.setState(state => ({ ...state }));
        }, 0);
      } else {
        console.log(`Card ${cardId} already exists in store, skipping`);
      }
    },

    handleCardUpdated(data) {
      const cardId = extractCardId(data);
      const listId = normalizeId(data.ListID || data.listId);

      if (!cardId || !listId) {
        console.error("Received card_updated event with missing ID or listId:", data);
        return;
      }

      // Get the current card
      const cardsStore = useCardsStore.getState();
      const card = cardsStore.cards[cardId];

      if (!card) {
        console.error(`Could not find card ${cardId} in list ${listId}`);
        return;
      }

      // Create a normalized card object with updated values
      const normalizedCard = {
        ...card,
        title: data.Title || data.title || card.title,
        description: extractDescription(data) || card.description,
        position: data.Position || data.position || card.position
      };

      // Update the card in the store
      useCardsStore.setState(state => {
        state.cards[cardId] = normalizedCard;
      });

      console.log(`Updated card ${cardId} in list ${listId} via WebSocket`);
    },

    handleCardMoved(data) {
      // Handle both formats:
      // 1. { cardId, toListId, toPos } from frontend-initiated moves
      // 2. { ID, ListID, Position } from backend-initiated moves
      const cardId = extractCardId(data);
      const toListId = normalizeId(data.toListId || data.ListID);
      const toPos = data.toPos || data.Position || 0;

      if (!cardId || !toListId) {
        console.error("Received card_moved event with missing data:", data);
        return;
      }

      // Get the current card
      const cardsStore = useCardsStore.getState();
      const card = cardsStore.cards[cardId];

      if (!card) {
        console.error(`Could not find card ${cardId}`);
        return;
      }

      const fromListId = card.listId;

      // Update the card in the store
      useCardsStore.setState(state => {
        // Remove card from source list
        if (state.listCards[fromListId]) {
          state.listCards[fromListId] = state.listCards[fromListId].filter(id => id !== cardId);
        }

        // Add card to destination list
        if (!state.listCards[toListId]) {
          state.listCards[toListId] = [];
        }

        if (!state.listCards[toListId].includes(cardId)) {
          state.listCards[toListId].push(cardId);
        }

        // Update card's listId and position
        state.cards[cardId] = {
          ...state.cards[cardId],
          listId: toListId,
          position: toPos
        };
      });

      console.log(`Card ${cardId} moved from list ${fromListId} to list ${toListId} at position ${toPos} via WebSocket`);
    },

    handleCardDeleted(data) {
      const cardId = extractCardId(data);

      if (!cardId) {
        console.error("Received card_deleted event without cardId:", data);
        return;
      }

      // Get the current card
      const cardsStore = useCardsStore.getState();
      const card = cardsStore.cards[cardId];

      if (!card) {
        console.error(`Could not find card ${cardId}`);
        return;
      }

      const listId = card.listId;

      // Remove the card from the store
      useCardsStore.setState(state => {
        // Remove from cards record
        delete state.cards[cardId];

        // Remove from listCards relationship
        if (state.listCards[listId]) {
          state.listCards[listId] = state.listCards[listId].filter(id => id !== cardId);
        }
      });

      console.log(`Removed card ${cardId} from list ${listId} via WebSocket`);
    },

    handleListCreated(data) {
      const listId = extractListId(data);
      let boardId = extractBoardId(data);

      // Проверка на случай, если boardId в сообщении неверный
      const activeBoardId = useBoardStore.getState().activeBoard;
      if (activeBoardId && (!boardId || boardId !== activeBoardId)) {
        console.log(`Correcting boardId from ${boardId} to active board ${activeBoardId}`);
        boardId = activeBoardId;
      }

      if (!listId || !boardId) {
        console.error("Received list_created event with missing ID or boardId:", data);
        return;
      }

      console.log(`Processing list_created event for list ${listId} on board ${boardId}`);

      // Create a normalized list object
      const normalizedList = {
        id: listId,
        boardId: boardId,
        title: data.Title || data.title || '',
        position: data.Position || data.position || 0,
        cards: []
      };

      // Update the lists store
      const listsStore = useListsStore.getState();

      // Check if list already exists to prevent duplicates
      if (!listsStore.lists[listId]) {
        console.log(`Adding new list ${listId} to board ${boardId}`);
        useListsStore.setState(state => {
          // Add to lists record
          state.lists[listId] = normalizedList;

          // Add to boardLists relationship
          if (!state.boardLists[boardId]) {
            state.boardLists[boardId] = [];
          }

          if (!state.boardLists[boardId].includes(listId)) {
            state.boardLists[boardId].push(listId);
          }
        });

        console.log(`Added new list ${listId} to board ${boardId} via WebSocket`);
      } else {
        console.log(`List ${listId} already exists in store, skipping`);
      }
    },

    handleListUpdated(data) {
      const listId = extractListId(data);

      if (!listId) {
        console.error("Received list_updated event without ID:", data);
        return;
      }

      // Get the current list
      const listsStore = useListsStore.getState();
      const list = listsStore.lists[listId];

      if (!list) {
        console.error(`Could not find list ${listId}`);
        return;
      }

      // Update the list in the store
      useListsStore.setState(state => {
        state.lists[listId] = {
          ...state.lists[listId],
          title: data.Title || data.title || list.title
        };
      });

      console.log(`Updated list ${listId} title via WebSocket`);
    },

    handleListMoved(data) {
      const listId = extractListId(data);
      const position = data.Position || data.position || 0;

      if (!listId) {
        console.error("Received list_moved event without ID:", data);
        return;
      }

      // Get the current list
      const listsStore = useListsStore.getState();
      const list = listsStore.lists[listId];

      if (!list) {
        console.error(`Could not find list ${listId}`);
        return;
      }

      const boardId = list.boardId;
      const oldPosition = list.position;

      // Update the list position in the store
      useListsStore.setState(state => {
        // Update the moved list's position
        state.lists[listId].position = position;

        // Update positions of other lists in the same board
        const boardLists = listsStore.getListsByBoardId(boardId);

        boardLists.forEach(otherList => {
          if (otherList.id === listId) return;

          // If moving forward (e.g., from pos 2 to pos 4)
          if (oldPosition < position) {
            if (otherList.position > oldPosition && otherList.position <= position) {
              state.lists[otherList.id].position--;
            }
          }
          // If moving backward (e.g., from pos 4 to pos 2)
          else if (oldPosition > position) {
            if (otherList.position >= position && otherList.position < oldPosition) {
              state.lists[otherList.id].position++;
            }
          }
        });
      });

      console.log(`List ${listId} moved to position ${position} via WebSocket`);
    },

    handleListDeleted(data) {
      // Extract the list ID, handling both string and number formats
      const rawListId = data.id || data.ID || data.listId || data.ListID;
      const listId = rawListId ? String(rawListId) : undefined;

      if (!listId) {
        console.error("Received list_deleted event without ID:", data);
        return;
      }

      console.log(`Processing list_deleted event for list ${listId}`);

      // Get the current list
      const listsStore = useListsStore.getState();
      const list = listsStore.lists[listId];

      // If the list is not found, it might have been already deleted locally
      // In this case, we can't do much except log it and refresh the board data
      if (!list) {
        console.log(`List ${listId} not found in store, might have been already deleted`);

        // Get the board ID from the event data if available
        const boardId = data.boardId || data.BoardID || useBoardStore.getState().activeBoard;
        if (boardId) {
          console.log(`Refreshing lists for board ${boardId} after list deletion`);
          // Force a refresh of the lists for this board
          listService.fetchBoardLists(boardId).then(lists => {
            if (Array.isArray(lists)) {
              useListsStore.getState().setLists(lists, boardId);
            } else {
              console.error(`Invalid lists data received for board ${boardId}:`, lists);
            }
          }).catch(err => {
            console.error(`Failed to refresh lists for board ${boardId}:`, err);
          });
        }
        return;
      }

      const boardId = list.boardId;

      // Remove the list from the store
      useListsStore.setState(state => {
        // Remove from lists record
        delete state.lists[listId];

        // Remove from boardLists relationship
        if (state.boardLists[boardId]) {
          state.boardLists[boardId] = state.boardLists[boardId].filter(id => id !== listId);
        }

        // Normalize positions of remaining lists
        const remainingLists = listsStore.getListsByBoardId(boardId);
        remainingLists.sort((a, b) => a.position - b.position);

        // Reassign positions to be sequential
        remainingLists.forEach((list, idx) => {
          const newPosition = idx + 1;
          if (state.lists[list.id] && state.lists[list.id].position !== newPosition) {
            state.lists[list.id].position = newPosition;
          }
        });
      });

      console.log(`Removed list ${listId} from board ${boardId} via WebSocket`);
    },

    handleBoardCreated(data) {
      const boardId = extractBoardId(data);
      const boardName = data.Name || data.name || '';

      if (!boardId) {
        console.error("Received board_created event without ID:", data);
        return;
      }

      // Create a normalized board object
      const normalizedBoard = {
        id: boardId,
        name: boardName,
        ownerId: normalizeId(data.OwnerID || data.ownerId),
        lists: data.lists || [],
        role: data.role || 'member'
      };

      // Update the board store
      useBoardStore.setState(state => {
        // Add to boards record if it doesn't exist
        if (!state.boards[boardId]) {
          state.boards[boardId] = normalizedBoard;
          console.log(`Added board ${boardId} with name "${boardName}" to boards list via WebSocket`);
        } else {
          // Update existing board
          state.boards[boardId] = {
            ...state.boards[boardId],
            ...normalizedBoard
          };
          console.log(`Updated board ${boardId} in boards list via WebSocket`);
        }
      });
    },

    handleBoardUpdated(data) {
      console.log("Handling board_updated event with data:", data);

      const boardId = extractBoardId(data);
      const boardName = data.Name || data.name || '';

      console.log(`Extracted boardId: ${boardId}, boardName: ${boardName}`);

      if (!boardId) {
        console.error("Received board_updated event without ID:", data);
        return;
      }

      // Update the board in the store
      useBoardStore.setState(state => {
        if (state.boards[boardId]) {
          state.boards[boardId].name = boardName || state.boards[boardId].name;
          console.log(`Updated board ${boardId} name to "${boardName}" via WebSocket`);
        } else {
          console.warn(`Board ${boardId} not found in store during WebSocket update`);
        }
      });
    },

    handleBoardDeleted(data) {
      const boardId = extractBoardId(data);

      if (!boardId) {
        console.error("Received board_deleted event without ID:", data);
        return;
      }

      // Get the current active board
      const boardStore = useBoardStore.getState();
      const isActiveBoard = boardStore.activeBoard === boardId;

      // Remove the board from the store
      useBoardStore.setState(state => {
        // Remove from boards record
        delete state.boards[boardId];

        // Remove from owned/member boards
        state.ownedBoardIds = state.ownedBoardIds.filter(id => id !== boardId);
        state.memberBoardIds = state.memberBoardIds.filter(id => id !== boardId);

        // Clear active board if it's the one being deleted
        if (state.activeBoard === boardId) {
          state.activeBoard = null;
        }
      });

      console.log(`Removed board ${boardId} from boards list via WebSocket`);

      // If this is the active board, show a toast notification
      if (isActiveBoard) {
        useToastStore.getState().info("Эта доска была удалена");
      }
    },

    handleMemberAdded(data) {
      const boardId = normalizeId(data.BoardID || data.boardId || data.board_id);
      const userId = extractUserId(data);
      const email = data.Email || data.email || '';

      if (!boardId || !userId) {
        console.error("Received member_added event with missing data:", data);
        return;
      }

      // Get the current active board
      const boardStore = useBoardStore.getState();
      const isActiveBoard = boardStore.activeBoard === boardId;

      // If we're on the board where the member was added, refresh the members list
      if (isActiveBoard) {
        console.log("Member added to current board, refreshing members list");

        // Refresh the members list
        const membersStore = useMembersStore.getState();
        setTimeout(() => membersStore.fetchBoardMembers(boardId), 0);

        // Get the current user
        const currentUser = useAuthStore.getState().user;
        const currentUserId = currentUser ? normalizeId(currentUser.id) : null;

        // Only show notification if the invitation was not initiated by the current user
        // We can determine this by checking if the event came from a WebSocket broadcast
        // and not from our own action (which would have already shown a notification in ParticipantsModal)
        const isExternalEvent = data._source === 'ws' || data._source === 'server';

        // If this is an external event (not triggered by the current user's action)
        // or if we can't determine the source, show a notification
        if (isExternalEvent) {
          useToastStore.getState().info("Новый участник добавлен на доску");
        }
      }
    },

    handleMemberRemoved(data) {
      const userId = extractUserId(data);
      const boardId = normalizeId(data.boardId || data.BoardID || data.board_id);

      if (!userId) {
        console.error("Received member_removed event without userId:", data);
        return;
      }

      // Get the current user
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;

      // Get the current user ID
      const currentUserId = normalizeId(currentUser.id);

      // Get the current active board
      const boardStore = useBoardStore.getState();
      const isActiveBoard = !boardId || boardStore.activeBoard === boardId;

      // If we're the user being removed, handle it properly
      if (currentUserId && userId === currentUserId) {
        // We've been removed from this board
        useToastStore.getState().error("Вы были удалены с доски");
        console.log("Current user was removed from this board, redirecting to home");

        // Clean up WebSocket connection
        wsClient.disconnect();

        // Remove this board from the boards list in the store
        useBoardStore.setState(state => {
          // Remove from boards record
          if (boardId) {
            delete state.boards[boardId];

            // Remove from member boards
            state.memberBoardIds = state.memberBoardIds.filter(id => id !== boardId);

            // Clear active board if it's the one being removed from
            if (state.activeBoard === boardId) {
              state.activeBoard = null;
            }
          }
        });

        // Remove from members store
        useMembersStore.setState(state => {
          if (boardId && state.boardMembers[boardId]) {
            delete state.boardMembers[boardId];
          }
        });

        // Redirect to home page if we're on the board we were removed from
        if (isActiveBoard) {
          // Use a short timeout to ensure state updates are processed
          setTimeout(() => {
            // Import the navigateTo function which works both inside and outside components
            import('@/hooks/useNavigateAndReload').then(module => {
              // Use the navigateTo function which handles both component and non-component contexts
              module.navigateTo('/boards');
            }).catch(() => {
              // Fallback if the import fails
              window.location.href = '/boards';
            });
          }, 100);
        }
      } else if (isActiveBoard) {
        // Someone else was removed from this board, refresh the members list
        console.log("Another user was removed from this board, refreshing members list");

        // Find the removed member's name if available
        const membersStore = useMembersStore.getState();
        const members = membersStore.getMembersByBoardId(boardId || boardStore.activeBoard || '');
        const removedMember = members.find(m => normalizeId(m.userId) === userId);

        // Only show notification if the removal was not initiated by the current user
        // We can determine this by checking if the event came from a WebSocket broadcast
        // and not from our own action (which would have already shown a notification in ParticipantsModal)
        const isExternalEvent = data._source === 'ws' || data._source === 'server';

        // If this is an external event (not triggered by the current user's action)
        // and we can find the member in our list, show a notification
        if (isExternalEvent && removedMember) {
          const memberName = removedMember.name || removedMember.email || 'Пользователь';
          // Show a toast notification only for removals initiated by other users
          useToastStore.getState().info(`${memberName} был удален с доски`);
        }

        // Refresh the members list
        setTimeout(() => membersStore.fetchBoardMembers(boardId), 0);
      }
    },

    handleMemberLeft(data) {
      const userId = extractUserId(data);
      const boardId = normalizeId(data.boardId || data.BoardID || data.board_id);

      if (!userId) {
        console.error("Received member_left event without userId:", data);
        return;
      }

      // Get the current user
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return;

      // Get the current user ID
      const currentUserId = normalizeId(currentUser.id);

      // Get the current active board
      const boardStore = useBoardStore.getState();
      const isActiveBoard = !boardId || boardStore.activeBoard === boardId;

      // Check if it's the current user who left
      const isCurrentUser = userId === currentUserId;

      if (isCurrentUser) {
        // This should not normally happen as the client initiates the leave
        // But handle it just in case the event comes back to the same client
        console.log(`Current user (${userId}) left board ${boardId}`);

        // No need to do anything as the client-side state should already be updated
        // by the leaveBoard function in useMembersStore
      } else if (isActiveBoard) {
        // Someone else left the board
        console.log(`Member ${userId} left the current board`);

        // Find the member's name if available
        const membersStore = useMembersStore.getState();
        const members = membersStore.getMembersByBoardId(boardId || boardStore.activeBoard || '');
        const leftMember = members.find(m => normalizeId(m.userId) === userId);

        // Only show notification if the action was not initiated by the current user
        // We can determine this by checking if the event came from a WebSocket broadcast
        const isExternalEvent = data._source === 'ws' || data._source === 'server';

        // If this is an external event (not triggered by the current user's action)
        // and we can find the member in our list, show a notification
        if (isExternalEvent && leftMember) {
          const memberName = leftMember.name || leftMember.email || 'Пользователь';
          // Show a toast notification
          useToastStore.getState().info(`${memberName} покинул доску`);
        }

        // Refresh the members list
        setTimeout(() => membersStore.fetchBoardMembers(boardId), 0);
      }
    }
  }))
);

// Helper function to set up WebSocket subscriptions
export function setupWebSocketSubscriptions(boardId: string) {
  return useWebSocketStore.getState().setupBoardSubscriptions(boardId);
}
