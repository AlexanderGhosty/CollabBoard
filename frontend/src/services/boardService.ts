import { api } from '@/services/api';
import { BOARD_ENDPOINTS, LIST_ENDPOINTS } from '@/utils/api/apiEndpoints';
import {
  ApiBoard,
  normalizeBoard,
  normalizeBoardMember,
  ApiBoardMember,
  BoardMember,
  ApiList,
  normalizeList
} from '@/utils/api/normalizeEntities';
import { handleApiError } from '@/utils/api/errorHandling';
import {
  WebSocketEventType,
  sendBoardEvent
} from '@/utils/websocket/events';
import { useAuthStore } from '@/store/useAuthStore';

/** Entity types (minimal required) */
export type Card = {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number
};

export type List = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: Card[]
};

export type Board = {
  id: string;
  name: string;  // Changed from 'title' to 'name' to match backend
  ownerId?: string; // Added to match backend
  role?: 'owner' | 'member'; // Added for board sharing feature
  lists: List[]
};

export const boardService = {
  /** Получить все доски текущего пользователя */
  async getBoards(): Promise<Board[]> {
    try {
      const { data } = await api.get<ApiBoard[]>(BOARD_ENDPOINTS.boards);
      console.log("Raw board data from API:", data);

      // Normalize and filter out boards without IDs
      return data
        .map(board => normalizeBoard(board))
        .filter(board => board.id);
    } catch (error) {
      console.error("Failed to fetch boards:", error);
      throw handleApiError(error);
    }
  },

  /** Получить доски по роли пользователя (owner/member) */
  async getBoardsByRole(role: 'owner' | 'member'): Promise<Board[]> {
    try {
      const { data } = await api.get<ApiBoard[]>(BOARD_ENDPOINTS.boardsByRole(role));
      console.log(`Raw board data for role ${role} from API:`, data);

      // Check if data is null or undefined, return empty array if it is
      if (!data) {
        console.warn(`No data returned for role ${role}, returning empty array`);
        return [];
      }

      // Normalize and filter out boards without IDs, explicitly setting the role
      return data
        .map(board => {
          const normalizedBoard = normalizeBoard(board);
          // Explicitly set the role based on the API endpoint used
          normalizedBoard.role = role;
          return normalizedBoard;
        })
        .filter(board => board.id);
    } catch (error) {
      console.error(`Error fetching boards for role ${role}:`, error);
      return []; // Return empty array on error
    }
  },

  /** Получить доску по ID */
  async getBoardById(id: string): Promise<Board> {
    try {
      console.log(`Fetching board with ID: ${id}`);

      // Step 1: Fetch the board data
      const { data: boardData } = await api.get<ApiBoard>(BOARD_ENDPOINTS.board(id));
      console.log("Raw board data:", boardData);

      // Step 2: Fetch the lists for this board
      console.log(`Fetching lists for board ${id}`);
      const lists = await this.fetchBoardLists(id);
      console.log(`Fetched ${lists.length} lists for board ${id}:`, lists);

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

          // Find the current user in the members list
          const currentUserMember = members.find(m => String(m.userId) === currentUserIdStr);

          if (currentUserMember) {
            userRole = currentUserMember.role as 'owner' | 'member';
          } else {
            // Fallback: check if user is the owner based on board data
            const ownerId = boardData.OwnerID
              ? String(boardData.OwnerID)
              : (boardData.ownerId
                ? String(boardData.ownerId)
                : (boardData.owner_id
                  ? String(boardData.owner_id)
                  : undefined));

            if (ownerId && ownerId === currentUserIdStr) {
              userRole = 'owner';
            }
          }
        }
      } catch (error) {
        console.error("Error determining user role:", error);
        // Continue with default role 'member'
      }

      // Create the normalized board with the user's role and lists
      const normalizedBoard = normalizeBoard(boardData);
      normalizedBoard.role = userRole;
      normalizedBoard.lists = lists;

      return normalizedBoard;
    } catch (error) {
      console.error(`Error fetching board ${id}:`, error);
      throw handleApiError(error);
    }
  },

  /** Создать доску */
  async createBoard(name: string): Promise<Board> {
    try {
      const { data } = await api.post<ApiBoard>(BOARD_ENDPOINTS.boards, { name });
      console.log("Raw board creation data from API:", data);

      // Normalize the board data
      const board = normalizeBoard(data);
      console.log("Normalized board data:", board);

      // Send WebSocket event
      sendBoardEvent(WebSocketEventType.BOARD_CREATED, board);

      return board;
    } catch (error) {
      console.error("Error creating board:", error);
      throw handleApiError(error);
    }
  },

  /** Удалить доску */
  async deleteBoard(boardId: string): Promise<void> {
    try {
      console.log(`Deleting board ${boardId}`);
      await api.delete(BOARD_ENDPOINTS.board(boardId));
      console.log("Board deleted successfully");

      // The backend will broadcast the board_deleted event to all connected clients
    } catch (error) {
      console.error("Error deleting board:", error);
      throw handleApiError(error);
    }
  },

  /** Обновить название доски */
  async updateBoard(boardId: string, name: string): Promise<Board> {
    try {
      console.log(`Updating board ${boardId} with name: ${name}`);

      const { data } = await api.put<ApiBoard>(BOARD_ENDPOINTS.board(boardId), { name });
      console.log("Raw updated board data from API:", data);

      // Normalize the board data
      const normalizedBoard = normalizeBoard(data);
      console.log("Board updated successfully:", normalizedBoard);

      // Send WebSocket event
      sendBoardEvent(WebSocketEventType.BOARD_UPDATED, normalizedBoard);

      return normalizedBoard;
    } catch (error) {
      console.error("Error updating board:", error);
      throw handleApiError(error);
    }
  },

  /** Получить списки для доски */
  async fetchBoardLists(boardId: string): Promise<List[]> {
    try {
      console.log(`Fetching lists for board ${boardId}`);
      const { data } = await api.get<ApiList[]>(LIST_ENDPOINTS.lists(boardId));
      console.log("Raw lists data from API:", data);

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array of lists but got:", data);
        return [];
      }

      // Normalize the lists data
      return data.map(list => normalizeList(list, boardId));
    } catch (error) {
      console.error(`Error fetching lists for board ${boardId}:`, error);
      throw handleApiError(error);
    }
  },

  /** Получить список участников доски */
  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    try {
      console.log(`Fetching members for board ${boardId}`);
      const { data } = await api.get<ApiBoardMember[]>(BOARD_ENDPOINTS.boardMembers(boardId));
      console.log("Raw board members data from API:", data);

      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error("Expected array of members but got:", data);
        return [];
      }

      // Normalize the members data
      const normalizedMembers = data.map(member => normalizeBoardMember(member, boardId));
      console.log("Normalized members:", normalizedMembers);

      return normalizedMembers;
    } catch (error) {
      console.error("Error fetching board members:", error);
      throw handleApiError(error);
    }
  },

  /** Пригласить пользователя на доску по email */
  async inviteMemberByEmail(boardId: string, email: string, role: 'owner' | 'member' = 'member'): Promise<BoardMember> {
    try {
      console.log(`Inviting user ${email} to board ${boardId} with role ${role}`);

      // Validate email format before sending to API
      if (!email || !email.includes('@')) {
        throw new Error("Некорректный формат email");
      }

      const { data } = await api.post<ApiBoardMember>(BOARD_ENDPOINTS.inviteMember(boardId), { email, role });
      console.log("Invitation successful:", data);

      // Normalize the member data
      const normalizedMember = normalizeBoardMember(data, boardId);
      console.log("Normalized invitation data:", normalizedMember);

      // Send WebSocket event
      sendBoardEvent(WebSocketEventType.MEMBER_ADDED, normalizedMember);

      return normalizedMember;
    } catch (error) {
      console.error("Error inviting member:", error);
      throw handleApiError(error);
    }
  },

  /** Удалить участника с доски */
  async removeMember(boardId: string, userId: string): Promise<void> {
    try {
      console.log(`Removing user ${userId} from board ${boardId}`);
      await api.delete(BOARD_ENDPOINTS.removeMember(boardId, userId));
      console.log("Member removed successfully");

      // Send WebSocket event
      sendBoardEvent(WebSocketEventType.MEMBER_REMOVED, { boardId, userId });
    } catch (error) {
      console.error("Error removing member:", error);
      throw handleApiError(error);
    }
  },
};
