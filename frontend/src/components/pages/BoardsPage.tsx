import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useBoardStore } from '@/store/useBoardStore';
import { subscribeWS } from '@/services/websocket';

export default function BoardsPage() {
  const store = useBoardStore();
  const { boards } = store;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Fetch boards when component mounts
    store.fetchBoards();

    // Subscribe to board_created, board_updated, and board_deleted events for real-time updates
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

    const unsubscribeDeleted = subscribeWS('board_deleted', (data: any) => {
      console.log('BoardsPage received board_deleted event:', data);
      // Refresh the boards list to remove the deleted board
      store.fetchBoards();
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
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

  const handleDeleteClick = useCallback((e: React.MouseEvent, boardId: string, boardName: string) => {
    // Prevent navigation to the board page
    e.preventDefault();
    e.stopPropagation();

    // Set the board to delete
    setBoardToDelete({ id: boardId, name: boardName });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (boardToDelete) {
      await store.deleteBoard(boardToDelete.id);
      setBoardToDelete(null);
    }
  }, [boardToDelete, store]);

  return (
    <main className="mx-auto max-w-7xl p-6 flex flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-blue-800">Ваши доски</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Название доски"
              className="w-60 rounded-2xl border border-indigo-100 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={handleCreate} loading={creating}>
              Создать
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                  <div key={boardId} className="relative group">
                    <Link
                      to={`/board/${boardId}`}
                      className="block rounded-2xl border border-indigo-100 bg-white p-4 shadow-md transition-colors hover:bg-blue-50 h-full"
                    >
                      <h2 className="text-lg font-semibold text-blue-800 pr-8">{b.name}</h2>
                    </Link>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="danger"
                        className="!px-2 !py-1 !text-xs"
                        onClick={(e) => handleDeleteClick(e, boardId, b.name)}
                        title={`Удалить доску ${b.name}`}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                );
              })
              .filter(Boolean) // Remove null entries
          ) : (
            <div className="col-span-full text-center py-8 text-blue-600 bg-white rounded-2xl shadow-md border border-indigo-100 p-8">
              У вас пока нет досок. Создайте первую доску, используя форму выше.
            </div>
          )}
        </section>

        {/* Confirmation dialog for board deletion */}
        <ConfirmDialog
          isOpen={boardToDelete !== null}
          title="Удалить доску"
          message={boardToDelete ? `Вы уверены, что хотите удалить доску "${boardToDelete.name}"? Это действие нельзя отменить.` : ''}
          confirmLabel="Удалить"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setBoardToDelete(null)}
        />
      </div>
    </main>
  );
}