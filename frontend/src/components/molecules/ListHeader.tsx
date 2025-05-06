import { List } from '@/services/boardService';
import Button from '@/components/atoms/Button';

interface Props {
  list: List;
  onAddCard: () => void;
}

export default function ListHeader({ list, onAddCard }: Props) {
  return (
    <header className="mb-2 flex items-center justify-between gap-1 px-2">
      <h3 className="font-semibold text-zinc-800">{list.title}</h3>
      <Button variant="secondary" className="!px-2 !py-1" onClick={onAddCard}>＋</Button>
    </header>
  );
}