import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import BoardHeader from '@/components/organisms/BoardHeader';
import BoardTemplate from '@/components/templates/BoardTemplate';
import { useBoardStore } from '@/store/useBoardStore';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const store = useBoardStore();

  useEffect(() => {
    if (id) {
      store.loadBoard(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main className="flex min-h-screen flex-col p-4">
      <BoardHeader />
      <BoardTemplate />
    </main>
  );
}