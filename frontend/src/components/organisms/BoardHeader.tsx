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
    <header className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={handleBackClick}
          className="!px-3 !py-1"
          title="Back to boards list"
        >
          ← Назад
        </Button>
        <h2 className="text-2xl font-bold text-blue-800">{board.name}</h2>
      </div>
      <Button
        variant="secondary"
        onClick={handleCreateList}
      >
        ＋ Список
      </Button>
    </header>
  );
}