import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/atoms/Button';
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
    addToast('You have been successfully logged out', 3000);
    
    // Redirect to login page
    navigate('/login');
  }, [logout, navigate, addToast]);

  return (
    <header className="w-full py-3 px-4 bg-white shadow-sm mb-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">CollabBoard</h1>
        
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-blue-800">
              {user.name}
            </span>
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
