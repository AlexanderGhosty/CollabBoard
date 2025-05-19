import Button from '@/components/atoms/Button';
import { useBoardStore } from '@/store/useBoardStore';
import { useNavigate } from 'react-router-dom';

export default function BoardHeader() {
  const navigate = useNavigate();
  const store = useBoardStore();
  const board = store.active;
  if (!board) return null;

  const handleBackClick = () => {
    navigate('/');
  };

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
        <h2 className="text-2xl font-bold text-zinc-800">{board.name}</h2>
      </div>
      <Button variant="secondary" onClick={() => store.createList('Новый список')}>＋ Список</Button>
    </header>
  );
}