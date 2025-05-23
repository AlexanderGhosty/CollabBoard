/**
 * API endpoints organized by entity type
 */

export const BOARD_ENDPOINTS = {
  boards: '/boards',
  board: (id: string) => `/boards/${id}`,
  boardsByRole: (role: string) => `/boards/by-role/${role}`,
  boardMembers: (boardId: string) => `/boards/${boardId}/members`,
  inviteMember: (boardId: string) => `/boards/${boardId}/members/invite`,
  removeMember: (boardId: string, userId: string) => `/boards/${boardId}/members/${userId}`,
  leaveBoard: (boardId: string) => `/boards/${boardId}/members/leave`,
};

export const LIST_ENDPOINTS = {
  lists: (boardId: string) => `/boards/${boardId}/lists`,
  list: (boardId: string, listId: string) => `/boards/${boardId}/lists/${listId}`,
  moveList: (boardId: string, listId: string) => `/boards/${boardId}/lists/${listId}/move`,
};

export const CARD_ENDPOINTS = {
  cards: (listId: string | number) => `/lists/${listId}/cards`,
  card: (listId: string, cardId: string) => `/lists/${listId}/cards/${cardId}`,
  moveCard: (listId: string, cardId: string) => `/lists/${listId}/cards/${cardId}/move`,
  duplicateCard: (cardId: string) => `/cards/${cardId}/duplicate`,
};

/**
 * Combined endpoints for backward compatibility
 */
export const ENDPOINTS = {
  ...BOARD_ENDPOINTS,
  ...LIST_ENDPOINTS,
  ...CARD_ENDPOINTS,
};
