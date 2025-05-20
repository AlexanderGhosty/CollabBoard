import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import BoardHeader from '@/components/organisms/BoardHeader';
import BoardTemplate from '@/components/templates/BoardTemplate';
import { useBoardStore } from '@/store/useBoardStore';
import { subscribeWS } from '@/services/websocket';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use specific selectors for the store functions
  const loadBoard = useBoardStore(state => state.loadBoard);
  const active = useBoardStore(state => state.active);

  useEffect(() => {
    if (id) {
      loadBoard(id);

      // Subscribe to board_deleted event to handle navigation when the board is deleted
      const unsubscribeDeleted = subscribeWS('board_deleted', (data: any) => {
        const deletedBoardId = String(data.id || data.ID || '');
        if (deletedBoardId === id) {
          // Navigate to the boards list page if the current board is deleted
          navigate('/');
        }
      });

      return () => {
        unsubscribeDeleted();
      };
    }
  }, [id, loadBoard, navigate]);

  // If there's no active board, don't render anything
  // This can happen if the board was deleted or doesn't exist
  if (!active) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col p-4">
      <BoardHeader />
      <BoardTemplate />
    </main>
  );
}