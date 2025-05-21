import React from 'react';

interface WelcomeTemplateProps {
  children: React.ReactNode;
}

export default function WelcomeTemplate({ children }: WelcomeTemplateProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with logo */}
      <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-center items-center gap-3">
          <img
            src="/logo.svg"
            alt="CollabBoard Logo"
            className="h-10 w-10"
          />
          <h1 className="text-3xl font-bold text-blue-600">CollabBoard</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">{children}</div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} CollabBoard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
