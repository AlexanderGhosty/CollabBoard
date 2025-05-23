import { useCallback } from 'react';
import { useThemeStore } from '@/store/useThemeStore';
import clsx from 'clsx';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useThemeStore(state => state.theme);
  const systemTheme = useThemeStore(state => state.systemTheme);
  const toggleTheme = useThemeStore(state => state.toggleTheme);
  const setTheme = useThemeStore(state => state.setTheme);
  
  // Determine the current effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  
  const handleToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);
  
  return (
    <button
      onClick={handleToggle}
      className={clsx(
        'relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2',
        effectiveTheme === 'dark' 
          ? 'bg-blue-800 border-blue-700' 
          : 'bg-blue-100 border-blue-200',
        className
      )}
      title={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${effectiveTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span
        className={clsx(
          'absolute top-1 left-1 w-4 h-4 rounded-full transform transition-transform duration-300',
          effectiveTheme === 'dark' 
            ? 'translate-x-6 bg-indigo-200' 
            : 'translate-x-0 bg-blue-600'
        )}
      />
      
      {/* Sun icon */}
      <span 
        className={clsx(
          'absolute top-1 left-1 w-4 h-4 flex items-center justify-center text-[10px] transition-opacity duration-300',
          effectiveTheme === 'dark' ? 'opacity-0' : 'opacity-100 text-white'
        )}
        aria-hidden="true"
      >
        ☀️
      </span>
      
      {/* Moon icon */}
      <span 
        className={clsx(
          'absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[10px] transition-opacity duration-300',
          effectiveTheme === 'dark' ? 'opacity-100 text-blue-900' : 'opacity-0'
        )}
        aria-hidden="true"
      >
        🌙
      </span>
    </button>
  );
}
