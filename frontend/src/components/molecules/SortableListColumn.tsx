import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { List } from '@/services/boardService';
import ListColumn from '@/components/organisms/ListColumn';
import { useBoardStore } from '@/store/board';

interface Props {
  list: List;
}

export default function SortableListColumn({ list }: Props) {
  // Check if a card modal is open
  const isCardModalOpen = useBoardStore(state => state.isCardModalOpen);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: list.id,
    data: {
      type: 'list',
      list
    },
    disabled: isCardModalOpen // Disable sortable when a card modal is open
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.4 : 1,
    // Add a subtle visual indication when drag is disabled
    cursor: isCardModalOpen ? 'default' : 'grab'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isCardModalOpen ? {} : listeners)} // Only apply listeners if drag is enabled
      className="touch-manipulation"
    >
      <ListColumn list={list} />
    </div>
  );
}
