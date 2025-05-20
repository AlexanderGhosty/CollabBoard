import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import { useBoardStore } from '@/store/useBoardStore';
import { subscribeWS } from '@/services/websocket';

export default function BoardsPage() {
  const store = useBoardStore();
  const { boards } = store;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    // Fetch boards when component mounts
    store.fetchBoards();

    // Subscribe to board_created and board_updated events for real-time updates
    const unsubscribeCreated = subscribeWS('board_created', (data: any) => {
      console.log('BoardsPage received board_created event:', data);
      // Refresh the boards list to show the new board
      store.fetchBoards();
    });

    const unsubscribeUpdated = subscribeWS('board_updated', (data: any) => {
      console.log('BoardsPage received board_updated event:', data);
      // Refresh the boards list to show updated board names
      store.fetchBoards();
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await store.createBoard(name.trim());
      setName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-zinc-800">Ваши доски</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Название доски"
            className="w-60 rounded-2xl border border-zinc-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={handleCreate} loading={creating}>
            Создать
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {boards && boards.length > 0 ? (
          boards
            .filter(b => b && b.id) // Filter out boards without IDs
            .map((b) => {
              // Ensure board ID is a string and not undefined
              const boardId = b.id ? String(b.id) : null;
              if (!boardId) {
                console.error("Board with undefined ID:", b);
                return null; // Skip this board
              }
              return (
                <Link
                  key={boardId}
                  to={`/board/${boardId}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow transition-colors hover:bg-zinc-50"
                >
                  <h2 className="text-xl font-semibold text-zinc-800">{b.name}</h2>
                </Link>
              );
            })
            .filter(Boolean) // Remove null entries
        ) : (
          <div className="col-span-full text-center py-8 text-zinc-500">
            У вас пока нет досок. Создайте первую доску, используя форму выше.
          </div>
        )}
      </section>
    </main>
  );
}