export default function AuthTemplate({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          {children}
        </div>
      </div>
    );
  }