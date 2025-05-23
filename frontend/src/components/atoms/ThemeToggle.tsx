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

  // Determine the current effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  // Determine what theme we'll switch TO (opposite of current)
  const nextTheme = effectiveTheme === 'light' ? 'dark' : 'light';

  const handleToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <button
      onClick={handleToggle}
      className={clsx(
        'relative w-10 h-10 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 hover:scale-105 active:scale-95',
        effectiveTheme === 'dark'
          ? 'bg-dark-blue-100 hover:bg-dark-blue-50 border border-blue-700'
          : 'bg-blue-50 hover:bg-blue-100 border border-blue-200',
        className
      )}
      title={`Switch to ${nextTheme} mode`}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {/* Icon shows what theme we'll switch TO */}
      <span
        className={clsx(
          'absolute inset-0 flex items-center justify-center text-lg transition-all duration-300',
          effectiveTheme === 'light'
            ? 'text-blue-600 hover:text-blue-700' // Show moon (switch to dark)
            : 'text-blue-300 hover:text-blue-200' // Show sun (switch to light)
        )}
        aria-hidden="true"
      >
        {effectiveTheme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
