import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { z } from 'zod';
import Button from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useBoardStore } from '@/store/useBoardStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { emailSchema } from '@/utils/validate';

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

  const { boardMembers, active, fetchBoardMembers, inviteMember, removeMember, setMemberModalOpen } = useBoardStore();
  const currentUser = useAuthStore(state => state.user);
  const toast = useToastStore();

  // Fetch board members when the modal opens
  useEffect(() => {
    if (isOpen) {
      if (active && active.id) {
        try {
          console.log('Modal opened, fetching board members for board:', active);
          fetchBoardMembers();
        } catch (error) {
          console.error('Error fetching board members:', error);
          toast.error('Не удалось загрузить список участников');
        }
      } else {
        console.warn('Modal opened but no active board is selected');
      }
    }
  }, [isOpen, active, fetchBoardMembers, toast]);

  // Force refresh board members when the component mounts
  useEffect(() => {
    if (active && active.id) {
      console.log('MemberManagementModal mounted, forcing refresh of board members');
      console.log('Active board:', active);
      console.log('Current user:', currentUser);
      fetchBoardMembers();
    }
  }, [active, fetchBoardMembers, currentUser]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen && dialog) {
      // Update global state to track modal open state
      setMemberModalOpen(true);

      // Only call showModal if the dialog is not already open
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch (error) {
          console.error('Error opening dialog:', error);
          // If showModal fails, try to reset the dialog state
          dialog.close();
          // Try again after a short delay
          setTimeout(() => {
            if (!dialog.open) {
              try {
                dialog.showModal();
              } catch (innerError) {
                console.error('Failed to open dialog after retry:', innerError);
              }
            }
          }, 10);
        }
      }
    } else if (dialog) {
      // Update global state when modal closes
      setMemberModalOpen(false);
      dialog.close();
    }

    // Clean up function to ensure dialog is closed when component unmounts
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
        // Make sure global state is updated when component unmounts
        setMemberModalOpen(false);
      }
    };
  }, [isOpen, setMemberModalOpen]);

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

    // Validate email format
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
        return;
      }
    }

    if (!email.trim()) return;

    // Check if user is already a member
    const isAlreadyMember = safeBoardMembers.some(
      (member) => member.email?.toLowerCase() === email.trim().toLowerCase()
    );

    console.log("Checking if email is already a member:");
    console.log("- Email to invite:", email.trim().toLowerCase());
    console.log("- Existing member emails:", safeBoardMembers.map(m => m.email?.toLowerCase()));
    console.log("- Is already a member?", isAlreadyMember);

    if (isAlreadyMember) {
      setEmailError('Этот пользователь уже является участником доски');
      toast.error('Этот пользователь уже является участником доски');
      return;
    }

    // Check if current user is the owner
    if (!isOwner) {
      setEmailError('Только владелец доски может приглашать участников');
      toast.error('Только владелец доски может приглашать участников');
      return;
    }

    setLoading(true);
    try {
      console.log("Attempting to invite user with email:", email.trim());
      console.log("Current user ID:", currentUser?.id);
      console.log("Is current user the owner?", isOwner);

      await inviteMember(email.trim());
      setEmail(''); // Clear the input on success
      setInviteSuccess(true);
      setEmailError(null); // Clear any previous errors

      // Show success toast
      toast.success(`Пользователь ${email.trim()} успешно приглашен на доску`);

      // Refresh the members list
      await fetchBoardMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      setInviteSuccess(false);

      // Handle specific error cases
      if (error instanceof Error) {
        console.log("Error message:", error.message);

        if (error.message.includes('не найден') || error.message.includes('not found')) {
          setEmailError('Пользователь с таким email не найден');
          toast.error('Пользователь с таким email не найден');
        } else if (error.message.includes('владелец') || error.message.includes('owner')) {
          setEmailError(error.message);
          toast.error(error.message);
        } else if (error.message.includes('уже является') || error.message.includes('already')) {
          setEmailError('Этот пользователь уже является участником доски');
          toast.error('Этот пользователь уже является участником доски');
        } else {
          setEmailError(error.message);
          toast.error(error.message);
        }
      } else {
        setEmailError('Не удалось пригласить пользователя');
        toast.error('Не удалось пригласить пользователя');
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

    console.log("Preparing to remove member with userId:", userId);
    console.log("Current user ID:", currentUser?.id);
    console.log("Is current user the owner?", isOwner);

    // Find the member in the list
    const member = safeBoardMembers.find(m => String(m.userId) === String(userId));
    console.log("Member to remove:", member);

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
    if (!memberToRemove) return;

    try {
      setLoading(true);
      await removeMember(memberToRemove.userId);
      // Toast notification is now handled in the useBoardStore.removeMember function

      // Refresh the members list
      await fetchBoardMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      // Error toast notifications are now handled in the useBoardStore.removeMember function
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

  // Safe access to boardMembers
  const safeBoardMembers = Array.isArray(boardMembers) ? boardMembers : [];

  // Check if current user is the owner of the board (multiple ways)
  const isOwnerByRole = active?.role === 'owner';

  // Convert IDs to strings for comparison
  const currentUserIdStr = currentUser?.id ? String(currentUser.id) : '';

  const isUserOwnerInMembers = safeBoardMembers.some(m =>
    String(m.userId) === currentUserIdStr && m.role === 'owner');

  // Check both uppercase and lowercase ownerId properties
  const ownerIdFromUpperCase = active?.OwnerID ? String(active.OwnerID) : undefined;
  const ownerIdFromLowerCase = active?.ownerId ? String(active.ownerId) : undefined;
  const ownerId = ownerIdFromUpperCase || ownerIdFromLowerCase;
  const isOwnerByBoardData = ownerId === currentUserIdStr;

  // Combined check - user is owner if any of the checks pass
  const isOwner = isOwnerByRole || isUserOwnerInMembers || isOwnerByBoardData;

  // Add debug logs to see why the form might not be showing
  console.log("Active board:", active);
  console.log("User role on board:", active?.role);
  console.log("Current user ID (string):", currentUserIdStr);
  console.log("Owner ID from uppercase:", ownerIdFromUpperCase);
  console.log("Owner ID from lowercase:", ownerIdFromLowerCase);
  console.log("Combined owner ID:", ownerId);
  console.log("Is user owner by role?", isOwnerByRole);
  console.log("Is user owner by members check?", isUserOwnerInMembers);
  console.log("Is user owner by board data?", isOwnerByBoardData);
  console.log("Is user owner (combined)?", isOwner);
  console.log("Current user:", currentUser);
  console.log("Board members:", safeBoardMembers);

  // Log member user IDs for comparison
  if (safeBoardMembers.length > 0) {
    console.log("Member user IDs (as strings):", safeBoardMembers.map(m => String(m.userId)));
    console.log("Member with owner role:", safeBoardMembers.find(m => m.role === 'owner'));
  }

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
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email пользователя"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Clear error when user starts typing again
                    if (emailError) setEmailError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  error={emailError || undefined}
                  className="flex-grow"
                  autoFocus
                  disabled={loading}
                />
                <Button
                  onClick={handleInvite}
                  loading={loading}
                  disabled={!email.trim() || loading}
                >
                  Добавить
                </Button>
              </div>

              {inviteSuccess && !emailError && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded-xl border border-green-100 flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600">✓</span>
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
              {safeBoardMembers.length > 0 ? `Всего: ${safeBoardMembers.length}` : ''}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-blue-100 rounded-xl">
            {safeBoardMembers.length > 0 ? (
              <ul className="divide-y divide-blue-100">
                {safeBoardMembers.map((member) => (
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
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700">
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
