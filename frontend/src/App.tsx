// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import WelcomePage   from '@/components/pages/WelcomePage';
import LoginPage     from '@/components/pages/LoginPage';
import RegisterPage  from '@/components/pages/RegisterPage';
import BoardsPage    from '@/components/pages/BoardsPage';
import BoardPage     from '@/components/pages/BoardPage';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import Toast, { ToastContainer } from '@/components/atoms/Toast';
import './App.css';

// Error boundary component to catch errors in child components
class ErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-zinc-600 mb-4">Please try refreshing the page</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function Protected({ children }: { children: JSX.Element }) {
  const isAuth = !!useAuthStore((s) => s.token);
  return isAuth ? children : <Navigate to="/welcome" replace />;
}

export default function App() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  return (
    <BrowserRouter>
      {/* Toast container */}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </ToastContainer>

      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <ErrorBoundary>
                <BoardsPage />
              </ErrorBoundary>
            </Protected>
          }
        />
        <Route
          path="/board/:id"
          element={
            <Protected>
              <ErrorBoundary>
                <BoardPage />
              </ErrorBoundary>
            </Protected>
          }
        />
        {/* Redirect unauthenticated users to welcome page */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
