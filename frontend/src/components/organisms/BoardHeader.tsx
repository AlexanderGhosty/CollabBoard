import { useCallback } from 'react';
import Button from '@/components/atoms/Button';
import { useBoardStore } from '@/store/useBoardStore';
import { useNavigate } from 'react-router-dom';

export default function BoardHeader() {
  const navigate = useNavigate();
  // Use specific selectors for each piece of state/action needed
  const board = useBoardStore(state => state.active);
  const createList = useBoardStore(state => state.createList);

  // Define all hooks before any conditional returns
  const handleBackClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Define the createList callback here, not inside JSX
  const handleCreateList = useCallback(() => {
    createList('Новый список');
  }, [createList]);

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
        <h2 className="text-2xl font-bold text-blue-800 bg-white/70 px-4 py-2 rounded-xl shadow-sm backdrop-blur-sm">
          {board.name}
        </h2>
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