import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Card } from '@/services/boardService';
import { cardService } from '@/services/cardService';
import { useToastStore } from '@/store/useToastStore';
import { CardsState } from './types';
import { sortCards, getNextCardPosition } from '@/utils/board/sorting';

export const useCardsStore = create<CardsState>()(
  immer((set, get) => ({
    // State
    cards: {},
    listCards: {},
    loading: false,
    error: null,

    // Selectors
    getCardsByListId(listId) {
      const listCards = get().listCards[listId] || [];
      return listCards.map(cardId => get().cards[cardId]).filter(Boolean);
    },

    getSortedCardsByListId(listId) {
      const cards = get().getCardsByListId(listId);
      return sortCards(cards);
    },

    // Card operations
    async createCard(listId, title, description = '') {
      set((s) => { s.loading = true; s.error = null; });

      try {
        console.log(`Creating card in list ${listId} with title "${title}"`);

        // Calculate position for the new card (at the end)
        const cards = get().getCardsByListId(listId);
        const position = getNextCardPosition(cards);

        console.log(`Calculated position for new card: ${position}`);

        // Create the card
        const card = await cardService.createCard(listId, title, description, position);

        console.log("Card created successfully:", card);

        // Ensure we have a valid card ID
        if (!card.id) {
          throw new Error("Created card has no ID");
        }

        set((s) => {
          // Add to cards record
          s.cards[card.id] = card;

          // Add to listCards relationship
          if (!s.listCards[listId]) {
            s.listCards[listId] = [];
          }

          // Check if card already exists in the relationship
          if (!s.listCards[listId].includes(card.id)) {
            s.listCards[listId].push(card.id);
          }

          s.loading = false;
        });

        // Debug the state after update
        const updatedState = get();
        console.log(`After card creation - Cards for list ${listId}:`,
          updatedState.getCardsByListId(listId));

        // Force a state update to trigger UI refresh
        set(state => ({ ...state }));

        return card;
      } catch (error) {
        console.error(`Error creating card in list ${listId}:`, error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to create card: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось создать карточку");
        throw error;
      }
    },

    async updateCard(cardId, updates) {
      const card = get().cards[cardId];

      if (!card) {
        console.error(`Card with ID ${cardId} not found`);
        return;
      }

      // Store original values for rollback
      const originalTitle = card.title;
      const originalDescription = card.description;

      // Optimistic update
      set((s) => {
        if (s.cards[cardId]) {
          if (updates.title !== undefined) {
            s.cards[cardId].title = updates.title;
          }
          if (updates.description !== undefined) {
            s.cards[cardId].description = updates.description;
          }
        }
      });

      try {
        // Call API to update the card
        const updatedCard = await cardService.updateCard(cardId, card.listId, updates);
      } catch (error) {
        console.error(`Error updating card ${cardId}:`, error);

        // Revert optimistic update
        set((s) => {
          if (s.cards[cardId]) {
            if (updates.title !== undefined) {
              s.cards[cardId].title = originalTitle;
            }
            if (updates.description !== undefined) {
              s.cards[cardId].description = originalDescription;
            }
          }
        });

        // Show error toast
        useToastStore.getState().error("Не удалось обновить карточку");
      }
    },

    async duplicateCard(cardId) {
      const card = get().cards[cardId];

      if (!card) {
        console.error(`Card with ID ${cardId} not found`);
        return;
      }

      set((s) => { s.loading = true; s.error = null; });

      try {
        // Call API to duplicate the card
        const duplicatedCard = await cardService.duplicateCard(cardId);

        set((s) => {
          // Add to cards record
          s.cards[duplicatedCard.id] = duplicatedCard;

          // Add to listCards relationship
          const listId = duplicatedCard.listId;
          if (!s.listCards[listId]) {
            s.listCards[listId] = [];
          }

          // Check if card already exists in the relationship
          if (!s.listCards[listId].includes(duplicatedCard.id)) {
            s.listCards[listId].push(duplicatedCard.id);
          }

          s.loading = false;
        });

        // Show success toast
        useToastStore.getState().success("Карточка дублирована");
      } catch (error) {
        console.error(`Error duplicating card ${cardId}:`, error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to duplicate card: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось дублировать карточку");
      }
    },

    async moveCard(cardId, toListId, toPos) {
      const card = get().cards[cardId];

      if (!card) {
        console.error(`Card with ID ${cardId} not found`);
        return;
      }

      const fromListId = card.listId;

      // Optimistic update
      set((s) => {
        // Remove card from source list
        if (s.listCards[fromListId]) {
          s.listCards[fromListId] = s.listCards[fromListId].filter(id => id !== cardId);
        }

        // Add card to destination list at the specified position
        if (!s.listCards[toListId]) {
          s.listCards[toListId] = [];
        }

        // Update card's listId
        s.cards[cardId].listId = toListId;

        // Insert card at the specified position
        const destCards = get().getCardsByListId(toListId);
        destCards.sort((a, b) => a.position - b.position);

        // Update positions of cards in the destination list
        destCards.forEach((c, idx) => {
          if (idx + 1 >= toPos) {
            s.cards[c.id].position = idx + 2; // +2 because we're inserting at position toPos
          } else {
            s.cards[c.id].position = idx + 1;
          }
        });

        // Set the moved card's position
        s.cards[cardId].position = toPos;

        // Update the listCards relationship
        s.listCards[toListId] = destCards.map(c => c.id);
        if (!s.listCards[toListId].includes(cardId)) {
          s.listCards[toListId].push(cardId);
        }
      });

      try {
        // Call API to move the card
        await cardService.moveCard(cardId, toListId, toPos);
      } catch (error) {
        console.error(`Error moving card ${cardId} to list ${toListId}:`, error);

        // Show error toast
        useToastStore.getState().error("Не удалось переместить карточку");

        // Reload the board to get the correct state
        // This is a fallback in case the optimistic update fails
        const boardStore = useBoardStore.getState();
        if (boardStore.activeBoard) {
          boardStore.loadBoard(boardStore.activeBoard);
        }
      }
    },

    async deleteCard(cardId) {
      const card = get().cards[cardId];

      if (!card) {
        console.error(`Card with ID ${cardId} not found`);
        return;
      }

      const listId = card.listId;

      try {
        await cardService.deleteCard(cardId, listId);

        set((s) => {
          // Remove from cards record
          delete s.cards[cardId];

          // Remove from listCards relationship
          if (s.listCards[listId]) {
            s.listCards[listId] = s.listCards[listId].filter(id => id !== cardId);
          }
        });

        // Show success toast
        useToastStore.getState().success("Карточка удалена");
      } catch (error) {
        console.error(`Error deleting card ${cardId}:`, error);

        // Show error toast
        useToastStore.getState().error("Не удалось удалить карточку");
      }
    }
  }))
);
