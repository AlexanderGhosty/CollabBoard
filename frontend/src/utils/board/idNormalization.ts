/**
 * Utility functions for normalizing IDs between frontend and backend
 */

// Type definitions for API objects with various property name formats
interface ApiObjectWithId {
  ID?: string | number;
  id?: string | number;
}

interface ApiObjectWithBoardId extends ApiObjectWithId {
  BoardID?: string | number;
  boardId?: string | number;
  board_id?: string | number;
}

interface ApiObjectWithListId extends ApiObjectWithId {
  ListID?: string | number;
  listId?: string | number;
  list_id?: string | number;
}

interface ApiObjectWithCardId extends ApiObjectWithId {
  CardID?: string | number;
  cardId?: string | number;
  card_id?: string | number;
}

interface ApiObjectWithUserId {
  UserID?: string | number;
  userId?: string | number;
  user_id?: string | number;
}

interface ApiObjectWithDescription {
  Description?: string | { String: string; Valid: boolean };
  description?: string;
}

/**
 * Normalizes an ID to a string format
 * @param id - The ID to normalize (can be string, number, or undefined)
 * @returns The normalized string ID or undefined if input is undefined
 */
export function normalizeId(id: string | number | undefined): string | undefined {
  if (id === undefined || id === null) return undefined;
  return String(id);
}

/**
 * Extracts a board ID from various possible property names in an object
 * @param obj - The object containing the board ID
 * @returns The normalized board ID as a string or undefined
 */
export function extractBoardId(obj: ApiObjectWithBoardId): string | undefined {
  // Handle both string and number formats
  const boardId = obj.ID || obj.BoardID || obj.boardId || obj.board_id || obj.id;

  // Ensure we convert to string even if it's a number
  return boardId !== undefined ? String(boardId) : undefined;
}

/**
 * Extracts a list ID from various possible property names in an object
 * @param obj - The object containing the list ID
 * @returns The normalized list ID as a string or undefined
 */
export function extractListId(obj: ApiObjectWithListId): string | undefined {
  // Handle both string and number formats
  const listId = obj.ID || obj.id || obj.ListID || obj.listId;

  // Ensure we convert to string even if it's a number
  return listId !== undefined ? String(listId) : undefined;
}

/**
 * Extracts a card ID from various possible property names in an object
 * @param obj - The object containing the card ID
 * @returns The normalized card ID as a string or undefined
 */
export function extractCardId(obj: ApiObjectWithCardId): string | undefined {
  // Handle both string and number formats
  const cardId = obj.ID || obj.id || obj.CardID || obj.cardId;

  // Ensure we convert to string even if it's a number
  return cardId !== undefined ? String(cardId) : undefined;
}

/**
 * Extracts a user ID from various possible property names in an object
 * @param obj - The object containing the user ID
 * @returns The normalized user ID as a string or undefined
 */
export function extractUserId(obj: ApiObjectWithUserId): string | undefined {
  // Handle both string and number formats
  const userId = obj.UserID || obj.userId || obj.user_id;

  // Ensure we convert to string even if it's a number
  return userId !== undefined ? String(userId) : undefined;
}

/**
 * Extracts a description from various possible property formats
 * @param obj - The object containing the description
 * @returns The normalized description as a string
 */
export function extractDescription(obj: ApiObjectWithDescription): string {
  // Handle the description field which could be a string or a pgtype.Text structure
  if (typeof obj.Description === 'string') {
    return obj.Description;
  } else if (obj.Description?.String !== undefined) {
    return obj.Description.String;
  } else if (typeof obj.description === 'string') {
    return obj.description;
  }
  return '';
}
