import { Card, List, Board } from '@/services/boardService';
import { WSMessage } from '@/services/websocket';

// Base state interface with common properties
export interface BaseState {
  loading: boolean;
  error: string | null;
}

// Normalized entity collections
export interface NormalizedEntities {
  boards: Record<string, Board>;
  lists: Record<string, List>;
  cards: Record<string, Card>;
  members: Record<string, BoardMember>;
}

// Relationship maps
export interface EntityRelationships {
  boardLists: Record<string, string[]>;
  listCards: Record<string, string[]>;
  boardMembers: Record<string, string[]>;
}

// Board member interface
export interface BoardMember {
  userId: string;
  boardId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}

// Core board state
export interface BoardState extends BaseState {
  // Collections
  boards: Record<string, Board>;
  ownedBoardIds: string[];
  memberBoardIds: string[];
  activeBoard: string | null;
  boardMembers: Record<string, BoardMember>;

  // UI state
  isCardModalOpen: boolean;

  // Core board operations
  fetchBoards: () => Promise<void>;
  fetchBoardsByRole: () => Promise<void>;
  loadBoard: (id: string) => Promise<void>;
  createBoard: (name: string) => Promise<Board>;
  deleteBoard: (boardId: string) => Promise<void>;
  updateBoardName: (boardId: string, name: string) => Promise<void>;

  // Modal state management
  setCardModalOpen: (isOpen: boolean) => void;

  // WebSocket event handling
  applyWS: (msg: WSMessage) => void;

  // Cleanup
  cleanup: () => void;
}

// List operations state
export interface ListsState extends BaseState {
  lists: Record<string, List>;
  boardLists: Record<string, string[]>;

  createList: (boardId: string, title: string) => Promise<void>;
  updateList: (listId: string, title: string) => Promise<void>;
  moveList: (listId: string, position: number) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  setLists: (lists: List[], boardId: string) => void;

  // Selectors
  getListsByBoardId: (boardId: string) => List[];
  getSortedListsByBoardId: (boardId: string) => List[];
}

// Card operations state
export interface CardsState extends BaseState {
  cards: Record<string, Card>;
  listCards: Record<string, string[]>;

  createCard: (listId: string, title: string, description?: string) => Promise<void>;
  updateCard: (cardId: string, updates: { title?: string; description?: string }) => Promise<void>;
  duplicateCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, toListId: string, toPos: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;

  // Selectors
  getCardsByListId: (listId: string) => Card[];
  getSortedCardsByListId: (listId: string) => Card[];
}

// Member operations state
export interface MembersState extends BaseState {
  members: Record<string, BoardMember>;
  boardMembers: Record<string, string[]>;

  fetchBoardMembers: (boardId?: string) => Promise<void>;
  inviteMember: (email: string, role?: 'owner' | 'member') => Promise<void>;
  removeMember: (userId: string, boardId?: string) => Promise<void>;
  leaveBoard: () => Promise<void>;
  updateUserRoleInBoard: (boardId: string, members: BoardMember[]) => void;

  // Selectors
  getMembersByBoardId: (boardId: string) => BoardMember[];
  isUserBoardOwner: (boardId: string, userId: string) => boolean;
}

// WebSocket event data types
export interface WSCardData {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
}

export interface WSListData {
  id: string;
  boardId: string;
  title: string;
  position: number;
}

export interface WSBoardData {
  id: string;
  name: string;
  ownerId?: string;
}

export interface WSMemberData {
  userId: string;
  boardId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}

// WebSocket state
export interface WebSocketState {
  setupBoardSubscriptions: (boardId: string) => () => void;
  handleCardCreated: (data: WSCardData) => void;
  handleCardUpdated: (data: WSCardData) => void;
  handleCardMoved: (data: WSCardData) => void;
  handleCardDeleted: (data: { id: string; listId: string }) => void;
  handleListCreated: (data: WSListData) => void;
  handleListUpdated: (data: WSListData) => void;
  handleListMoved: (data: WSListData) => void;
  handleListDeleted: (data: { id: string; boardId: string }) => void;
  handleBoardCreated: (data: WSBoardData) => void;
  handleBoardUpdated: (data: WSBoardData) => void;
  handleBoardDeleted: (data: { id: string }) => void;
  handleMemberAdded: (data: WSMemberData) => void;
  handleMemberRemoved: (data: { userId: string; boardId: string }) => void;
}

// Combined store type
export interface CombinedBoardStore extends
  BoardState,
  ListsState,
  CardsState,
  MembersState,
  WebSocketState {}
