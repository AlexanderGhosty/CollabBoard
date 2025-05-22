import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/services/boardService';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import CardDetailModal from '@/components/molecules/CardDetailModal';
import { useBoardStore, useCardsStore } from '@/store/board';

export interface CardItemProps {
  card: Card;
}

export default function CardItem({ card }: CardItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const deleteCard = useCardsStore(state => state.deleteCard);
  const isCardModalOpen = useBoardStore(state => state.isCardModalOpen);

  // Refs for tracking drag vs click
  const dragTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const clickAllowedRef = useRef(true);

  // Constants for drag detection
  const DRAG_THRESHOLD_PX = 5; // Minimum pixels moved to consider it a drag
  const DRAG_TIMEOUT_MS = 300; // Longer timeout to better detect intentional clicks

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current !== null) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    };
  }, []);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: card.id,
    data: {
      type: 'card',
      card
    },
    disabled: isCardModalOpen // Disable dragging when a card modal is open
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'all 250ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 'auto',
    // Add a subtle visual indication when drag is disabled
    cursor: isCardModalOpen ? 'default' : 'grab'
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent drag events
    e.stopPropagation();
    e.preventDefault();
    // We don't need to modify attributes directly, as we're handling the delete action separately
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteCard(card.id);
    setShowDeleteConfirm(false);
  };

  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    // If we're dragging, don't open the modal
    if (isDraggingRef.current) {
      return;
    }

    // Stop propagation to prevent other events
    e.stopPropagation();

    // Prevent default to avoid any browser-specific behaviors
    e.preventDefault();

    // Open the detail modal
    setShowDetailModal(true);
  };

  // Track touch events for mobile devices
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      setIsTouchDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If moved more than threshold, consider it a drag
      if (distance > DRAG_THRESHOLD_PX) {
        setIsTouchDragging(true);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouchDragging) {
      // This was a tap, not a drag
      handleCardClick(e);
    }

    // Reset state
    setIsTouchDragging(false);
  };

  // Modify the listeners to detect drag vs click
  const modifiedListeners = {
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      // Store the initial mouse position
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };

      // Reset flags
      isDraggingRef.current = false;
      clickAllowedRef.current = true;

      // Call the original onMouseDown handler
      if (listeners.onMouseDown) {
        listeners.onMouseDown(e);
      }

      // Set a timeout to detect if this is a drag or a click
      // This is a fallback - we'll primarily use distance moved
      dragTimeoutRef.current = window.setTimeout(() => {
        isDraggingRef.current = true;
      }, DRAG_TIMEOUT_MS);
    },
    onMouseMove: (e: React.MouseEvent) => {
      // If we're already dragging or click isn't allowed, just call the original handler
      if (isDraggingRef.current || !clickAllowedRef.current) {
        if (listeners.onMouseMove) {
          listeners.onMouseMove(e);
        }
        return;
      }

      // Calculate distance moved
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If moved more than threshold, consider it a drag
      if (distance > DRAG_THRESHOLD_PX) {
        isDraggingRef.current = true;
        clickAllowedRef.current = false;

        // Clear the timeout since we've determined it's a drag
        if (dragTimeoutRef.current !== null) {
          clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
        }
      }

      // Call the original onMouseMove handler
      if (listeners.onMouseMove) {
        listeners.onMouseMove(e);
      }
    },
    onMouseUp: (e: React.MouseEvent) => {
      // Call the original onMouseUp handler
      if (listeners.onMouseUp) {
        listeners.onMouseUp(e);
      }

      // Clear the timeout
      if (dragTimeoutRef.current !== null) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }

      // Calculate final distance moved
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If we haven't moved much and we're not dragging, this is a click
      if (distance <= DRAG_THRESHOLD_PX && !isDraggingRef.current && clickAllowedRef.current) {
        // Small delay to ensure we don't interfere with any drag operations
        setTimeout(() => {
          handleCardClick(e);
        }, 10);
      }

      // Reset flags
      isDraggingRef.current = false;
      clickAllowedRef.current = true;
    }
  };

  return (
    <>
      <div className="relative group">
        {/* Delete button outside the draggable area */}
        <div
          className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="danger"
            className="!px-1.5 !py-0.5 !text-xs !rounded-full !min-w-6 !min-h-6 !flex !items-center !justify-center !shadow-md hover:!shadow-lg"
            onClick={handleDeleteClick}
            title={`Delete card ${card.title}`}
          >
            ✕
          </Button>
        </div>

        {/* Draggable card content */}
        <div
          ref={setNodeRef}
          style={style}
          {...(isCardModalOpen ? {} : modifiedListeners)} // Only apply listeners if drag is enabled
          {...attributes}
          className={`rounded-2xl bg-white p-4 shadow-card hover:shadow-card-hover border border-blue-100
            hover:bg-gradient-to-br hover:from-white hover:to-blue-50
            transition-all duration-300 ease-in-out card-enter animate-scale-in
            ${isDragging ? 'opacity-60 rotate-1 scale-105' : 'opacity-100'}
            ${isCardModalOpen ? 'cursor-default' : 'cursor-grab'}`}
          onClick={(e) => {
            // If we're not dragging, handle the click
            // This is a backup click handler in case the mouse events don't trigger properly
            if (!isDraggingRef.current && clickAllowedRef.current) {
              handleCardClick(e);
            }
          }}
          onTouchStart={isCardModalOpen ? undefined : handleTouchStart}
          onTouchMove={isCardModalOpen ? undefined : handleTouchMove}
          onTouchEnd={isCardModalOpen ? undefined : handleTouchEnd}
        >
          <p className="text-sm font-medium text-blue-800 break-words pr-6 leading-snug">{card.title}</p>
          {card.description && (
            <div className="mt-2 text-xs text-blue-600 flex items-center">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full mr-2">
                <span className="text-blue-600">📝</span>
              </span>
              <span>Есть описание</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Удалить карточку"
        message={`Вы уверены, что хотите удалить карточку "${card.title}"?`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Card detail modal */}
      <CardDetailModal
        card={card}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </>
  );
}