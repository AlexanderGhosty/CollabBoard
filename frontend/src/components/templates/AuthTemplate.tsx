import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/atoms/ThemeToggle';

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-dark-blue-300 dark:to-dark-blue-100 p-0 transition-colors duration-300 relative">
      {/* Theme toggle positioned in top-right corner */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-dark-blue-50 p-8 shadow-lg dark:shadow-dark-modal mx-4 transition-colors duration-300">
        {children}

        <div className="mt-6 text-center">
          <Link to="/welcome" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-300">
            ← Назад на стартовую страницу
          </Link>
        </div>
      </div>
    </div>
  );
}