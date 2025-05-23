import { Link } from 'react-router-dom';

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-0">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg mx-4">
        {children}

        <div className="mt-6 text-center">
          <Link to="/welcome" className="text-sm text-blue-600 hover:text-blue-800">
            ← Назад на стартовую страницу
          </Link>
        </div>
      </div>
    </div>
  );
}