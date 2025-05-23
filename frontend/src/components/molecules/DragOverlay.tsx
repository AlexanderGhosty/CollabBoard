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
  // State to track window width for responsive sizing
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Update window width and dark mode on changes
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    const handleThemeChange = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Set up observers
    window.addEventListener('resize', handleResize);
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Responsive width calculation
  const getResponsiveWidth = () => {
    if (windowWidth < 640) return '85%'; // Mobile
    if (windowWidth < 768) return '280px'; // Small tablet
    return '288px'; // Desktop
  };

  // Style for the dragged list
  const style: CSSProperties = {
    width: getResponsiveWidth(),
    transform: 'rotate(3deg) scale(1.02)', // Enhanced rotation and slight scale for visual feedback
    boxShadow: isDarkMode
      ? '0 12px 20px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
      : '0 12px 20px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    background: isDarkMode
      ? 'linear-gradient(to bottom right, #1e293b, #1e1e3a)' // dark-blue-50 to dark-blue-100
      : 'linear-gradient(to bottom right, #ffffff, #f0f9ff)', // white to blue-50
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
        className="rounded-2xl p-4 cursor-grabbing z-50 dnd-dragging-animation border border-blue-100 dark:border-dark-blue-100 transition-colors duration-300"
      >
        <div className="font-semibold text-blue-800 dark:text-blue-300 px-2 mb-3 text-lg transition-colors duration-300">{list.title}</div>
        <div className="bg-blue-50/80 dark:bg-blue-900/50 rounded-xl p-3 text-center text-sm text-blue-600 dark:text-blue-300 font-medium border border-blue-100 dark:border-blue-800 transition-colors duration-300">
          {list.cards?.length || 0} карточек
        </div>
      </div>
    </DndKitDragOverlay>
  );
}

function CardDragOverlay({ card }: CardDragOverlayProps) {
  // State to track window width for responsive sizing
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  // Update window width and dark mode on changes
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    const handleThemeChange = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Set up observers
    window.addEventListener('resize', handleResize);
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Responsive width calculation with better mobile support
  const getResponsiveWidth = () => {
    if (windowWidth < 480) return '85%'; // Small mobile
    if (windowWidth < 640) return '90%'; // Mobile
    if (windowWidth < 768) return '260px'; // Small tablet
    return '272px'; // Desktop
  };

  // Style for the dragged card
  const style: CSSProperties = {
    width: getResponsiveWidth(),
    maxWidth: windowWidth < 640 ? '300px' : '272px', // Prevent cards from being too wide on mobile
    transform: 'rotate(3deg) scale(1.02)', // Enhanced rotation and slight scale
    boxShadow: isDarkMode
      ? '0 12px 20px -5px rgba(0, 0, 0, 0.3), 0 8px 12px -6px rgba(0, 0, 0, 0.2)'
      : '0 12px 20px -5px rgba(0, 0, 0, 0.15), 0 8px 12px -6px rgba(0, 0, 0, 0.1)',
    background: isDarkMode
      ? 'linear-gradient(to bottom right, #1e293b, #1e1e3a)' // dark-blue-50 to dark-blue-100
      : 'linear-gradient(to bottom right, #ffffff, #f8fafc)', // white to slate-50
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
        className="rounded-2xl p-4 cursor-grabbing z-50 dnd-dragging-animation w-auto border border-blue-100 dark:border-dark-blue-100 transition-colors duration-300"
      >
        <div className="w-full" style={{ maxWidth: windowWidth < 640 ? '100%' : '272px' }}>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 break-words pr-6 leading-snug transition-colors duration-300">{card.title}</p>
          {card.description && (
            <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 flex items-center transition-colors duration-300">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900/50 rounded-full mr-2 transition-colors duration-300">
                <span className="text-blue-600 dark:text-blue-400">📝</span>
              </span>
              <span>Есть описание</span>
            </div>
          )}
        </div>
      </div>
    </DndKitDragOverlay>
  );
}
