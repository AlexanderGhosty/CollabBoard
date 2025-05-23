import { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import ThemeToggle from '@/components/atoms/ThemeToggle';
import Logo from '@/components/atoms/Logo';
import { useAuthStore } from '@/store/useAuthStore';
import { wsClient } from '@/services/websocket';
import { useToastStore } from '@/store/useToastStore';

export default function Header() {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const addToast = useToastStore(state => state.success);

  const handleLogout = useCallback(() => {
    // Close any active WebSocket connections
    if (wsClient) {
      wsClient.disconnect();
    }

    // Clear authentication data
    logout();

    // Show success message
    addToast('Вы успешно вышли из учетной записи', 3000);

    // Redirect to login page
    navigate('/login');
  }, [logout, navigate, addToast]);

  return (
    <header className="w-full py-3 px-4 bg-white dark:bg-dark-blue-300 shadow-sm dark:shadow-dark-card mb-4 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link
          to="/"
          className="flex items-center gap-2 transition-all duration-200 hover:opacity-80 hover:scale-[1.02] group"
          title="Go to Home Page"
        >
          <Logo
            size="md"
            className="transition-transform duration-200 group-hover:rotate-[-5deg]"
          />
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-200 group-hover:text-blue-700 dark:group-hover:text-blue-300">CollabBoard</h1>
        </Link>

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <ThemeToggle className="mr-2" />

          {user && (
            <>
              <Link
                to="/account"
                className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 transition-colors duration-200"
                title="Account Settings"
              >
                {user.name}
              </Link>
            </>
          )}
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="!px-3 !py-1"
            title="Log out"
          >
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
}
