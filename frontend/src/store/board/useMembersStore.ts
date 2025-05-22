import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService } from '@/services/boardService';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { MembersState, BoardMember } from './types';
import { useBoardStore } from './useBoardStore';
import { normalizeId } from '@/utils/board/idNormalization';
import { isCurrentUserBoardOwner } from '@/utils/board/permissions';

export const useMembersStore = create<MembersState>()(
  immer((set, get) => ({
    // State
    members: {},
    boardMembers: {},
    loading: false,
    error: null,

    // Selectors
    getMembersByBoardId(boardId) {
      const boardMemberIds = get().boardMembers[boardId] || [];
      return boardMemberIds.map(memberId => get().members[memberId]).filter(Boolean);
    },

    isUserBoardOwner(boardId, userId) {
      const members = get().getMembersByBoardId(boardId);
      const userIdStr = normalizeId(userId) || '';
      
      // Check if user has owner role in members list
      return members.some(m => normalizeId(m.userId) === userIdStr && m.role === 'owner');
    },

    // Member operations
    async fetchBoardMembers(boardId) {
      // Use the active board ID if none is provided
      const targetBoardId = boardId || useBoardStore.getState().activeBoard;
      if (!targetBoardId) {
        console.error("No board ID provided and no active board");
        return;
      }
      
      set((s) => { s.loading = true; s.error = null; });
      
      try {
        const members = await boardService.getBoardMembers(targetBoardId);
        
        set((s) => {
          // Convert array to records
          const membersRecord: Record<string, BoardMember> = {};
          const memberIds: string[] = [];
          
          members.forEach(member => {
            const userId = normalizeId(member.userId);
            if (userId) {
              const memberId = `${targetBoardId}_${userId}`;
              
              // Create normalized member object
              membersRecord[memberId] = {
                userId,
                boardId: targetBoardId,
                name: member.name || '',
                email: member.email || '',
                role: member.role || 'member'
              };
              
              memberIds.push(memberId);
            }
          });
          
          // Update state
          s.members = { ...s.members, ...membersRecord };
          s.boardMembers[targetBoardId] = memberIds;
          s.loading = false;
          
          // Update the user's role in the active board if needed
          const boardStore = useBoardStore.getState();
          const currentUser = useAuthStore.getState().user;
          
          if (boardStore.boards[targetBoardId] && currentUser && currentUser.id) {
            const userIdStr = normalizeId(currentUser.id);
            const currentUserMember = members.find(m => normalizeId(m.userId) === userIdStr);
            
            if (currentUserMember) {
              // User found in members list, update role in board
              const newRole = currentUserMember.role as 'owner' | 'member';
              
              if (boardStore.boards[targetBoardId].role !== newRole) {
                // Update the role in the board store
                useBoardStore.setState(state => {
                  state.boards[targetBoardId].role = newRole;
                });
              }
            }
          }
        });
      } catch (error) {
        console.error("Failed to fetch board members:", error);
        
        set((s) => {
          s.loading = false;
          s.error = `Failed to fetch board members: ${error}`;
          
          // Clear members for this board
          s.boardMembers[targetBoardId] = [];
        });
        
        // Show error toast
        useToastStore.getState().error("Не удалось загрузить список участников");
      }
    },

    async inviteMember(email, role = 'member') {
      const boardStore = useBoardStore.getState();
      const boardId = boardStore.activeBoard;
      
      if (!boardId) {
        console.error("No active board");
        throw new Error("Нет активной доски");
      }
      
      const board = boardStore.boards[boardId];
      const members = get().getMembersByBoardId(boardId);
      
      // Check if current user is the owner of the board
      if (!isCurrentUserBoardOwner(board, members)) {
        console.error("User is not the owner of the board");
        throw new Error("Только владелец доски может приглашать участников");
      }
      
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new Error("Некорректный формат email");
      }
      
      // Check if user is already a member
      const isAlreadyMember = members.some(
        (member) => member.email.toLowerCase() === email.toLowerCase()
      );
      
      if (isAlreadyMember) {
        throw new Error("Этот пользователь уже является участником доски");
      }
      
      set((s) => { s.loading = true; s.error = null; });
      
      try {
        // Send invitation
        await boardService.inviteMemberByEmail(boardId, email, role);
        
        // Refresh the members list
        await get().fetchBoardMembers(boardId);
        
        // Show success toast
        useToastStore.getState().success(`Пользователь ${email} успешно приглашен на доску`);
        
        set((s) => { s.loading = false; });
        return true;
      } catch (error) {
        console.error("Failed to invite member:", error);
        
        set((s) => {
          s.loading = false;
          s.error = `Failed to invite member: ${error}`;
        });
        
        // Handle specific error cases
        let errorMessage = 'Не удалось пригласить пользователя';
        
        if (error instanceof Error) {
          // Check for specific error messages from the backend
          if (error.message.includes('not found')) {
            errorMessage = 'Пользователь с таким email не найден';
          } else if (error.message.includes('already')) {
            errorMessage = 'Этот пользователь уже является участником доски';
          } else {
            errorMessage = error.message;
          }
        }
        
        // Show error toast
        useToastStore.getState().error(errorMessage);
        
        // Re-throw the error so the component can handle it
        throw error;
      }
    },

    async removeMember(userId) {
      const boardStore = useBoardStore.getState();
      const boardId = boardStore.activeBoard;
      
      if (!boardId) {
        console.error("No active board");
        throw new Error("Нет активной доски");
      }
      
      const board = boardStore.boards[boardId];
      const members = get().getMembersByBoardId(boardId);
      
      // Check if current user is the owner of the board
      if (!isCurrentUserBoardOwner(board, members)) {
        console.error("User is not the owner of the board");
        throw new Error("Только владелец доски может удалять участников");
      }
      
      set((s) => { s.loading = true; s.error = null; });
      
      try {
        await boardService.removeMember(boardId, userId);
        
        // Remove member from state
        set((s) => {
          const memberId = `${boardId}_${userId}`;
          
          // Remove from members record
          delete s.members[memberId];
          
          // Remove from boardMembers relationship
          if (s.boardMembers[boardId]) {
            s.boardMembers[boardId] = s.boardMembers[boardId].filter(id => id !== memberId);
          }
          
          s.loading = false;
        });
        
        // Show success toast
        useToastStore.getState().success('Пользователь удален с доски');
      } catch (error) {
        console.error("Failed to remove member:", error);
        
        set((s) => {
          s.loading = false;
          s.error = `Failed to remove member: ${error}`;
        });
        
        // Show error toast
        if (error instanceof Error) {
          useToastStore.getState().error(error.message);
        } else {
          useToastStore.getState().error('Не удалось удалить пользователя');
        }
      }
    }
  }))
);
