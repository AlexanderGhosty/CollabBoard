import { useState, useCallback } from 'react';
import { List } from '@/services/boardService';
import Button from '@/components/atoms/Button';
import EditableText from '@/components/atoms/EditableText';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { useListsStore } from '@/store/board';

interface Props {
  list: List;
  onAddCard: () => void;
}

export default function ListHeader({ list, onAddCard }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use individual selectors for each store function to prevent infinite re-renders
  const deleteList = useListsStore(state => state.deleteList);
  const updateList = useListsStore(state => state.updateList);

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
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <EditableText
          value={list.title}
          onSave={handleTitleUpdate}
          className="flex-grow max-w-[70%]"
          textClassName="font-semibold text-blue-800 text-lg"
          inputClassName="font-semibold text-lg"
          placeholder="Enter list title"
          validateEmpty={true}
          emptyErrorMessage="List title cannot be empty"
        />
        <div className="flex gap-2">
          <Button
            variant="danger"
            className="!px-2 !py-1 !rounded-full !min-w-8 !min-h-8 !flex !items-center !justify-center hover:!shadow-md transition-all duration-200"
            onClick={handleDeleteClick}
            title={`Delete list ${list.title}`}
          >
            ✕
          </Button>
          <Button
            variant="secondary"
            className="!px-2 !py-1 !rounded-full !min-w-8 !min-h-8 !flex !items-center !justify-center hover:!shadow-md transition-all duration-200 hover:!bg-blue-100"
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