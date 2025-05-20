import { DragOverlay as DndKitDragOverlay } from '@dnd-kit/core';
import { Card } from '@/services/boardService';
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

  // Default fallback - should not happen in normal usage
  return null;
}

interface CardDragOverlayProps {
  card: Card;
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
    transform: 'rotate(2deg)', // Slight rotation for visual feedback
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)', // Enhanced shadow
  };

  return (
    <DndKitDragOverlay
      dropAnimation={{
        duration: 300,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}
      className="dnd-draggable-overlay"
    >
      <div
        style={style}
        className="rounded-2xl bg-white p-3 shadow-lg cursor-grabbing z-50 dnd-dragging-animation w-auto"
      >
        <div className="w-full max-w-[272px]">
          <p className="text-sm text-zinc-800 break-words pr-6">{card.title}</p>
          {card.description && (
            <div className="mt-2 text-xs text-zinc-500">
              <span className="inline-block mr-1">📝</span>
              Есть описание
            </div>
          )}
        </div>
      </div>
    </DndKitDragOverlay>
  );
}
