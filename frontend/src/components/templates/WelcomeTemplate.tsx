import React from 'react';
import Logo from '@/components/atoms/Logo';
import ThemeToggle from '@/components/atoms/ThemeToggle';

interface WelcomeTemplateProps {
  children: React.ReactNode;
}

export default function WelcomeTemplate({ children }: WelcomeTemplateProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-dark-blue-300 dark:to-dark-blue-100 transition-colors duration-300">
      {/* Header with logo */}
      <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo
              size="lg"
              className=""
            />
            <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">CollabBoard</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">{children}</div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
          <p>© {new Date().getFullYear()} CollabBoard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
