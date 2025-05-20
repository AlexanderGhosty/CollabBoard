import { useState, useCallback } from 'react';
import { List } from '@/services/boardService';
import Button from '@/components/atoms/Button';
import EditableText from '@/components/atoms/EditableText';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useBoardStore } from '@/store/useBoardStore';

interface Props {
  list: List;
  onAddCard: () => void;
}

export default function ListHeader({ list, onAddCard }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use individual selectors for each store function to prevent infinite re-renders
  const deleteList = useBoardStore(state => state.deleteList);
  const updateList = useBoardStore(state => state.updateList);

  const handleAddCard = () => {
    console.log(`Add card button clicked for list:`, list);
    onAddCard();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = useCallback(() => {
    deleteList(list.id);
    setShowDeleteConfirm(false);
  }, [deleteList, list.id, setShowDeleteConfirm]);

  // Memoize the handler to prevent unnecessary re-renders
  const handleTitleUpdate = useCallback(async (newTitle: string) => {
    try {
      await updateList(list.id, newTitle);
    } catch (error) {
      console.error('Failed to update list title:', error);
      throw new Error('Failed to update list title');
    }
  }, [list.id, updateList]);

  return (
    <>
      <header className="mb-2 flex items-center justify-between gap-1 px-2">
        <EditableText
          value={list.title}
          onSave={handleTitleUpdate}
          className="flex-grow max-w-[70%]"
          textClassName="font-semibold text-zinc-800"
          inputClassName="font-semibold"
          placeholder="Enter list title"
          validateEmpty={true}
          emptyErrorMessage="List title cannot be empty"
        />
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