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

          // Instead of directly updating the board store, we'll update our local state
          // and let the board component handle role synchronization when needed
          // This prevents the circular dependency causing the infinite loop
        });

        // Check if we need to update the user's role in the board store
        // But do it outside of the state setter to avoid triggering unnecessary renders
        this.updateUserRoleInBoard(targetBoardId, members);
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

    // Helper method to update user role in board store
    // This is separated from fetchBoardMembers to avoid circular dependencies
    updateUserRoleInBoard(boardId, members) {
      // Use a debounced version of this function to prevent rapid updates
      // that could cause infinite loops
      this._debouncedUpdateUserRole(boardId, members);
    },

    // Private method for the actual role update logic
    _debouncedUpdateUserRole: (() => {
      // Keep track of the last update to avoid redundant updates
      let lastUpdate = {
        boardId: '',
        role: '',
        timestamp: 0
      };

      // Return the actual function
      return (boardId, members) => {
        const boardStore = useBoardStore.getState();
        const currentUser = useAuthStore.getState().user;

        if (!boardStore.boards[boardId] || !currentUser || !currentUser.id) {
          return; // Nothing to update
        }

        const userIdStr = normalizeId(currentUser.id);
        const currentUserMember = members.find(m => normalizeId(m.userId) === userIdStr);

        if (!currentUserMember) {
          return; // User is not a member
        }

        const newRole = currentUserMember.role as 'owner' | 'member';
        const currentRole = boardStore.boards[boardId].role;

        // Skip update if the role hasn't changed
        if (currentRole === newRole) {
          return;
        }

        // Skip if we just updated this board's role (within last 500ms)
        const now = Date.now();
        if (
          lastUpdate.boardId === boardId &&
          lastUpdate.role === newRole &&
          now - lastUpdate.timestamp < 500
        ) {
          return;
        }

        // Update the last update record
        lastUpdate = {
          boardId,
          role: newRole,
          timestamp: now
        };

        // Use a timeout to ensure this doesn't happen in the same render cycle
        setTimeout(() => {
          // Check again if the board still exists and if the role still needs updating
          const latestBoardStore = useBoardStore.getState();
          if (
            latestBoardStore.boards[boardId] &&
            latestBoardStore.boards[boardId].role !== newRole
          ) {
            // Only update if the role has actually changed
            useBoardStore.setState(state => {
              state.boards[boardId].role = newRole;
            });
          }
        }, 0);
      };
    })(),

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
