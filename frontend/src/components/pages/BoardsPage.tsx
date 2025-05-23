import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import Header from '@/components/organisms/Header';
import { useBoardStore } from '@/store/board';
import { subscribeWS } from '@/services/websocket';
import { Board } from '@/services/boardService';

export default function BoardsPage() {
  // Get state and actions from the store
  const fetchBoardsByRole = useBoardStore(state => state.fetchBoardsByRole);
  const createBoard = useBoardStore(state => state.createBoard);
  const deleteBoard = useBoardStore(state => state.deleteBoard);
  const boards = useBoardStore(state => state.boards);
  const ownedBoardIds = useBoardStore(state => state.ownedBoardIds);
  const memberBoardIds = useBoardStore(state => state.memberBoardIds);

  // Convert normalized data to arrays for display
  const ownedBoards = ownedBoardIds.map(id => boards[id]).filter(Boolean);
  const memberBoards = memberBoardIds.map(id => boards[id]).filter(Boolean);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Fetch boards by role when component mounts
    fetchBoardsByRole();

    // Subscribe to board_created, board_updated, and board_deleted events for real-time updates
    const unsubscribeCreated = subscribeWS('board_created', (data: any) => {
      console.log('BoardsPage received board_created event:', data);
      // Refresh the boards list to show the new board
      fetchBoardsByRole();
    });

    const unsubscribeUpdated = subscribeWS('board_updated', (data: any) => {
      console.log('BoardsPage received board_updated event:', data);
      // Refresh the boards list to show updated board names
      fetchBoardsByRole();
    });

    const unsubscribeDeleted = subscribeWS('board_deleted', (data: any) => {
      console.log('BoardsPage received board_deleted event:', data);
      // Refresh the boards list to remove the deleted board
      fetchBoardsByRole();
    });

    const unsubscribeMemberAdded = subscribeWS('member_added', (data: any) => {
      console.log('BoardsPage received member_added event:', data);
      // Refresh the boards list to show newly shared boards
      fetchBoardsByRole();
    });

    const unsubscribeMemberRemoved = subscribeWS('member_removed', (data: any) => {
      console.log('BoardsPage received member_removed event:', data);
      // Refresh the boards list to remove unshared boards
      fetchBoardsByRole();
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
      await createBoard(name.trim());
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
      await deleteBoard(boardToDelete.id);
      setBoardToDelete(null);
    }
  }, [boardToDelete, deleteBoard]);

  // Function to render a board card
  const renderBoardCard = (board: Board, canDelete = false) => {
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
          className="block rounded-2xl border border-indigo-100 dark:border-dark-blue-100 bg-white dark:bg-dark-blue-50 p-4 shadow-md dark:shadow-dark-card transition-colors hover:bg-blue-50 dark:hover:bg-dark-blue-100 h-full"
        >
          <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-300 pr-8">{board.name}</h2>
          {board.role && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              board.role === 'owner'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
            }`}>
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
    <main className="w-full min-h-screen p-0 flex flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-dark-blue-300 dark:to-dark-blue-200 transition-colors duration-300">
      <Header />
      <div className="w-full max-w-7xl px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-300 transition-colors duration-300">Доски</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Название доски"
              className="w-60 rounded-2xl border border-indigo-100 dark:border-dark-blue-100 bg-white dark:bg-dark-blue-50 text-blue-800 dark:text-blue-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 transition-colors duration-300"
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
          <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4 transition-colors duration-300">Мои доски</h2>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {ownedBoards && ownedBoards.length > 0 ? (
              ownedBoards
                .filter(b => b && b.id) // Filter out boards without IDs
                .map((board) => renderBoardCard(board, true))
                .filter(Boolean) // Remove null entries
            ) : (
              <div className="col-span-full text-center py-6 text-blue-600 dark:text-blue-300 bg-white dark:bg-dark-blue-50 rounded-2xl shadow-md dark:shadow-dark-card border border-indigo-100 dark:border-dark-blue-100 p-6 transition-colors duration-300">
                У вас пока нет собственных досок. Создайте первую доску, используя форму выше.
              </div>
            )}
          </section>
        </div>

        {/* Shared With Me Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-4 transition-colors duration-300">Доски, к которым у меня есть доступ</h2>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {memberBoards && memberBoards.length > 0 ? (
              memberBoards
                .filter(b => b && b.id) // Filter out boards without IDs
                .map((board) => renderBoardCard(board, false))
                .filter(Boolean) // Remove null entries
            ) : (
              <div className="col-span-full text-center py-6 text-blue-600 dark:text-blue-300 bg-white dark:bg-dark-blue-50 rounded-2xl shadow-md dark:shadow-dark-card border border-indigo-100 dark:border-dark-blue-100 p-6 transition-colors duration-300">
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