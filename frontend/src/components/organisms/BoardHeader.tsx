import { useCallback, useState } from 'react';
import Button from '@/components/atoms/Button';
import EditableText from '@/components/atoms/EditableText';
import { useBoardStore, useListsStore } from '@/store/board';
import { useNavigate } from 'react-router-dom';
import { boardNameSchema } from '@/utils/validate';
import MemberManagementModal from '@/components/molecules/MemberManagementModal';

export default function BoardHeader() {
  const navigate = useNavigate();
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // Use specific selectors for each piece of state/action needed
  const activeBoard = useBoardStore(state => state.activeBoard);
  const boards = useBoardStore(state => state.boards);
  const createList = useListsStore(state => state.createList);
  const updateBoardName = useBoardStore(state => state.updateBoardName);

  // Get the active board object
  const board = activeBoard ? boards[activeBoard] : null;

  // Define all hooks before any conditional returns
  const handleBackClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Define the createList callback here, not inside JSX
  const handleCreateList = useCallback(() => {
    createList('Новый список');
  }, [createList]);

  // Define the member management modal open/close handlers
  const handleOpenMemberModal = useCallback(() => {
    setIsMemberModalOpen(true);
  }, []);

  const handleCloseMemberModal = useCallback(() => {
    setIsMemberModalOpen(false);
  }, []);

  // Handle board name update
  const handleBoardNameUpdate = useCallback(async (newName: string) => {
    if (!board) return;

    // Validate the board name
    try {
      boardNameSchema.parse(newName);

      // Check if user has permission to rename the board (only owners can)
      if (board.role !== 'owner') {
        throw new Error("Only board owners can rename boards");
      }

      await updateBoardName(board.id, newName);
    } catch (error) {
      console.error('Board name validation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Invalid board name');
    }
  }, [board, updateBoardName]);

  // Conditional return after all hooks are defined
  if (!board) return null;

  // Check if the current user is the owner of the board
  const isOwner = board.role === 'owner';

  return (
    <header className="mb-6 flex items-center justify-between page-enter animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={handleBackClick}
          className="!px-4 !py-2 !rounded-xl hover:!shadow-md transition-all duration-200 hover:!translate-x-[-2px]"
          title="Back to boards list"
        >
          ← Назад
        </Button>
        <div className="bg-white/70 px-4 py-2 rounded-xl shadow-sm backdrop-blur-sm">
          <EditableText
            value={board.name}
            onSave={handleBoardNameUpdate}
            textClassName="text-2xl font-bold text-blue-800"
            inputClassName="text-2xl font-bold text-blue-800"
            placeholder="Enter board name"
            validateEmpty={true}
            emptyErrorMessage="Board name cannot be empty"
          />
        </div>
        {board.role && (
          <span className={`text-xs px-3 py-1.5 rounded-full ${board.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {board.role === 'owner' ? 'Владелец' : 'Участник'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={handleOpenMemberModal}
          className="hover:!shadow-md transition-all duration-200 hover:!translate-y-[-2px] !px-4 !py-2"
          title="Manage board members"
        >
          👥 Участники
        </Button>
        <Button
          variant="primary"
          onClick={handleCreateList}
          className="hover:!shadow-md transition-all duration-200 hover:!translate-y-[-2px] !px-4 !py-2"
        >
          ＋ Добавить список
        </Button>
      </div>

      {/* Member Management Modal */}
      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={handleCloseMemberModal}
      />
    </header>
  );
}