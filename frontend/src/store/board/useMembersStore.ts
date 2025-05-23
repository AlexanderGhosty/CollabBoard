import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { memberService } from '@/services/memberService';
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
        const members = await memberService.getBoardMembers(targetBoardId);

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
        get().updateUserRoleInBoard(targetBoardId, members);
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
      get()._debouncedUpdateUserRole(boardId, members);
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
        await memberService.inviteMemberByEmail(boardId, email, role);

        // Refresh the members list
        await get().fetchBoardMembers(boardId);

        // Toast notification is now handled at the component level

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

    async removeMember(userId, explicitBoardId = null) {
      const boardStore = useBoardStore.getState();
      // Use the explicitly provided boardId if available, otherwise use the active board
      const boardId = explicitBoardId || boardStore.activeBoard;

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
        await memberService.removeMember(boardId, userId);

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

        // Toast notification is now handled at the component level
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
    },

    // Leave a board (for members)
    async leaveBoard() {
      const boardStore = useBoardStore.getState();
      const boardId = boardStore.activeBoard;

      if (!boardId) {
        console.error("No active board");
        throw new Error("Нет активной доски");
      }

      const board = boardStore.boards[boardId];
      if (!board) {
        console.error("Board not found");
        throw new Error("Доска не найдена");
      }

      // Owners cannot leave their own board
      if (board.role === 'owner') {
        useToastStore.getState().error("Владелец не может покинуть свою доску");
        throw new Error("Владелец не может покинуть свою доску");
      }

      set((s) => { s.loading = true; s.error = null; });

      try {
        // First, disconnect WebSocket to prevent reconnection attempts
        // This is important to do before the API call
        const wsClient = await import('@/services/websocket').then(m => m.wsClient);
        wsClient.disconnect();

        // Call the API to leave the board
        await memberService.leaveBoard(boardId);

        // Remove this board from the boards list in the store
        useBoardStore.setState(state => {
          // Remove from boards record
          delete state.boards[boardId];

          // Remove from member boards
          state.memberBoardIds = state.memberBoardIds.filter(id => id !== boardId);

          // Clear active board if it's the one being left
          if (state.activeBoard === boardId) {
            state.activeBoard = null;
          }
        });

        // Remove from members store
        set((s) => {
          s.loading = false;

          // Remove from boardMembers relationship
          if (s.boardMembers[boardId]) {
            delete s.boardMembers[boardId];
          }
        });

        // Show success toast
        useToastStore.getState().success("Вы покинули доску");

        // Return true to indicate success (the component will handle navigation)
        return true;
      } catch (error) {
        console.error("Failed to leave board:", error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to leave board: ${error}`;
        });

        // Show error toast
        if (error instanceof Error) {
          useToastStore.getState().error(error.message);
        } else {
          useToastStore.getState().error("Не удалось покинуть доску");
        }

        throw error;
      }
    }
  }))
);
