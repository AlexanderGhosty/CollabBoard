import { useCallback } from 'react';
import Button from '@/components/atoms/Button';
import EditableText from '@/components/atoms/EditableText';
import { useBoardStore } from '@/store/useBoardStore';
import { useNavigate } from 'react-router-dom';
import { boardNameSchema } from '@/utils/validate';

export default function BoardHeader() {
  const navigate = useNavigate();
  // Use specific selectors for each piece of state/action needed
  const board = useBoardStore(state => state.active);
  const createList = useBoardStore(state => state.createList);
  const updateBoardName = useBoardStore(state => state.updateBoardName);

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
      await updateBoardName(board.id, newName);
    } catch (error) {
      console.error('Board name validation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Invalid board name');
    }
  }, [board, updateBoardName]);

  // Conditional return after all hooks are defined
  if (!board) return null;

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
      </div>
      <Button
        variant="primary"
        onClick={handleCreateList}
        className="hover:!shadow-md transition-all duration-200 hover:!translate-y-[-2px] !px-4 !py-2"
      >
        ＋ Добавить список
      </Button>
    </header>
  );
}