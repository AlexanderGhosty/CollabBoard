import { useAuthStore } from '@/store/useAuthStore';
import { BoardMember } from '@/store/board/types';
import { Board } from '@/services/boardService';
import { normalizeId } from './idNormalization';

/**
 * Checks if the current user is the owner of a board
 * @param board - The board to check
 * @param boardMembers - The members of the board
 * @returns True if the current user is the owner, false otherwise
 */
export function isCurrentUserBoardOwner(
  board: Board | null, 
  boardMembers: BoardMember[]
): boolean {
  if (!board) return false;
  
  // Get current user ID from auth store
  const { user } = useAuthStore.getState();
  if (!user) return false;
  
  // Convert to string for comparison
  const currentUserIdStr = normalizeId(user.id) || '';
  
  // Check if user has owner role in board.role
  const isOwnerByRole = board.role === 'owner';
  
  // Check if user has owner role in members list
  const isUserOwnerInMembers = boardMembers.some(m => 
    normalizeId(m.userId) === currentUserIdStr && m.role === 'owner'
  );
  
  // Check both uppercase and lowercase ownerId properties
  const ownerIdFromUpperCase = normalizeId(board.OwnerID);
  const ownerIdFromLowerCase = normalizeId(board.ownerId);
  const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;
  const isOwnerByBoardData = ownerId === currentUserIdStr;
  
  // Combined check - user is owner if any of the checks pass
  return isOwnerByRole || isUserOwnerInMembers || isOwnerByBoardData;
}

/**
 * Checks if a specific user is the owner of a board
 * @param board - The board to check
 * @param boardMembers - The members of the board
 * @param userId - The ID of the user to check
 * @returns True if the user is the owner, false otherwise
 */
export function isUserBoardOwner(
  board: Board | null, 
  boardMembers: BoardMember[],
  userId: string
): boolean {
  if (!board) return false;
  
  // Convert to string for comparison
  const userIdStr = normalizeId(userId) || '';
  
  // Check if user has owner role in members list
  const isUserOwnerInMembers = boardMembers.some(m => 
    normalizeId(m.userId) === userIdStr && m.role === 'owner'
  );
  
  // Check both uppercase and lowercase ownerId properties
  const ownerIdFromUpperCase = normalizeId(board.OwnerID);
  const ownerIdFromLowerCase = normalizeId(board.ownerId);
  const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;
  const isOwnerByBoardData = ownerId === userIdStr;
  
  // Combined check - user is owner if any of the checks pass
  return isUserOwnerInMembers || isOwnerByBoardData;
}

/**
 * Checks if the current user can edit a board (is owner or member)
 * @param board - The board to check
 * @param boardMembers - The members of the board
 * @returns True if the current user can edit the board, false otherwise
 */
export function canCurrentUserEditBoard(
  board: Board | null, 
  boardMembers: BoardMember[]
): boolean {
  if (!board) return false;
  
  // Get current user ID from auth store
  const { user } = useAuthStore.getState();
  if (!user) return false;
  
  // Convert to string for comparison
  const currentUserIdStr = normalizeId(user.id) || '';
  
  // Check if user is in members list (any role)
  const isUserInMembers = boardMembers.some(m => 
    normalizeId(m.userId) === currentUserIdStr
  );
  
  // Check if user is the owner
  const isOwner = isCurrentUserBoardOwner(board, boardMembers);
  
  return isUserInMembers || isOwner;
}
