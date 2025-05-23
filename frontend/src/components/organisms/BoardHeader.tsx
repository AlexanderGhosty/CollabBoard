import { useCallback, useState } from 'react';
import Button from '@/components/atoms/Button';
import EditableText from '@/components/atoms/EditableText';
import { useBoardStore, useListsStore } from '@/store/board';
import { useNavigate } from 'react-router-dom';
import { boardNameSchema } from '@/utils/validate';
import ParticipantsModal from '@/components/molecules/ParticipantsModal';

export default function BoardHeader() {
  const navigate = useNavigate();
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

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
        <div className="bg-white/70 dark:bg-dark-blue-50/70 px-4 py-2 rounded-xl shadow-sm dark:shadow-dark-card backdrop-blur-sm transition-colors duration-300">
          {board.role === 'owner' ? (
            <EditableText
              value={board.name}
              onSave={handleBoardNameUpdate}
              textClassName="text-2xl font-bold text-blue-800 dark:text-blue-300"
              inputClassName="text-2xl font-bold text-blue-800 dark:text-blue-300 dark:bg-dark-blue-100 dark:border-dark-blue-200"
              placeholder="Enter board name"
              validateEmpty={true}
              emptyErrorMessage="Board name cannot be empty"
            />
          ) : (
            <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300 transition-colors duration-300">{board.name}</h1>
          )}
        </div>
        {board.role && (
          <span className={`text-xs px-3 py-1.5 rounded-full transition-colors duration-300 ${
            board.role === 'owner'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
          }`}>
            {board.role === 'owner' ? 'Владелец' : 'Участник'}
          </span>
        )}
      </div>

      <div>
        <Button
          variant="secondary"
          onClick={() => setShowParticipantsModal(true)}
          className="!px-4 !py-2 !rounded-xl hover:!shadow-md transition-all duration-200"
          title="Manage board participants"
        >
          Участники
        </Button>
      </div>

      {/* Participants Modal */}
      {activeBoard && (
        <ParticipantsModal
          isOpen={showParticipantsModal}
          onClose={() => setShowParticipantsModal(false)}
          boardId={activeBoard}
        />
      )}
    </header>
  );
}