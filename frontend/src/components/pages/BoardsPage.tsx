import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import Header from '@/components/organisms/Header';
import { useBoardStore } from '@/store/useBoardStore';
import { subscribeWS } from '@/services/websocket';

export default function BoardsPage() {
  const store = useBoardStore();
  const { boards, ownedBoards, memberBoards } = store;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Fetch boards by role when component mounts
    store.fetchBoardsByRole();

    // Subscribe to board_created, board_updated, and board_deleted events for real-time updates
    const unsubscribeCreated = subscribeWS('board_created', (data: any) => {
      console.log('BoardsPage received board_created event:', data);
      // Refresh the boards list to show the new board
      store.fetchBoardsByRole();
    });

    const unsubscribeUpdated = subscribeWS('board_updated', (data: any) => {
      console.log('BoardsPage received board_updated event:', data);
      // Refresh the boards list to show updated board names
      store.fetchBoardsByRole();
    });

    const unsubscribeDeleted = subscribeWS('board_deleted', (data: any) => {
      console.log('BoardsPage received board_deleted event:', data);
      // Refresh the boards list to remove the deleted board
      store.fetchBoardsByRole();
    });

    const unsubscribeMemberAdded = subscribeWS('member_added', (data: any) => {
      console.log('BoardsPage received member_added event:', data);
      // Refresh the boards list to show newly shared boards
      store.fetchBoardsByRole();
    });

    const unsubscribeMemberRemoved = subscribeWS('member_removed', (data: any) => {
      console.log('BoardsPage received member_removed event:', data);
      // Refresh the boards list to remove unshared boards
      store.fetchBoardsByRole();
    });

    // Cleanup subscriptions when component unmounts
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeMemberAdded();
      unsubscribeMemberRemoved();
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

  // Function to render a board card
  const renderBoardCard = (board: any, canDelete = false) => {
    // Ensure board ID is a string and not undefined
    const boardId = board.id ? String(board.id) : null;
    if (!boardId) {
      console.error("Board with undefined ID:", board);
      return null; // Skip this board
    }

    return (
      <div key={boardId} className="relative group">
        <Link
          to={`/board/${boardId}`}
          className="block rounded-2xl border border-indigo-100 bg-white p-4 shadow-md transition-colors hover:bg-blue-50 h-full"
        >
          <h2 className="text-lg font-semibold text-blue-800 pr-8">{board.name}</h2>
          {board.role && (
            <span className={`text-xs px-2 py-1 rounded-full ${board.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {board.role === 'owner' ? 'Владелец' : 'Участник'}
            </span>
          )}
        </Link>
        {canDelete && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="danger"
              className="!px-2 !py-1 !text-xs"
              onClick={(e) => handleDeleteClick(e, boardId, board.name)}
              title={`Удалить доску ${board.name}`}
            >
              ✕
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="w-full min-h-screen p-0 flex flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="w-full max-w-7xl px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-blue-800">Доски</h1>
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
        </div>

        {/* My Boards Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Мои доски</h2>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {ownedBoards && ownedBoards.length > 0 ? (
              ownedBoards
                .filter(b => b && b.id) // Filter out boards without IDs
                .map((board) => renderBoardCard(board, true))
                .filter(Boolean) // Remove null entries
            ) : (
              <div className="col-span-full text-center py-6 text-blue-600 bg-white rounded-2xl shadow-md border border-indigo-100 p-6">
                У вас пока нет собственных досок. Создайте первую доску, используя форму выше.
              </div>
            )}
          </section>
        </div>

        {/* Shared With Me Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-indigo-700 mb-4">Доски, к которым у меня есть доступ</h2>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {memberBoards && memberBoards.length > 0 ? (
              memberBoards
                .filter(b => b && b.id) // Filter out boards without IDs
                .map((board) => renderBoardCard(board, false))
                .filter(Boolean) // Remove null entries
            ) : (
              <div className="col-span-full text-center py-6 text-blue-600 bg-white rounded-2xl shadow-md border border-indigo-100 p-6">
                У вас пока нет доступа к чужим доскам. Когда кто-то пригласит вас на свою доску, она появится здесь.
              </div>
            )}
          </section>
        </div>

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