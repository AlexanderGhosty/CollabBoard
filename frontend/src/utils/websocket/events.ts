import { sendWS } from '@/services/websocket';
import { Board, Card, List } from '@/services/boardService';
import { BoardMember } from '@/utils/api/normalizeEntities';

/**
 * WebSocket event types
 */
export enum WebSocketEventType {
  // Board events
  BOARD_CREATED = 'board_created',
  BOARD_UPDATED = 'board_updated',
  BOARD_DELETED = 'board_deleted',
  
  // List events
  LIST_CREATED = 'list_created',
  LIST_UPDATED = 'list_updated',
  LIST_MOVED = 'list_moved',
  LIST_DELETED = 'list_deleted',
  
  // Card events
  CARD_CREATED = 'card_created',
  CARD_UPDATED = 'card_updated',
  CARD_MOVED = 'card_moved',
  CARD_DELETED = 'card_deleted',
  
  // Member events
  MEMBER_ADDED = 'member_added',
  MEMBER_REMOVED = 'member_removed',
  
  // System events
  PING = 'ping',
}

/**
 * Send a board-related WebSocket event
 */
export function sendBoardEvent(type: WebSocketEventType, data: Board): void {
  console.log(`Sending WebSocket event: ${type}`, data);
  sendWS({ event: type, data });
}

/**
 * Send a list-related WebSocket event
 */
export function sendListEvent(type: WebSocketEventType, data: List): void {
  console.log(`Sending WebSocket event: ${type}`, data);
  sendWS({ event: type, data });
}

/**
 * Send a card-related WebSocket event
 */
export function sendCardEvent(type: WebSocketEventType, data: Card): void {
  console.log(`Sending WebSocket event: ${type}`, data);
  sendWS({ event: type, data });
}

/**
 * Send a list deletion WebSocket event
 */
export function sendListDeletedEvent(listId: string, boardId: string): void {
  console.log(`Sending WebSocket event: ${WebSocketEventType.LIST_DELETED}`, { id: listId, boardId });
  sendWS({
    event: WebSocketEventType.LIST_DELETED,
    data: {
      id: listId,
      boardId
    }
  });
}

/**
 * Send a card deletion WebSocket event
 */
export function sendCardDeletedEvent(cardId: string): void {
  console.log(`Sending WebSocket event: ${WebSocketEventType.CARD_DELETED}`, { cardId });
  sendWS({
    event: WebSocketEventType.CARD_DELETED,
    data: { cardId }
  });
}

/**
 * Send a member-related WebSocket event
 */
export function sendMemberEvent(type: WebSocketEventType, data: BoardMember | { boardId: string, userId: string }): void {
  console.log(`Sending WebSocket event: ${type}`, data);
  sendWS({ event: type, data });
}
