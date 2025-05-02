// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage   from '@/components/pages/LoginPage';
import BoardsPage  from '@/components/pages/BoardsPage';
import BoardPage   from '@/components/pages/BoardPage';
import { useAuthStore } from '@/store/useAuthStore';

function Protected({ children }: { children: JSX.Element }) {
  const isAuth = !!useAuthStore(state => state.token);
  return isAuth ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><BoardsPage /></Protected>} />
        <Route path="/board/:id" element={<Protected><BoardPage /></Protected>} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
