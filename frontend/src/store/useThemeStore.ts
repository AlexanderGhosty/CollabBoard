import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  updateSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      systemTheme: 'light',

      setTheme: (theme: Theme) => {
        set({ theme });
        applyTheme(theme, get().systemTheme);
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        applyTheme(newTheme, get().systemTheme);
      },

      updateSystemTheme: () => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const newSystemTheme = prefersDark ? 'dark' : 'light';
        set({ systemTheme: newSystemTheme });

        // Only apply if theme is set to 'system'
        if (get().theme === 'system') {
          applyTheme('system', newSystemTheme);
        }
      },
    }),
    {
      name: 'collabboard-theme',
    }
  )
);

// Helper function to apply theme to document
export function applyTheme(theme: Theme, systemTheme: 'light' | 'dark'): void {
  const root = window.document.documentElement;

  // Remove both classes first
  root.classList.remove('light', 'dark');

  // Apply the appropriate class
  if (theme === 'system') {
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

// Initialize theme based on system preference
export function initializeTheme(): void {
  const themeStore = useThemeStore.getState();
  themeStore.updateSystemTheme();

  // Set up listener for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // Initial application
  applyTheme(themeStore.theme, themeStore.systemTheme);

  // Listen for changes in system preference
  mediaQuery.addEventListener('change', () => {
    themeStore.updateSystemTheme();
  });

  // Set up a subscription to theme changes to update CSS variables
  useThemeStore.subscribe((state) => {
    updateCssVariables(state.theme === 'system' ? state.systemTheme : state.theme);
  });

  // Initial update of CSS variables
  updateCssVariables(themeStore.theme === 'system' ? themeStore.systemTheme : themeStore.theme);
}

// Helper function to update CSS variables for components that need them
function updateCssVariables(theme: 'light' | 'dark'): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    // List variables
    root.style.setProperty('--list-bg', 'rgba(30, 41, 59, 0.95)'); // dark-blue-50 with opacity
    root.style.setProperty('--list-hover-bg', 'rgba(30, 58, 138, 0.3)'); // blue-900 with opacity
    root.style.setProperty('--list-hover-shadow', '0 4px 12px rgba(30, 58, 138, 0.25)');
  } else {
    // List variables
    root.style.setProperty('--list-bg', 'rgba(255, 255, 255, 0.95)');
    root.style.setProperty('--list-hover-bg', 'rgba(219, 234, 254, 0.5)');
    root.style.setProperty('--list-hover-shadow', '0 4px 12px rgba(37, 99, 235, 0.15)');
  }
}
