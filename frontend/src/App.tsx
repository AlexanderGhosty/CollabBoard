// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage     from '@/components/pages/LoginPage';
import RegisterPage  from '@/components/pages/RegisterPage';   // NEW
import BoardsPage    from '@/components/pages/BoardsPage';
import BoardPage     from '@/components/pages/BoardPage';
import { useAuthStore } from '@/store/useAuthStore';

function Protected({ children }: { children: JSX.Element }) {
  const isAuth = !!useAuthStore((s) => s.token);
  return isAuth ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />   {/* NEW */}
        <Route
          path="/"
          element={
            <Protected>
              <BoardsPage />
            </Protected>
          }
        />
        <Route
          path="/board/:id"
          element={
            <Protected>
              <BoardPage />
            </Protected>
          }
        />
        {/* fallback → на главную или логин */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
