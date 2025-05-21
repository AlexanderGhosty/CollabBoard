import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import { Card, List } from '@/services/boardService';
import { CSSProperties, useEffect, useState } from 'react';

interface DragOverlayProps {
  activeId: string | null;
  activeData: any;
}

export default function DragOverlay({ activeId, activeData }: DragOverlayProps) {
  if (!activeId || !activeData) return null;

  // Determine what type of item is being dragged
  const type = activeData.type;

  if (type === 'card') {
    return <CardDragOverlay card={activeData.card} />;
  }

  if (type === 'list') {
    return <ListDragOverlay list={activeData.list} />;
  }

  // Default fallback - should not happen in normal usage
  return null;
}

interface CardDragOverlayProps {
  card: Card;
}

interface ListDragOverlayProps {
  list: List;
}

function ListDragOverlay({ list }: ListDragOverlayProps) {
  // Style for the dragged list
  const style: CSSProperties = {
    width: '288px', // Same as w-72 (18rem = 288px)
    transform: 'rotate(3deg) scale(1.02)', // Enhanced rotation and slight scale for visual feedback
    boxShadow: '0 12px 20px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', // Enhanced shadow
    background: 'linear-gradient(to bottom right, #ffffff, #f0f9ff)', // Subtle gradient
  };

  return (
    <DndKitDragOverlay
      dropAnimation={{
        duration: 400,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
      className="dnd-draggable-overlay"
    >
      <div
        style={style}
        className="rounded-2xl p-4 cursor-grabbing z-50 dnd-dragging-animation border border-blue-100"
      >
        <div className="font-semibold text-blue-800 px-2 mb-3 text-lg">{list.title}</div>
        <div className="bg-blue-50/80 rounded-xl p-3 text-center text-sm text-blue-600 font-medium border border-blue-100">
          {list.cards?.length || 0} карточек
        </div>
      </div>
    </DndKitDragOverlay>
  );
}

function CardDragOverlay({ card }: CardDragOverlayProps) {
  // State to track window width for responsive sizing
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Style for the dragged card
  const style: CSSProperties = {
    width: windowWidth < 640 ? '90%' : '272px', // Responsive width
    transform: 'rotate(3deg) scale(1.02)', // Enhanced rotation and slight scale
    boxShadow: '0 12px 20px -5px rgba(0, 0, 0, 0.15), 0 8px 12px -6px rgba(0, 0, 0, 0.1)', // Enhanced shadow
    background: 'linear-gradient(to bottom right, #ffffff, #f8fafc)', // Subtle gradient
  };

  return (
    <DndKitDragOverlay
      dropAnimation={{
        duration: 400,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
      className="dnd-draggable-overlay"
    >
      <div
        style={style}
        className="rounded-2xl p-4 cursor-grabbing z-50 dnd-dragging-animation w-auto border border-blue-100"
      >
        <div className="w-full max-w-[272px]">
          <p className="text-sm font-medium text-blue-800 break-words pr-6 leading-snug">{card.title}</p>
          {card.description && (
            <div className="mt-3 text-xs text-blue-600 flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full mr-2">
                <span className="text-blue-600">📝</span>
              </span>
              <span>Есть описание</span>
            </div>
          )}
        </div>
      </div>
    </DndKitDragOverlay>
  );
}
