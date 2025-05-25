import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useMembersStore } from '@/store/board';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { BoardMember } from '@/store/board/types';
import { isValidEmail } from '@/utils/validate';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

export default function ParticipantsModal({ isOpen, onClose, boardId }: ParticipantsModalProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();

  // Get current user
  const currentUser = useAuthStore(state => state.user);

  // Toast notifications
  const { success, error: showError } = useToastStore();

  // Members store
  const {
    members,
    boardMembers,
    fetchBoardMembers,
    inviteMember,
    removeMember,
    leaveBoard,
    getMembersByBoardId,
    isUserBoardOwner
  } = useMembersStore();

  // Get members for this board
  const boardMembersList = getMembersByBoardId(boardId);

  // Check if current user is board owner
  const isOwner = currentUser ? isUserBoardOwner(boardId, currentUser.id) : false;

  // Fetch members when component mounts
  useEffect(() => {
    if (isOpen && boardId) {
      fetchBoardMembers(boardId);
    }
  }, [isOpen, boardId, fetchBoardMembers]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen && dialog) {
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
      dialog.close();
    }

    // Clean up function to ensure dialog is closed when component unmounts
    return () => {
      if (dialog && dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  const handleDialogClick = (e: React.MouseEvent) => {
    // Close the dialog if the backdrop is clicked
    const dialogDimensions = dialogRef.current?.getBoundingClientRect();
    if (
      dialogDimensions &&
      (e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom)
    ) {
      onClose();
    }
  };

  const handleInvite = async () => {
    // Validate email
    if (!email.trim()) {
      setEmailError('Email обязателен');
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError('Пожалуйста, введите корректный email адрес');
      return;
    }

    setIsSubmitting(true);
    setEmailError('');

    try {
      await inviteMember(email, 'member');
      setEmail('');
      success(`Пользователь ${email} успешно приглашен на доску`);
    } catch (err) {
      console.error('Error inviting member:', err);
      showError(err instanceof Error ? err.message : 'Не удалось пригласить пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!isOwner) return;

    setIsRemoving(userId);

    try {
      // Pass the boardId explicitly to ensure the API is called with the expected parameters
      await removeMember(userId, boardId);
      success('Пользователь удален с доски');
    } catch (err) {
      console.error('Error removing member:', err);
      showError(err instanceof Error ? err.message : 'Не удалось удалить участника');
    } finally {
      setIsRemoving(null);
    }
  };

  // Handle showing the leave confirmation dialog
  const handleLeaveClick = () => {
    if (!currentUser || isOwner) return;
    setShowLeaveConfirm(true);
  };

  // Handle the actual board leaving process
  const handleLeaveConfirm = async () => {
    if (!currentUser || isOwner) return;

    setIsLeaving(true);
    try {
      const success = await leaveBoard();
      if (success) {
        // Close the modal first
        onClose();

        // Use setTimeout to ensure all state updates are processed
        // before navigation occurs
        setTimeout(() => {
          // Navigate to boards page using React Router
          // This prevents a full page reload
          navigate('/');
        }, 100);
      }
    } catch (err) {
      console.error('Error leaving board:', err);
      showError(err instanceof Error ? err.message : 'Не удалось покинуть доску');
      setIsLeaving(false);
    } finally {
      setShowLeaveConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[1000] rounded-2xl bg-white dark:bg-dark-blue-50 p-6 shadow-xl dark:shadow-dark-modal
        w-full max-w-md modal-enter animate-modal-in border border-blue-100 dark:border-dark-blue-100 m-auto transition-colors duration-300"
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
          <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 transition-colors duration-300">Управление участниками</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300
              hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
          >
            ✕
          </button>
        </div>

        {/* Members list */}
        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto">
          <h4 className="font-medium text-blue-700 dark:text-blue-400 transition-colors duration-300">Текущие участники</h4>
          {boardMembersList.length === 0 ? (
            <p className="text-blue-600 dark:text-blue-400 text-sm italic transition-colors duration-300">Загрузка участников...</p>
          ) : (
            boardMembersList.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 transition-colors duration-300"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-800 dark:text-blue-300 transition-colors duration-300">{member.name}</span>
                    {currentUser && member.userId === currentUser.id && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full transition-colors duration-300">Вы</span>
                    )}
                  </div>
                  <span className="text-sm text-blue-600 dark:text-blue-400 transition-colors duration-300">{member.email}</span>
                  <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block w-fit transition-colors duration-300
                    ${member.role === 'owner'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300'}`}>
                    {member.role === 'owner' ? 'Владелец' : 'Участник'}
                  </span>
                </div>

                {/* Only show remove button for non-owners and if current user is owner */}
                {isOwner && member.role !== 'owner' && (
                  <Button
                    variant="danger"
                    className="!px-2 !py-1 !text-sm"
                    onClick={() => handleRemoveMember(member.userId)}
                    loading={isRemoving === member.userId}
                    disabled={!!isRemoving}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Leave board button - only visible to members */}
        {currentUser && !isOwner && (
          <div className="mt-2 border-t border-blue-100 dark:border-blue-800 pt-4 transition-colors duration-300">
            <Button
              variant="danger"
              className="w-full"
              onClick={handleLeaveClick}
              loading={isLeaving}
              disabled={isLeaving}
            >
              Покинуть доску
            </Button>
          </div>
        )}

        {/* Leave board confirmation dialog */}
        <ConfirmDialog
          isOpen={showLeaveConfirm}
          title="Покинуть доску"
          message="Вы уверены, что хотите покинуть эту доску? Вы больше не будете иметь доступа к ней."
          confirmLabel="Покинуть"
          variant="danger"
          onConfirm={handleLeaveConfirm}
          onCancel={() => setShowLeaveConfirm(false)}
        />

        {/* Invite form - only visible to owners */}
        {isOwner && (
          <div className="mt-2 border-t border-blue-100 dark:border-blue-800 pt-4 transition-colors duration-300">
            <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-3 transition-colors duration-300">Пригласить нового участника</h4>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email адрес"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                className="flex-1"
              />
              <Button
                onClick={handleInvite}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Пригласить
              </Button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
