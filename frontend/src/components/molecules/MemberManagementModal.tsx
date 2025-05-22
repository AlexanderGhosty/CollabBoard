/**
 * MemberManagementModal Component
 *
 * A modal dialog for managing board members, including inviting new members
 * and removing existing ones. Only board owners can add/remove members.
 */
import { useState, useEffect, useRef, KeyboardEvent, useMemo } from 'react';
import { z } from 'zod';
import Button from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useBoardStore, useMembersStore } from '@/store/board';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { emailSchema } from '@/utils/validate';



// Define interfaces locally to avoid import issues
interface BoardMember {
  userId: string;
  boardId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}

// Define Board interface for type safety
interface Board {
  id: string;
  ID?: number;
  Name: string;
  OwnerID?: number;
  ownerId?: string;
  role?: 'owner' | 'member';
  CreatedAt?: string;
}

// Define User interface for type safety
interface User {
  id: string;
  name: string;
  email: string;
}

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MemberManagementModal({ isOpen, onClose }: MemberManagementModalProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Get board state directly to avoid unnecessary re-renders
  // Using separate selectors to minimize dependencies
  const activeBoard = useBoardStore((state: any) => state.activeBoard);
  const boards = useBoardStore((state: any) => state.boards) as Record<string, Board>;

  // Get the active board object
  const active = activeBoard ? boards[activeBoard] : null;

  // Get members store actions directly
  const fetchBoardMembers = useMembersStore((state: any) => state.fetchBoardMembers);
  const inviteMember = useMembersStore((state: any) => state.inviteMember);
  const removeMember = useMembersStore((state: any) => state.removeMember);

  // Get board members directly from the store to avoid infinite loops
  const boardMembers = useMembersStore(
    (state: any) => {
      if (!activeBoard) return [];
      const memberIds = state.boardMembers[activeBoard] || [];
      return memberIds.map((id: string) => state.members[id]).filter(Boolean) as BoardMember[];
    }
  );

  // Get current user with stable reference
  const currentUser = useAuthStore((state: any) => state.user) as User;
  const toast = useToastStore();

  // Track store loading state
  const isStoreLoading = useMembersStore((state: any) => state.loading);

  // Fetch board members when the modal opens or activeBoard changes
  useEffect(() => {
    // Only fetch if we have an active board and the modal is open
    if (!activeBoard || !isOpen) return;

    // Define the load function inside the effect to avoid dependency issues
    const loadMembers = async () => {
      try {
        await fetchBoardMembers(activeBoard);
      } catch (error) {
        console.error('Error fetching board members:', error);
        toast.error('Не удалось загрузить список участников');
      }
    };

    // Load members when the modal opens
    loadMembers();

    // We'll rely on the store's WebSocket subscriptions instead of creating our own
    // This avoids potential infinite loops from multiple subscriptions triggering each other
  }, [isOpen, activeBoard, fetchBoardMembers, toast]);

  // Simplified dialog management without store updates
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Don't update global state here to avoid potential loops
    // setMemberModalOpen(isOpen);

    if (isOpen) {
      // Only call showModal if the dialog is not already open
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch (error) {
          console.error('Error opening dialog:', error);
        }
      }
    } else {
      dialog.close();
    }

    // Clean up function to ensure dialog is closed when component unmounts
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
        // Don't update global state here to avoid potential loops
        // setMemberModalOpen(false);
      }
    };
  }, [isOpen]);

  const handleDialogClick = (e: React.MouseEvent) => {
    // Close the dialog if the backdrop is clicked
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        onClose();
      }
    }
  };

  // Handle Enter key press in email input
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && email.trim()) {
      e.preventDefault();
      handleInvite();
    }
  };

  const handleInvite = async () => {
    // Reset states
    setEmailError(null);
    setInviteSuccess(false);

    // Get trimmed email for consistency
    const trimmedEmail = email.trim();

    // Early return if email is empty
    if (!trimmedEmail) return;

    // Validate email format
    try {
      emailSchema.parse(trimmedEmail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
        return;
      }
    }

    // Check if user is already a member - use proper null check
    const isAlreadyMember = boardMembers.some(
      (member: BoardMember) => member.email && member.email.toLowerCase() === trimmedEmail.toLowerCase()
    );

    if (isAlreadyMember) {
      setEmailError('Этот пользователь уже является участником доски');
      // Don't show toast here to avoid duplication with store error handling
      return;
    }

    // The store already checks if the user is an owner, so we don't need to check here
    // This avoids redundant permission checks

    setLoading(true);
    try {
      if (!activeBoard) {
        throw new Error("Нет активной доски");
      }

      // Pass the role parameter explicitly for clarity
      await inviteMember(trimmedEmail, 'member');

      // Update UI state on success
      setEmail(''); // Clear the input
      setInviteSuccess(true);

      // Success toast is shown by the store, no need to duplicate
    } catch (error) {
      console.error('Error inviting member:', error);
      setInviteSuccess(false);

      // Set error message in the UI but don't show toast (store will handle it)
      if (error instanceof Error) {
        if (error.message.includes('не найден') || error.message.includes('not found')) {
          setEmailError('Пользователь с таким email не найден');
        } else if (error.message.includes('владелец') || error.message.includes('owner')) {
          setEmailError(error.message);
        } else if (error.message.includes('уже является') || error.message.includes('already')) {
          setEmailError('Этот пользователь уже является участником доски');
        } else {
          setEmailError(error.message);
        }
      } else {
        setEmailError('Не удалось пригласить пользователя');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMemberClick = (userId: string) => {
    // Check if userId is defined
    if (!userId) {
      console.error('Cannot remove member: userId is undefined');
      toast.error('Не удалось удалить участника: ID пользователя не определен');
      return;
    }

    // Find the member in the list with proper type safety
    const member = boardMembers.find((m: BoardMember) => String(m.userId) === String(userId));

    if (!member) {
      toast.error('Пользователь не найден на этой доске');
      return;
    }

    // Check if trying to remove self
    const isSelf = currentUser && String(currentUser.id) === String(userId);
    if (isSelf) {
      toast.error('Вы не можете удалить себя с доски');
      return;
    }

    // Check if trying to remove the owner
    const isRemovingOwner = member.role === 'owner';
    if (isRemovingOwner) {
      toast.error('Нельзя удалить владельца доски');
      return;
    }

    // Set the member to remove and open the confirm dialog
    setMemberToRemove({
      userId,
      name: member.name || member.email || 'Пользователь'
    });
    setConfirmDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !activeBoard) return;

    try {
      setLoading(true);
      await removeMember(memberToRemove.userId);
      // Toast notification is handled in the store
    } catch (error) {
      console.error('Error removing member:', error);
      // Error handling is done in the store
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  const handleCancelRemove = () => {
    setConfirmDialogOpen(false);
    setMemberToRemove(null);
  };

  // Check if current user is the owner of the board
  const isOwner = useMemo(() => {
    if (!activeBoard || !currentUser || !active) return false;

    // Check if user has owner role in board.role
    const isOwnerByRole = active.role === 'owner';

    // Convert IDs to strings for comparison
    const currentUserIdStr = String(currentUser.id);

    // Check if user has owner role in members list
    const isUserOwnerInMembers = boardMembers.some(
      (m: BoardMember) => String(m.userId) === currentUserIdStr && m.role === 'owner'
    );

    // Check both uppercase and lowercase ownerId properties
    const ownerIdFromUpperCase = active.OwnerID ? String(active.OwnerID) : undefined;
    const ownerIdFromLowerCase = active.ownerId ? String(active.ownerId) : undefined;
    const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;
    const isOwnerByBoardData = ownerId === currentUserIdStr;

    // Combined check - user is owner if any of the checks pass
    return isOwnerByRole || isUserOwnerInMembers || isOwnerByBoardData;
  }, [activeBoard, active, boardMembers, currentUser]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[1000] rounded-2xl bg-white p-6 shadow-xl
        w-full max-w-md modal-enter animate-modal-in border border-blue-100 m-auto"
      onClose={onClose}
      onClick={handleDialogClick}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-blue-800">Управление участниками</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600
              hover:bg-blue-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            ✕
          </button>
        </div>

        {/* Показываем форму приглашения, если пользователь владелец */}
        {isOwner && (
          <div className="mb-4">
            <h4 className="text-md font-semibold text-blue-700 mb-2">Пригласить участника</h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Email пользователя"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                    // Clear error when user starts typing again
                    if (emailError) setEmailError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  error={emailError || undefined}
                  className="flex-grow"
                  autoFocus
                  disabled={loading || isStoreLoading}
                />
                <Button
                  onClick={handleInvite}
                  loading={loading || isStoreLoading}
                  disabled={!email.trim() || loading || isStoreLoading}
                  className="w-full sm:w-auto"
                >
                  Добавить
                </Button>
              </div>

              {inviteSuccess && !emailError && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded-xl border border-blue-100 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">✓</span>
                  <span>Приглашение успешно отправлено!</span>
                </div>
              )}

              <div className="text-xs text-blue-600 mt-1">
                Примечание: можно пригласить только пользователей, которые уже зарегистрированы в системе.
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-md font-semibold text-blue-700">Участники доски</h4>
            <div className="text-xs text-blue-600">
              {boardMembers.length > 0 ? `Всего: ${boardMembers.length}` : ''}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-blue-100 rounded-xl bg-gradient-to-b from-blue-50 to-white">
            {boardMembers.length > 0 ? (
              <ul className="divide-y divide-blue-100">
                {boardMembers.map((member: BoardMember) => (
                  <li key={member.userId} className="p-3 flex items-center justify-between hover:bg-blue-50 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        {member.name && member.name.length > 0
                          ? member.name.charAt(0).toUpperCase()
                          : (member.email && member.email.length > 0
                              ? member.email.charAt(0).toUpperCase()
                              : '?')}
                      </div>
                      <div>
                        <div className="font-medium text-blue-800">
                          {member.name || 'Пользователь без имени'}
                        </div>
                        <div className="text-sm text-blue-600">
                          {member.email || 'Email не указан'}
                        </div>
                        <div className="text-xs mt-1">
                          <span className={`px-2 py-0.5 rounded-full ${member.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {member.role === 'owner' ? 'Владелец' : 'Участник'}
                          </span>
                          {member.userId && currentUser?.id && member.userId === currentUser.id && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Вы
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Показываем кнопку удаления, если пользователь владелец */}
                    {isOwner &&
                      member.userId && currentUser?.id && member.userId !== currentUser.id && (
                      <Button
                        variant="danger"
                        className="!px-2 !py-1 !text-xs"
                        onClick={() => member.userId && handleRemoveMemberClick(member.userId)}
                      >
                        Удалить
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="7" r="4" />
                    <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
                  </svg>
                </div>
                <div className="text-blue-600 mb-1">
                  {active ? 'Загрузка участников...' : 'Выберите доску для просмотра участников'}
                </div>
                <div className="text-xs text-blue-400">
                  {active ? 'Обновление списка...' : 'Нет данных для отображения'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Member Removal */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Удаление участника"
        message={`Вы уверены, что хотите удалить ${memberToRemove?.name || 'этого участника'} с доски?`}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
        variant="danger"
      />
    </dialog>
  );
}
