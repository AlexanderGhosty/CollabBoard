import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import BoardHeader from '@/components/organisms/BoardHeader';
import BoardTemplate from '@/components/templates/BoardTemplate';
import { useBoardStore } from '@/store/useBoardStore';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  // Use a specific selector for the loadBoard function
  const loadBoard = useBoardStore(state => state.loadBoard);

  useEffect(() => {
    if (id) {
      loadBoard(id);
    }
    // We can now include loadBoard in the dependency array
  }, [id, loadBoard]);

  return (
    <main className="flex min-h-screen flex-col p-4">
      <BoardHeader />
      <BoardTemplate />
    </main>
  );
}