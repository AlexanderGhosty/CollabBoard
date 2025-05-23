import { api } from '@/services/api';
import { BOARD_ENDPOINTS } from '@/utils/api/apiEndpoints';
import { ApiBoardMember, BoardMember, normalizeBoardMember } from '@/utils/api/normalizeEntities';
import { handleApiError } from '@/utils/api/errorHandling';
import { WebSocketEventType, sendMemberEvent } from '@/utils/websocket/events';

/**
 * Member service - handles board member-related operations
 */
export const memberService = {
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
      sendMemberEvent(WebSocketEventType.MEMBER_ADDED, normalizedMember);
      
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
      sendMemberEvent(WebSocketEventType.MEMBER_REMOVED, { boardId, userId });
    } catch (error) {
      console.error("Error removing member:", error);
      throw handleApiError(error);
    }
  },
};
