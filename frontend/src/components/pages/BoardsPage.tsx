import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/atoms/Button';
import { useBoardStore } from '@/store/useBoardStore';

export default function BoardsPage() {
  const store = useBoardStore();
  const { boards } = store;
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    store.fetchBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await store.createBoard(title.trim());
      setTitle('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-zinc-800">Ваши доски</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Название доски"
            className="w-60 rounded-2xl border border-zinc-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button onClick={handleCreate} loading={creating}>
            Создать
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {boards.map((b) => (
          <Link
            key={b.id}
            to={`/board/${b.id}`}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow transition-colors hover:bg-zinc-50"
          >
            <h2 className="text-xl font-semibold text-zinc-800">{b.title}</h2>
          </Link>
        ))}
      </section>
    </main>
  );
}