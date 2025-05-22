import { useBoardStore } from './useBoardStore';
import { useListsStore } from './useListsStore';
import { useCardsStore } from './useCardsStore';
import { useMembersStore } from './useMembersStore';
import { useWebSocketStore, setupWebSocketSubscriptions } from './useWebSocketStore';
import { CombinedBoardStore } from './types';

/**
 * Combined hook that provides access to all board-related store functionality
 * @returns Combined board store with all functionality
 */
export function useCombinedBoardStore(): CombinedBoardStore {
  const boardStore = useBoardStore();
  const listsStore = useListsStore();
  const cardsStore = useCardsStore();
  const membersStore = useMembersStore();
  const webSocketStore = useWebSocketStore();
  
  return {
    // Board state
    boards: boardStore.boards,
    ownedBoardIds: boardStore.ownedBoardIds,
    memberBoardIds: boardStore.memberBoardIds,
    activeBoard: boardStore.activeBoard,
    boardMembers: boardStore.boardMembers,
    isCardModalOpen: boardStore.isCardModalOpen,
    isMemberModalOpen: boardStore.isMemberModalOpen,
    loading: boardStore.loading,
    error: boardStore.error,
    
    // Board operations
    fetchBoards: boardStore.fetchBoards,
    fetchBoardsByRole: boardStore.fetchBoardsByRole,
    loadBoard: boardStore.loadBoard,
    createBoard: boardStore.createBoard,
    deleteBoard: boardStore.deleteBoard,
    updateBoardName: boardStore.updateBoardName,
    
    // UI state methods
    setCardModalOpen: boardStore.setCardModalOpen,
    setMemberModalOpen: boardStore.setMemberModalOpen,
    
    // Lists state
    lists: listsStore.lists,
    boardLists: listsStore.boardLists,
    
    // Lists operations
    createList: listsStore.createList,
    updateList: listsStore.updateList,
    moveList: listsStore.moveList,
    deleteList: listsStore.deleteList,
    
    // Lists selectors
    getListsByBoardId: listsStore.getListsByBoardId,
    getSortedListsByBoardId: listsStore.getSortedListsByBoardId,
    
    // Cards state
    cards: cardsStore.cards,
    listCards: cardsStore.listCards,
    
    // Cards operations
    createCard: cardsStore.createCard,
    updateCard: cardsStore.updateCard,
    duplicateCard: cardsStore.duplicateCard,
    moveCard: cardsStore.moveCard,
    deleteCard: cardsStore.deleteCard,
    
    // Cards selectors
    getCardsByListId: cardsStore.getCardsByListId,
    getSortedCardsByListId: cardsStore.getSortedCardsByListId,
    
    // Members state
    members: membersStore.members,
    
    // Members operations
    fetchBoardMembers: membersStore.fetchBoardMembers,
    inviteMember: membersStore.inviteMember,
    removeMember: membersStore.removeMember,
    
    // Members selectors
    getMembersByBoardId: membersStore.getMembersByBoardId,
    isUserBoardOwner: membersStore.isUserBoardOwner,
    
    // WebSocket operations
    setupBoardSubscriptions: webSocketStore.setupBoardSubscriptions,
    handleCardCreated: webSocketStore.handleCardCreated,
    handleCardUpdated: webSocketStore.handleCardUpdated,
    handleCardMoved: webSocketStore.handleCardMoved,
    handleCardDeleted: webSocketStore.handleCardDeleted,
    handleListCreated: webSocketStore.handleListCreated,
    handleListUpdated: webSocketStore.handleListUpdated,
    handleListMoved: webSocketStore.handleListMoved,
    handleListDeleted: webSocketStore.handleListDeleted,
    handleBoardCreated: webSocketStore.handleBoardCreated,
    handleBoardUpdated: webSocketStore.handleBoardUpdated,
    handleBoardDeleted: webSocketStore.handleBoardDeleted,
    handleMemberAdded: webSocketStore.handleMemberAdded,
    handleMemberRemoved: webSocketStore.handleMemberRemoved,
    
    // WebSocket event handling
    applyWS: boardStore.applyWS,
    
    // Cleanup
    cleanup: boardStore.cleanup,
  };
}

// Export individual stores for direct access if needed
export {
  useBoardStore,
  useListsStore,
  useCardsStore,
  useMembersStore,
  useWebSocketStore,
  setupWebSocketSubscriptions
};

// Export types
export * from './types';
