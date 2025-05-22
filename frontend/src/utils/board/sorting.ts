import { List, Card } from '@/services/boardService';

/**
 * Sorts lists by their position property
 * @param lists - The lists to sort
 * @returns A new array of sorted lists
 */
export function sortLists(lists: List[]): List[] {
  return [...lists].sort((a, b) => a.position - b.position);
}

/**
 * Sorts cards by their position property
 * @param cards - The cards to sort
 * @returns A new array of sorted cards
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.position - b.position);
}

/**
 * Normalizes list positions to be sequential (1, 2, 3, ...) without gaps
 * @param lists - The lists to normalize
 * @returns A new array of lists with normalized positions
 */
export function normalizeListPositions(lists: List[]): List[] {
  const sortedLists = sortLists(lists);
  
  return sortedLists.map((list, index) => ({
    ...list,
    position: index + 1
  }));
}

/**
 * Normalizes card positions to be sequential (1, 2, 3, ...) without gaps
 * @param cards - The cards to normalize
 * @returns A new array of cards with normalized positions
 */
export function normalizeCardPositions(cards: Card[]): Card[] {
  const sortedCards = sortCards(cards);
  
  return sortedCards.map((card, index) => ({
    ...card,
    position: index + 1
  }));
}

/**
 * Calculates the next position for a new list
 * @param lists - The existing lists
 * @returns The next position value
 */
export function getNextListPosition(lists: List[]): number {
  if (lists.length === 0) return 1;
  return Math.max(...lists.map(list => list.position)) + 1;
}

/**
 * Calculates the next position for a new card in a list
 * @param cards - The existing cards in the list
 * @returns The next position value
 */
export function getNextCardPosition(cards: Card[]): number {
  if (cards.length === 0) return 1;
  return Math.max(...cards.map(card => card.position)) + 1;
}
