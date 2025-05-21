import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import BoardHeader from '@/components/organisms/BoardHeader';
import BoardTemplate from '@/components/templates/BoardTemplate';
import Header from '@/components/organisms/Header';
import { useBoardStore } from '@/store/useBoardStore';
import { subscribeWS } from '@/services/websocket';
import './BoardPage.css';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use specific selectors for the store functions
  const loadBoard = useBoardStore(state => state.loadBoard);
  const active = useBoardStore(state => state.active);

  // Add board-page class to body when component mounts
  useEffect(() => {
    document.body.classList.add('board-page');

    // Remove the class when component unmounts
    return () => {
      document.body.classList.remove('board-page');
    };
  }, []);

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

      // Subscribe to board_updated event to handle real-time board name updates
      const unsubscribeUpdated = subscribeWS('board_updated', (data: any) => {
        console.log('BoardPage received board_updated event:', data);
        const updatedBoardId = String(data.id || data.ID || '');
        if (updatedBoardId === id) {
          // The board store will handle the update automatically via the applyWS method
          console.log('Current board was updated via WebSocket');
        }
      });

      return () => {
        unsubscribeDeleted();
        unsubscribeUpdated();
      };
    }
  }, [id, loadBoard, navigate]);

  // If there's no active board, don't render anything
  // This can happen if the board was deleted or doesn't exist
  if (!active) {
    return null;
  }

  return (
    <main className="flex min-h-screen w-full flex-col p-0 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-x-visible">
      <Header />
      <div className="w-full px-4 overflow-visible">
        <div className="mx-auto max-w-7xl">
          <BoardHeader />
        </div>
        <BoardTemplate />
      </div>
    </main>
  );
}