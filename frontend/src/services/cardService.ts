import { api } from '@/services/api';
import { CARD_ENDPOINTS } from '@/utils/api/apiEndpoints';
import { ApiCard, normalizeCard } from '@/utils/api/normalizeEntities';
import { handleApiError } from '@/utils/api/errorHandling';
import { WebSocketEventType, sendCardEvent, sendCardDeletedEvent } from '@/utils/websocket/events';
import { Card } from '@/services/boardService';

/**
 * Card service - handles card-related operations
 */
export const cardService = {
  /** Получить карточки для списка */
  async fetchListCards(listId: string): Promise<Card[]> {
    try {
      console.log(`Fetching cards for list ${listId}`);
      const { data } = await api.get<ApiCard[]>(CARD_ENDPOINTS.cards(listId));
      console.log(`Raw cards data for list ${listId}:`, data);

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array of cards but got:", data);
        return [];
      }

      // Normalize the cards data
      return data.map(card => normalizeCard(card, listId));
    } catch (error) {
      console.error(`Error fetching cards for list ${listId}:`, error);
      throw handleApiError(error);
    }
  },

  /** Создать карточку */
  async createCard(listId: string, title: string, description: string = '', position: number): Promise<Card> {
    try {
      console.log("Creating card with params:", { listId, title, description, position });

      const { data } = await api.post<ApiCard>(CARD_ENDPOINTS.cards(listId), {
        title,
        description,
        position
      });

      console.log("Raw card data from API:", data);

      // Ensure we have a valid response
      if (!data) {
        throw new Error("No data returned from API");
      }

      // Normalize the card data
      const normalizedCard = normalizeCard(data, listId);
      console.log("Normalized card:", normalizedCard);

      // Send WebSocket event
      sendCardEvent(WebSocketEventType.CARD_CREATED, normalizedCard);

      return normalizedCard;
    } catch (error) {
      console.error("Error creating card:", error);
      throw handleApiError(error);
    }
  },

  /** Обновить карточку */
  async updateCard(cardId: string, listId: string, updates: { title?: string; description?: string }): Promise<Card> {
    try {
      console.log(`Updating card ${cardId} in list ${listId}:`, updates);

      const { data } = await api.put<ApiCard>(CARD_ENDPOINTS.card(listId, cardId), updates);
      console.log("Raw updated card data from API:", data);

      // Normalize the card data
      const normalizedCard = normalizeCard(data, listId);
      console.log("Card updated successfully:", normalizedCard);

      // Send WebSocket event
      sendCardEvent(WebSocketEventType.CARD_UPDATED, normalizedCard);

      return normalizedCard;
    } catch (error) {
      console.error("Error updating card:", error);
      throw handleApiError(error);
    }
  },

  /** Переместить карточку (между списками или внутри списка) */
  async moveCard(cardId: string, toListId: string, toPos: number): Promise<void> {
    try {
      console.log(`Moving card ${cardId} to list ${toListId} at position ${toPos}`);

      // Convert listId to number for the backend
      const listIdNum = parseInt(toListId);

      // Use PUT method as expected by the backend
      await api.put(CARD_ENDPOINTS.moveCard(toListId, cardId), {
        listId: listIdNum,
        position: toPos
      });

      console.log("Card moved successfully");

      // No need to send WebSocket event here
      // The backend will broadcast the event to all clients including this one
    } catch (error) {
      console.error("Error moving card:", error);
      throw handleApiError(error);
    }
  },

  /** Удалить карточку */
  async deleteCard(cardId: string, listId: string): Promise<void> {
    try {
      console.log(`Deleting card ${cardId} from list ${listId}`);
      await api.delete(CARD_ENDPOINTS.card(listId, cardId));
      console.log("Card deleted successfully");
      
      // Send WebSocket event
      sendCardDeletedEvent(cardId);
    } catch (error) {
      console.error("Error deleting card:", error);
      throw handleApiError(error);
    }
  },

  /** Дублировать карточку */
  async duplicateCard(cardId: string): Promise<Card> {
    try {
      console.log(`Duplicating card ${cardId}`);
      const { data } = await api.post<ApiCard>(CARD_ENDPOINTS.duplicateCard(cardId));
      console.log("Raw duplicated card data from API:", data);

      // Normalize the card data
      const normalizedCard = normalizeCard(data);
      console.log("Card duplicated successfully:", normalizedCard);

      // Send WebSocket event
      sendCardEvent(WebSocketEventType.CARD_CREATED, normalizedCard);

      return normalizedCard;
    } catch (error) {
      console.error("Error duplicating card:", error);
      throw handleApiError(error);
    }
  },
};
