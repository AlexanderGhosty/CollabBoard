import { useNavigate as useReactRouterNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook that provides a navigate function that works both inside and outside of React components
 * 
 * When called inside a component, it uses React Router's navigate
 * When imported directly, it returns a function that uses window.location
 */
const useNavigateAndReload = () => {
  // Get the navigate function from React Router if we're in a component
  const reactNavigate = useReactRouterNavigate();
  
  // Create a wrapper function that can be used both in components and outside
  const navigate = useCallback((path: string) => {
    // Use React Router's navigate if available
    if (reactNavigate) {
      reactNavigate(path);
    } else {
      // Fallback to window.location if not in a component context
      window.location.href = path;
    }
  }, [reactNavigate]);
  
  return navigate;
};

// For use outside of React components
let navigateFunction: ((path: string) => void) | null = null;

// Default export for use in components
export default useNavigateAndReload;

// Export a singleton function for use outside of components
export const navigateTo = (path: string) => {
  if (!navigateFunction) {
    // If we're not in a component context, use window.location
    window.location.href = path;
  } else {
    // Use the stored navigate function
    navigateFunction(path);
  }
};

// Function to store the navigate function for use outside of components
export const setNavigateFunction = (navigate: (path: string) => void) => {
  navigateFunction = navigate;
};
