import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from '@/components/pages/LoginPage';
import RegisterPage from '@/components/pages/RegisterPage';

const loginMock = vi.fn();
const registerMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: vi.fn(() => ({
    login: loginMock,
    register: registerMock,
  })),
}));

vi.mock('@/store/useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    error: toastErrorMock,
  })),
}));

const themeState = {
  theme: 'light' as const,
  systemTheme: 'light' as const,
  toggleTheme: vi.fn(),
  setTheme: vi.fn(),
  updateSystemTheme: vi.fn(),
};

vi.mock('@/store/useThemeStore', () => {
  const useThemeStore = vi.fn((selector?: (state: typeof themeState) => unknown) =>
    selector ? selector(themeState) : themeState,
  );
  Object.assign(useThemeStore, {
    getState: () => themeState,
  });

  return { useThemeStore };
});

describe('Authentication smoke tests', () => {
  beforeEach(() => {
    loginMock.mockResolvedValue(undefined);
    registerMock.mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it('submits login credentials with entered values', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('E‑mail'), 'user@example.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(loginMock).toHaveBeenCalledWith('user@example.com', 'secret123');
  });

  it('submits registration data with name, email and password', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('Имя'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('E‑mail'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Пароль'), 'super-secret');
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));

    expect(registerMock).toHaveBeenCalledWith('Jane Doe', 'jane@example.com', 'super-secret');
  });
});
