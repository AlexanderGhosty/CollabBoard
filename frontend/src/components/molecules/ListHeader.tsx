import { useState } from 'react';
import { List } from '@/services/boardService';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  list: List;
  onAddCard: () => void;
}

export default function ListHeader({ list, onAddCard }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteList = useBoardStore(state => state.deleteList);

  const handleAddCard = () => {
    console.log(`Add card button clicked for list:`, list);
    onAddCard();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    deleteList(list.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <header className="mb-2 flex items-center justify-between gap-1 px-2">
        <h3 className="font-semibold text-zinc-800">{list.title}</h3>
        <div className="flex gap-1">
          <Button
            variant="danger"
            className="!px-2 !py-1"
            onClick={handleDeleteClick}
            title={`Delete list ${list.title}`}
          >
            ✕
          </Button>
          <Button
            variant="secondary"
            className="!px-2 !py-1"
            onClick={handleAddCard}
            title={`Add card to list ${list.id}`}
          >
            ＋
          </Button>
        </div>
      </header>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Удалить список"
        message={`Вы уверены, что хотите удалить список "${list.title}" и все его карточки?`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}