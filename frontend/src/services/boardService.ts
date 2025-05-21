import { api } from '@/services/api';
import { sendWS } from '@/services/websocket';
import { useBoardStore } from '@/store/useBoardStore';
import { useAuthStore } from '@/store/useAuthStore';

/** Типы сущностей (минимально‑необходимые) */
export type Card  = {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number
};
export type List  = { id: string; boardId: string; title: string; position: number; cards: Card[] };
export type Board = {
  id: string;
  name: string;  // Changed from 'title' to 'name' to match backend
  ownerId?: string; // Added to match backend
  role?: 'owner' | 'member'; // Added for board sharing feature
  lists: List[]
};

const ENDPOINTS = {
  boards: '/boards',
  board:  (id: string)        => `/boards/${id}`,
  lists:  (boardId: string)   => `/boards/${boardId}/lists`,
  list:   (listId: string)    => `/lists/${listId}`,
  moveList: (boardId: string, listId: string)  => `/boards/${boardId}/lists/${listId}/move`,
  cards:  (listId: string | number) => `/lists/${listId}/cards`,
  card:   (listId: string, cardId: string) => `/lists/${listId}/cards/${cardId}`,
  moveCard: (listId: string, cardId: string) => `/lists/${listId}/cards/${cardId}/move`,
  dup:    (cardId: string)    => `/cards/${cardId}/duplicate`,
};

