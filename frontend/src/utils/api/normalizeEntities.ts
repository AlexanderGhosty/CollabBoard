import { Board, Card, List } from '@/services/boardService';

/**
 * API response interfaces to handle both uppercase and lowercase property names
 */
export interface ApiBoard {
  ID?: string | number;
  id?: string | number;
  board_id?: string | number;
  BoardID?: string | number;
  boardId?: string | number;
  Name?: string;
  name?: string;
  OwnerID?: string | number;
  ownerId?: string | number;
  owner_id?: string | number;
  role?: 'owner' | 'member';
  lists?: ApiList[];
}

export interface ApiList {
  ID?: string | number;
  id?: string | number;
  BoardID?: string | number;
  boardId?: string | number;
  board_id?: string | number;
  Title?: string;
  title?: string;
  Position?: number;
  position?: number;
  cards?: ApiCard[];
}

export interface ApiCard {
  ID?: string | number;
  id?: string | number;
  ListID?: string | number;
  listId?: string | number;
  list_id?: string | number;
  Title?: string;
  title?: string;
  Description?: string | { String: string; Valid: boolean };
  description?: string;
  Position?: number;
  position?: number;
}

export interface ApiBoardMember {
  user_id?: string | number;
  userId?: string | number;
  UserID?: string | number;
  board_id?: string | number;
  boardId?: string | number;
  BoardID?: string | number;
  name?: string;
  Name?: string;
  email?: string;
  Email?: string;
  role?: string;
  Role?: string;
}

export interface BoardMember {
  userId: string;
  boardId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}

/**
 * Normalize a board from API response
 */
export function normalizeBoard(data: ApiBoard, providedBoardId?: string): Board {
  // Extract ID from various possible formats
  const boardId = String(
    data.ID || data.id || data.BoardID || data.boardId || data.board_id || providedBoardId || ''
  );

  // Extract name from various possible formats
  const name = data.Name || data.name || '';

  // Extract owner ID from various possible formats
  const ownerId = data.OwnerID 
    ? String(data.OwnerID) 
    : (data.ownerId 
      ? String(data.ownerId) 
      : (data.owner_id 
        ? String(data.owner_id) 
        : undefined));

  return {
    id: boardId,
    name,
    ownerId,
    role: data.role || 'member',
    lists: Array.isArray(data.lists) ? data.lists.map(list => normalizeList(list, boardId)) : []
  };
}

/**
 * Normalize a list from API response
 */
export function normalizeList(data: ApiList, providedBoardId?: string): List {
  // Extract ID from various possible formats
  const listId = String(data.ID || data.id || '');

  // Extract board ID from various possible formats
  const boardId = String(
    data.BoardID || data.boardId || data.board_id || providedBoardId || ''
  );

  return {
    id: listId,
    boardId,
    title: data.Title || data.title || '',
    position: data.Position || data.position || 0,
    cards: Array.isArray(data.cards) ? data.cards.map(card => normalizeCard(card, listId)) : []
  };
}

/**
 * Normalize a card from API response
 */
export function normalizeCard(data: ApiCard, providedListId?: string): Card {
  // Extract ID from various possible formats
  const cardId = String(data.ID || data.id || '');

  // Extract list ID from various possible formats
  const listId = String(
    data.ListID || data.listId || data.list_id || providedListId || ''
  );

  // Handle the description field which could be a string or a pgtype.Text structure
  let description = '';
  if (typeof data.Description === 'string') {
    description = data.Description;
  } else if (data.Description?.String !== undefined) {
    description = data.Description.String;
  } else if (data.description) {
    description = data.description;
  }

  return {
    id: cardId,
    listId,
    title: data.Title || data.title || '',
    description,
    position: data.Position || data.position || 0
  };
}

/**
 * Normalize a board member from API response
 */
export function normalizeBoardMember(data: ApiBoardMember, providedBoardId?: string): BoardMember {
  // Extract user ID from various possible formats
  const userId = String(
    data.user_id || data.userId || data.UserID || ''
  );

  // Extract board ID from various possible formats
  const boardId = String(
    data.board_id || data.boardId || data.BoardID || providedBoardId || ''
  );

  return {
    userId,
    boardId,
    name: data.name || data.Name || 'Unknown',
    email: data.email || data.Email || '',
    role: (data.role || data.Role || 'member') as 'owner' | 'member'
  };
}
