import Button from '@/components/atoms/Button';
import { useBoardStore } from '@/store/useBoardStore';

export default function BoardHeader() {
  const store = useBoardStore();
  const board = store.active;
  if (!board) return null;

  return (
    <header className="mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-zinc-800">{board.title}</h2>
      <Button variant="secondary" onClick={() => store.createList('Новый список')}>＋ Список</Button>
    </header>
  );
}