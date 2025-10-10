import { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

type DragData = {
  type: 'card' | 'list';
  card?: typeof cardOne;
  list?: typeof listOne;
};

type MockDragEvent = {
  active: { id: string; data: { current: DragData | null } };
  over: { id: string; data: { current: DragData | null } } | null;
};

const dndHandlers: {
  onDragEnd?: (event: MockDragEvent) => void;
  onDragStart?: (event: MockDragEvent) => void;
} = {};

const listOne = { id: 'list-1', title: 'Бэклог', position: 1, boardId: 'board-1' };
const listTwo = { id: 'list-2', title: 'В работе', position: 2, boardId: 'board-1' };
const cardOne = { id: 'card-1', title: 'Настроить сборку', description: '', listId: 'list-1', position: 1 };

const createBoardState = () => ({
  activeBoard: 'board-1',
  boards: {
    'board-1': { id: 'board-1', name: 'Основная доска' },
  },
  isCardModalOpen: false,
});

const createListsState = () => ({
  lists: {
    'list-1': listOne,
    'list-2': listTwo,
  },
  boardLists: {
    'board-1': ['list-1', 'list-2'],
  },
  moveList: vi.fn(),
  createList: vi.fn(),
  getListsByBoardId: vi.fn(() => [listOne, listTwo]),
  getSortedListsByBoardId: vi.fn(() => [listOne, listTwo]),
});

const createCardsState = () => ({
  cards: {
    'card-1': cardOne,
  },
  listCards: {
    'list-1': ['card-1'],
    'list-2': [] as string[],
  },
  moveCard: vi.fn(),
  getCardsByListId: vi.fn((listId: string) => (listId === 'list-1' ? [cardOne] : [])),
  getSortedCardsByListId: vi.fn((listId: string) => (listId === 'list-1' ? [cardOne] : [])),
});

const boardState = createBoardState();
const listsState = createListsState();
const cardsState = createCardsState();

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
    onDragStart,
  }: {
    children: ReactNode;
    onDragEnd?: (event: MockDragEvent) => void;
    onDragStart?: (event: MockDragEvent) => void;
  }) => {
    dndHandlers.onDragEnd = onDragEnd;
    dndHandlers.onDragStart = onDragStart;
    return <div data-testid="dnd-context">{children}</div>;
  },
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(() => []),
  rectIntersection: vi.fn(() => []),
  DragOverlay: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-drag-overlay">{children}</div>
  ),
  useDroppable: vi.fn(() => ({
    isOver: false,
    setNodeRef: vi.fn(),
  })),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  horizontalListSortingStrategy: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@/services/websocket', () => ({
  subscribeWS: vi.fn(() => vi.fn()),
}));

vi.mock('@/store/board', () => {
  const useBoardStore = vi.fn((selector?: (state: typeof boardState) => unknown) =>
    selector ? selector(boardState) : boardState,
  );
  Object.assign(useBoardStore, {
    getState: () => boardState,
  });

  const useListsStore = vi.fn((selector?: (state: typeof listsState) => unknown) =>
    selector ? selector(listsState) : listsState,
  );
  Object.assign(useListsStore, {
    getState: () => listsState,
  });

  const useCardsStore = vi.fn((selector?: (state: typeof cardsState) => unknown) =>
    selector ? selector(cardsState) : cardsState,
  );
  Object.assign(useCardsStore, {
    getState: () => cardsState,
  });

  return { useBoardStore, useListsStore, useCardsStore };
});

import BoardTemplate from '@/components/templates/BoardTemplate';

describe('Board drag-and-drop smoke tests', () => {
  beforeEach(() => {
    Object.assign(boardState, createBoardState());
    Object.assign(listsState, createListsState());
    Object.assign(cardsState, createCardsState());
    dndHandlers.onDragEnd = undefined;
    dndHandlers.onDragStart = undefined;
    vi.clearAllMocks();
  });

  it('invokes store move handlers when cards and lists are dropped', async () => {
    render(<BoardTemplate />);

    expect(await screen.findByTestId('dnd-context')).toBeInTheDocument();

    await act(async () => {
      dndHandlers.onDragEnd?.({
        active: { id: 'card-1', data: { current: { type: 'card', card: cardOne } } },
        over: { id: 'list-2', data: { current: { type: 'list', list: listTwo } } },
      });
    });

    expect(cardsState.moveCard).toHaveBeenCalledWith('card-1', 'list-2', 1);

    await act(async () => {
      dndHandlers.onDragEnd?.({
        active: { id: 'list-1', data: { current: { type: 'list', list: listOne } } },
        over: { id: 'list-2', data: { current: { type: 'list', list: listTwo } } },
      });
    });

    expect(listsState.moveList).toHaveBeenCalledWith('list-1', 2);
  });
});
