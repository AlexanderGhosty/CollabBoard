import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import BoardsPage from '@/components/pages/BoardsPage';

type BoardState = {
  fetchBoardsByRole: ReturnType<typeof vi.fn>;
  createBoard: ReturnType<typeof vi.fn>;
  deleteBoard: ReturnType<typeof vi.fn>;
  boards: Record<string, { id: string; name: string; role?: 'owner' | 'member' }>;
  ownedBoardIds: string[];
  memberBoardIds: string[];
};

const createBoardStore = (): BoardState => ({
  fetchBoardsByRole: vi.fn().mockResolvedValue(undefined),
  createBoard: vi.fn().mockResolvedValue(undefined),
  deleteBoard: vi.fn().mockResolvedValue(undefined),
  boards: {
    '1': { id: '1', name: 'Проект А', role: 'owner' },
    '2': { id: '2', name: 'Совместный проект', role: 'member' },
  },
  ownedBoardIds: ['1'],
  memberBoardIds: ['2'],
});

const unsubscribe = vi.fn();

vi.mock('@/services/websocket', () => ({
  subscribeWS: vi.fn(() => unsubscribe),
}));

const boardState = createBoardStore();

vi.mock('@/store/board', () => {
  const useBoardStore = vi.fn((selector?: (state: BoardState) => unknown) =>
    selector ? selector(boardState) : boardState,
  );
  Object.assign(useBoardStore, {
    getState: () => boardState,
  });

  return { useBoardStore };
});

describe('Boards page smoke tests', () => {
  beforeEach(() => {
    Object.assign(boardState, createBoardStore());
    vi.clearAllMocks();
  });

  it('loads boards, creates a new board and deletes an existing one', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <BoardsPage />
      </MemoryRouter>,
    );

    expect(boardState.fetchBoardsByRole).toHaveBeenCalled();

    const input = await screen.findByPlaceholderText('Название доски');

    await user.type(input, ' Новая доска ');
    await user.click(screen.getByRole('button', { name: 'Создать' }));

    expect(boardState.createBoard).toHaveBeenCalledWith('Новая доска');

    const deleteButton = await screen.findByTitle('Удалить доску Проект А');
    await user.click(deleteButton);

    const confirmButton = (await screen.findAllByRole('button', { name: /Удалить/ })).pop();
    expect(confirmButton).toBeDefined();
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(boardState.deleteBoard).toHaveBeenCalledWith('1');
    });
  });
});