export const boardService = {
  /** Получить все доски текущего пользователя */
  async getBoards(): Promise<Board[]> {
    const { data } = await api.get<any[]>(ENDPOINTS.boards);
    console.log("Raw board data from API:", data); // Debug log

    // Ensure all IDs are strings and handle the BoardID field from backend
    return data.map(board => {
      // The backend returns BoardID instead of id
      const boardId = board.BoardID || board.boardId || board.id || board.board_id;
      // The backend returns Name or name
      const boardName = board.Name || board.name;

      if (!boardId) {
        console.error("Board without ID received:", board);
      }

      return {
        ...board,
        // Use BoardID as the primary id field if available
        id: boardId ? String(boardId) : undefined,
        // Ensure name is properly set
        name: boardName,
        ownerId: board.OwnerID ? String(board.OwnerID) : (board.ownerId ? String(board.ownerId) : undefined),
        role: board.role || 'member', // Include role if available
        lists: board.lists || []
      };
    }).filter(board => board.id); // Filter out boards without IDs
  },

  /** Получить доски по роли пользователя (owner/member) */
  async getBoardsByRole(role: 'owner' | 'member'): Promise<Board[]> {
    try {
      const { data } = await api.get<any[]>(`${ENDPOINTS.boards}/by-role/${role}`);
      console.log(`Raw board data for role ${role} from API:`, data);

      // Check if data is null or undefined, return empty array if it is
      if (!data) {
        console.warn(`No data returned for role ${role}, returning empty array`);
        return [];
      }

      // Ensure all IDs are strings and handle the BoardID field from backend
      return data.map(board => {
        // The backend returns board_id instead of id
        const boardId = board.board_id || board.BoardID || board.boardId || board.id;
        // The backend returns Name or name
        const boardName = board.Name || board.name;

        if (!boardId) {
          console.error("Board without ID received:", board);
        }

        return {
          ...board,
          id: boardId ? String(boardId) : undefined,
          name: boardName,
          ownerId: board.owner_id ? String(board.owner_id) :
                  (board.OwnerID ? String(board.OwnerID) :
                  (board.ownerId ? String(board.ownerId) : undefined)),
          role: board.role || role, // Include role from response or use the requested role
          lists: board.lists || []
        };
      }).filter(board => board.id); // Filter out boards without IDs
    } catch (error) {
      console.error(`Error fetching boards for role ${role}:`, error);
      return []; // Return empty array on error
    }
  },

  /** Получить доску по ID */
  async getBoardById(id: string): Promise<Board> {
    console.log(`Fetching board with ID: ${id}`);

    // Step 1: Fetch the board data
    const { data: boardData } = await api.get<any>(ENDPOINTS.board(id));
    console.log("Raw board data:", boardData);

    // Step 2: Fetch the lists for this board
    const { data: listsData } = await api.get<any[]>(ENDPOINTS.lists(id));
    console.log("Raw lists data:", listsData);

    // Step 3: Fetch board members to determine the current user's role
    let userRole: 'owner' | 'member' = 'member'; // Default to member
    try {
      const members = await this.getBoardMembers(id);
      console.log("Board members:", members);

      // Get current user ID from auth store
      const { user } = useAuthStore.getState();
      const currentUserId = user?.id;
      console.log("Current user ID:", currentUserId);

      if (currentUserId) {
        // Convert to string for comparison
        const currentUserIdStr = String(currentUserId);

        // Log all member user IDs for debugging
        if (members.length > 0) {
          console.log("All member user IDs:", members.map(m => String(m.userId)));
        }

        // Find the current user in the members list
        const currentUserMember = members.find(m => String(m.userId) === currentUserIdStr);
        console.log("Current user member data:", currentUserMember);

        if (currentUserMember) {
          userRole = currentUserMember.role as 'owner' | 'member';
          console.log("User role on this board:", userRole);
        } else {
          // If user is not found in members list but is the owner of the board
          // This is a fallback in case the board_members table doesn't have an entry
          const ownerIdFromUpperCase = boardData.OwnerID ? String(boardData.OwnerID) : undefined;
          const ownerIdFromLowerCase = boardData.ownerId ? String(boardData.ownerId) : undefined;
          const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;

          console.log("Checking owner ID match:");
          console.log("- Owner ID from uppercase:", ownerIdFromUpperCase);
          console.log("- Owner ID from lowercase:", ownerIdFromLowerCase);
          console.log("- Combined owner ID:", ownerId);
          console.log("- Current user ID:", currentUserIdStr);
          console.log("- Do they match?", ownerId === currentUserIdStr);

          if (ownerId && ownerId === currentUserIdStr) {
            userRole = 'owner';
            console.log("User is the owner of the board based on ownerId match");
          }
        }
      }
    } catch (error) {
      console.error("Error determining user role:", error);
      // Continue with default role 'member'

      // Fallback: check if user is the owner based on board data
      const { user } = useAuthStore.getState();
      if (user && user.id && boardData) {
        const currentUserIdStr = String(user.id);
        const ownerIdFromUpperCase = boardData.OwnerID ? String(boardData.OwnerID) : undefined;
        const ownerIdFromLowerCase = boardData.ownerId ? String(boardData.ownerId) : undefined;
        const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;

        console.log("Fallback checking owner ID match:");
        console.log("- Owner ID from uppercase:", ownerIdFromUpperCase);
        console.log("- Owner ID from lowercase:", ownerIdFromLowerCase);
        console.log("- Combined owner ID:", ownerId);
        console.log("- Current user ID:", currentUserIdStr);
        console.log("- Do they match?", ownerId === currentUserIdStr);

        if (ownerId && ownerId === currentUserIdStr) {
          userRole = 'owner';
          console.log("Fallback: User is the owner of the board based on ownerId match");
        }
      }
    }

    // Process lists data - handle both uppercase and lowercase property names
    const processedLists = (listsData || []).map((list: any) => {
      const listId = String(list.ID || list.id);
      return {
        ...list,
        id: listId,
        boardId: String(list.BoardID || list.boardId || list.board_id || id),
        title: list.Title || list.title || '',
        position: list.Position || list.position || 0,
        cards: [] // Initialize empty cards array for each list
      };
    });

    // Step 4: For each list, fetch its cards
    for (const list of processedLists) {
      try {
        const { data: cardsData } = await api.get<any[]>(`/lists/${list.id}/cards`);
        console.log(`Raw cards data for list ${list.id}:`, cardsData);

        // Process cards data - handle both uppercase and lowercase property names
        list.cards = (cardsData || []).map((card: any) => ({
          ...card,
          id: String(card.ID || card.id),
          listId: String(card.ListID || card.listId || list.id),
          title: card.Title || card.title || '',
          // Handle the description field which could be a string or a pgtype.Text structure
          description: typeof card.Description === 'string'
            ? card.Description
            : (card.Description?.String !== undefined
              ? card.Description.String
              : (card.description || '')),
          position: card.Position || card.position || 0
        }));
      } catch (error) {
        console.error(`Error fetching cards for list ${list.id}:`, error);
        list.cards = []; // Ensure cards is at least an empty array if fetch fails
      }
    }

    // Step 5: Return the complete board with lists and cards
    const normalizedBoard = {
      ...boardData,
      id: String(boardData.ID || boardData.id),
      name: boardData.Name || boardData.name,
      ownerId: boardData.OwnerID ? String(boardData.OwnerID) :
               (boardData.ownerId ? String(boardData.ownerId) : undefined),
      role: userRole, // Set the user's role on this board
      lists: processedLists
    };

    console.log("Final normalized board with role:", normalizedBoard);
    return normalizedBoard;
  },

  /** Создать доску */
  async createBoard(name: string): Promise<Board> {
    const { data } = await api.post<any>(ENDPOINTS.boards, { name });
    console.log("Raw board creation data from API:", data); // Debug log

    // Ensure all IDs are strings and properly normalize property names
    const board = {
      ...data,
      id: String(data.ID || data.id),
      name: data.Name || data.name || name, // Ensure name is properly set
      ownerId: data.OwnerID ? String(data.OwnerID) :
               (data.ownerId ? String(data.ownerId) : undefined),
      lists: data.lists || []
    };

    console.log("Normalized board data:", board); // Debug log

    // Рассылаем событие owner‑клиентам
    sendWS({ event: 'board_created', data: board });
    return board;
  },

  /** Дублировать карточку */
  async duplicateCard(cardId: string): Promise<Card> {
    const { data } = await api.post<Card>(ENDPOINTS.dup(cardId));
    sendWS({ event: 'card_created', data });
    return data;
  },

  /** Переместить карточку (между списками или внутри списка) */
  async moveCard(cardId: string, toListId: string, toPos: number): Promise<void> {
    console.log(`Moving card ${cardId} to list ${toListId} at position ${toPos}`);

    try {
      // Convert listId to number for the backend
      const listIdNum = parseInt(toListId);

      // Use PUT method as expected by the backend
      await api.put(ENDPOINTS.moveCard(toListId, cardId), {
        listId: listIdNum,
        position: toPos
      });

      console.log("Card moved successfully");

      // No need to send WebSocket event here anymore
      // The backend will broadcast the event to all clients including this one
    } catch (error) {
      console.error("Error moving card:", error);
      throw error;
    }
  },

  /** Создать список */
  async createList(boardId: string, title: string, position: number): Promise<List> {
    const { data } = await api.post<any>(ENDPOINTS.lists(boardId), {
      title,
      position
    });

    console.log("Raw list data from API:", data); // Debug log

    // Ensure the list has the correct structure with a cards array
    const list: List = {
      ...data,
      // Handle both uppercase and lowercase property names
      id: String(data.ID || data.id || Date.now()),
      boardId: String(data.BoardID || data.board_id || data.boardId || boardId),
      title: data.Title || data.title || title,
      position: data.Position || data.position || position,
      cards: []
    };

    // Add a flag to the WebSocket data to indicate this was created locally
    // This could be used by other clients to handle the event differently
    const wsData = {
      ...list,
      _locallyCreated: true
    };

    sendWS({ event: 'list_created', data: wsData });
    return list;
  },

  /** Переместить список (изменить порядок) */
  async moveList(listId: string, position: number): Promise<List> {
    console.log(`Moving list ${listId} to position ${position}`);

    // Find the board ID for this list
    const board = useBoardStore.getState().active;
    if (!board) {
      throw new Error("No active board found");
    }

    const list = board.lists.find(l => l.id === listId);
    if (!list) {
      throw new Error(`List with ID ${listId} not found in active board`);
    }

    const boardId = list.boardId;
    console.log(`Found list ${listId} in board ${boardId}`);

    try {
      // Ensure position is a valid number
      if (isNaN(position) || !isFinite(position)) {
        console.error("Invalid position value:", position);
        position = list.position + 1; // Default to moving it one position forward
      }

      // Convert position to integer to match backend expectations
      const intPosition = Math.round(position);
      console.log(`Sending position ${intPosition} to server (original: ${position})`);

      // Log the full request details
      console.log(`Request URL: ${ENDPOINTS.moveList(boardId, listId)}`);
      console.log(`Request payload:`, { position: intPosition });

      // Use PUT method as expected by the backend
      const { data } = await api.put<any>(ENDPOINTS.moveList(boardId, listId), {
        position: intPosition
      });

      console.log("List moved successfully, response:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedList: List = {
        id: String(data.ID || data.id || listId),
        boardId: String(data.BoardID || data.boardId || data.board_id || boardId),
        title: data.Title || data.title || list.title,
        position: data.Position || data.position || intPosition,
        cards: list.cards || []
      };

      // Log the normalized list for debugging
      console.log("Normalized list after move:", normalizedList);

      // Add the current list count to the WebSocket event data
      // This will help clients determine if they need to apply the update
      const wsData = {
        ...normalizedList,
        _expectedListCount: board.lists.length
      };

      // Send a WebSocket event with the list count to help other clients
      // determine if they need to apply the update
      sendWS({ event: 'list_moved', data: wsData });

      return normalizedList;
    } catch (error) {
      console.error(`Error moving list ${listId}:`, error);

      // Enhance error information for better error handling in the UI
      if (error instanceof Error) {
        // Check for network errors
        if (error.message.includes('Network Error')) {
          throw new Error('network: Failed to connect to the server. Please check your internet connection.');
        }

        // Check for timeout errors
        if (error.message.includes('timeout')) {
          throw new Error('timeout: Request timed out. The server might be busy, please try again.');
        }

        // Check for specific backend errors
        if (error.message.includes('not a member')) {
          throw new Error('not a member: You don\'t have permission to move this list.');
        }

        // Check for position conflicts
        if (error.message.includes('position conflict')) {
          throw new Error('position conflict: Position conflict detected. The list order will be fixed automatically.');
        }
      }

      // If we couldn't identify a specific error, rethrow the original
      throw error;
    }
  },

  /** Создать карточку */
  async createCard(listId: string, title: string, description: string = '', position: number): Promise<Card> {
    // Log the request parameters for debugging
    console.log("Creating card with params:", { listId, title, description, position });

    try {
      const { data } = await api.post<any>(ENDPOINTS.cards(listId), {
        title,
        description,
        position
      });

      console.log("Raw card data from API:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedCard: Card = {
        id: String(data.ID || data.id || Date.now()),
        listId: String(data.ListID || data.listId || listId),
        title: data.Title || data.title || title,
        // Handle the description field which could be a string or a pgtype.Text structure
        description: typeof data.Description === 'string'
          ? data.Description
          : (data.Description?.String !== undefined
            ? data.Description.String
            : (data.description || description)),
        position: data.Position || data.position || position
      };

      sendWS({ event: 'card_created', data: normalizedCard });
      return normalizedCard;
    } catch (error) {
      console.error("Error creating card:", error);
      throw error;
    }
  },

  /** Удалить карточку */
  async deleteCard(cardId: string, listId: string): Promise<void> {
    try {
      console.log(`Deleting card ${cardId} from list ${listId}`);
      await api.delete(ENDPOINTS.card(listId, cardId));
      console.log("Card deleted successfully");
      sendWS({ event: 'card_deleted', data: { cardId } });
    } catch (error) {
      console.error("Error deleting card:", error);
      throw error;
    }
  },

  /** Обновить карточку */
  async updateCard(cardId: string, listId: string, updates: { title?: string; description?: string }): Promise<Card> {
    try {
      console.log(`Updating card ${cardId} in list ${listId}:`, updates);

      const { data } = await api.put<any>(ENDPOINTS.card(listId, cardId), updates);

      console.log("Raw updated card data from API:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedCard: Card = {
        id: String(data.ID || data.id || cardId),
        listId: String(data.ListID || data.listId || listId),
        title: data.Title || data.title || updates.title || '',
        // Handle the description field which could be a string or a pgtype.Text structure
        description: typeof data.Description === 'string'
          ? data.Description
          : (data.Description?.String !== undefined
            ? data.Description.String
            : (data.description || updates.description || '')),
        position: data.Position || data.position || 0
      };

      sendWS({ event: 'card_updated', data: normalizedCard });
      return normalizedCard;
    } catch (error) {
      console.error("Error updating card:", error);
      throw error;
    }
  },

  /** Обновить заголовок списка */
  async updateList(listId: string, title: string): Promise<List> {
    try {
      console.log(`Updating list ${listId} with title: ${title}`);

      // Find the board ID for this list
      const board = useBoardStore.getState().active;
      if (!board) {
        throw new Error("No active board found");
      }

      const list = board.lists.find(l => l.id === listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Use the correct endpoint format: /boards/:boardId/lists/:id
      const updateEndpoint = `${ENDPOINTS.lists(boardId)}/${listId}`;
      console.log(`Using update endpoint: ${updateEndpoint}`);

      const { data } = await api.put<any>(updateEndpoint, { title });

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedList: List = {
        id: String(data.ID || data.id || listId),
        boardId: String(data.BoardID || data.boardId || data.board_id || boardId),
        title: data.Title || data.title || title,
        position: data.Position || data.position || list.position,
        cards: list.cards || []
      };

      console.log("List updated successfully:", normalizedList);
      sendWS({ event: 'list_updated', data: normalizedList });
      return normalizedList;
    } catch (error) {
      console.error("Error updating list:", error);
      throw error;
    }
  },

  /** Удалить список */
  async deleteList(listId: string): Promise<void> {
    try {
      console.log(`Deleting list ${listId}`);

      // Find the board ID for this list
      const board = useBoardStore.getState().active;
      if (!board) {
        throw new Error("No active board found");
      }

      const list = board.lists.find(l => l.id === listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found in active board`);
      }

      const boardId = list.boardId;
      console.log(`Found list ${listId} in board ${boardId}`);

      // Use the correct endpoint format: /boards/:boardId/lists/:id
      const deleteEndpoint = `${ENDPOINTS.lists(boardId)}/${listId}`;
      console.log(`Using delete endpoint: ${deleteEndpoint}`);

      await api.delete(deleteEndpoint);
      console.log("List deleted successfully");

      // Send WebSocket event with the updated list count after deletion
      // This helps other clients know they need to refresh their list positions
      const remainingListCount = board.lists.length - 1; // Subtract 1 for the deleted list
      sendWS({
        event: 'list_deleted',
        data: {
          listId,
          _expectedListCount: remainingListCount
        }
      });
    } catch (error) {
      console.error("Error deleting list:", error);
      throw error;
    }
  },

  /** Удалить доску */
  async deleteBoard(boardId: string): Promise<void> {
    try {
      console.log(`Deleting board ${boardId}`);
      await api.delete(ENDPOINTS.board(boardId));
      console.log("Board deleted successfully");

      // The backend will broadcast the board_deleted event to all connected clients
      // We don't need to send a WebSocket event here
    } catch (error) {
      console.error("Error deleting board:", error);
      throw error;
    }
  },

  /** Обновить название доски */
  async updateBoard(boardId: string, name: string): Promise<Board> {
    try {
      console.log(`Updating board ${boardId} with name: ${name}`);

      const { data } = await api.put<any>(ENDPOINTS.board(boardId), { name });
      console.log("Raw updated board data from API:", data);

      // Normalize the response to ensure it has the expected lowercase property names
      const normalizedBoard: Board = {
        id: String(data.ID || data.id || boardId),
        name: data.Name || data.name || name,
        ownerId: data.OwnerID ? String(data.OwnerID) :
                 (data.ownerId ? String(data.ownerId) : undefined),
        lists: [] // Lists will be populated separately if needed
      };

      console.log("Board updated successfully:", normalizedBoard);
      sendWS({ event: 'board_updated', data: normalizedBoard });
      return normalizedBoard;
    } catch (error) {
      console.error("Error updating board:", error);
      throw error;
    }
  },

  /** Получить список участников доски */
  async getBoardMembers(boardId: string): Promise<any[]> {
    try {
      console.log(`Fetching members for board ${boardId}`);
      const { data } = await api.get(`/boards/${boardId}/members`);
      console.log("Raw board members data from API:", data);

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array of members but got:", data);
        return [];
      }

      // Normalize the response to ensure consistent property names
      const normalizedMembers = data.map((member: any) => {
        // Extract user_id from different possible formats
        const userIdFromSnakeCase = member.user_id !== undefined ? String(member.user_id) : undefined;
        const userIdFromCamelCase = member.userId !== undefined ? String(member.userId) : undefined;
        const userIdFromUpperCase = member.UserID !== undefined ? String(member.UserID) : undefined;

        // Use the first available ID
        const userId = userIdFromSnakeCase || userIdFromCamelCase || userIdFromUpperCase;

        console.log(`Normalizing member: ${JSON.stringify(member)}`);
        console.log(`- user_id: ${userIdFromSnakeCase}, userId: ${userIdFromCamelCase}, UserID: ${userIdFromUpperCase}`);
        console.log(`- Final userId: ${userId}`);

        return {
          ...member,
          userId: userId,
          name: member.name || member.Name || 'Unknown',
          email: member.email || member.Email || '',
          role: member.role || member.Role || 'member'
        };
      });

      console.log("Normalized members:", normalizedMembers);
      return normalizedMembers;
    } catch (error) {
      console.error("Error fetching board members:", error);
      throw error;
    }
  },

  /** Пригласить пользователя на доску по email */
  async inviteMemberByEmail(boardId: string, email: string, role: 'owner' | 'member' = 'member'): Promise<any> {
    try {
      console.log(`Inviting user ${email} to board ${boardId} with role ${role}`);

      // Validate email format before sending to API
      if (!email || !email.includes('@')) {
        throw new Error("Некорректный формат email");
      }

      const { data } = await api.post(`/boards/${boardId}/members/invite`, { email, role });
      console.log("Invitation successful:", data);

      // Normalize the response data
      const normalizedData = {
        ...data,
        boardId: String(data.board_id || data.boardId || data.BoardID || boardId),
        userId: String(data.user_id || data.userId || data.UserID || ''),
        email: data.email || data.Email || email,
        role: data.role || data.Role || role
      };

      console.log("Normalized invitation data:", normalizedData);

      // Send WebSocket event to notify other clients
      sendWS({ event: 'member_added', data: normalizedData });
      return normalizedData;
    } catch (error: any) {
      console.error("Error inviting member:", error);

      // Handle specific API error responses
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 404) {
          throw new Error("Пользователь с таким email не найден");
        } else if (status === 403) {
          throw new Error("У вас нет прав для приглашения участников");
        } else if (status === 409) {
          throw new Error("Этот пользователь уже является участником доски");
        } else if (status === 400 && errorData?.error) {
          throw new Error(errorData.error);
        }
      }

      // Re-throw the original error if we couldn't handle it specifically
      throw error;
    }
  },

  /** Удалить участника с доски */
  async removeMember(boardId: string, userId: string): Promise<void> {
    try {
      console.log(`Removing user ${userId} from board ${boardId}`);
      await api.delete(`/boards/${boardId}/members/${userId}`);
      console.log("Member removed successfully");

      // Normalize the data for WebSocket event
      const normalizedData = {
        boardId: String(boardId),
        userId: String(userId)
      };

      console.log("Sending normalized member_removed event:", normalizedData);

      // Send WebSocket event to notify other clients
      sendWS({ event: 'member_removed', data: normalizedData });
    } catch (error: any) {
      console.error("Error removing member:", error);

      // Handle specific API error responses
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        console.log("API error response:", status, errorData);

        if (status === 404) {
          throw new Error("Пользователь не найден на этой доске");
        } else if (status === 403) {
          throw new Error("У вас нет прав для удаления участников");
        } else if (status === 400 && errorData?.error) {
          throw new Error(errorData.error);
        } else if (status === 409) {
          throw new Error("Нельзя удалить владельца доски");
        }
      }

      // Re-throw the original error if we couldn't handle it specifically
      throw error;
    }
  },
};
