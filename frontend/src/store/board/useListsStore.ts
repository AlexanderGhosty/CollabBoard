import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { boardService, List } from '@/services/boardService';
import { useToastStore } from '@/store/useToastStore';
import { ListsState } from './types';
import { useBoardStore } from './useBoardStore';
import { sortLists, getNextListPosition } from '@/utils/board/sorting';

export const useListsStore = create<ListsState>()(
  immer((set, get) => ({
    // State
    lists: {},
    boardLists: {},
    loading: false,
    error: null,

    // Selectors
    getListsByBoardId(boardId) {
      const boardLists = get().boardLists[boardId] || [];
      return boardLists.map(listId => get().lists[listId]).filter(Boolean);
    },

    getSortedListsByBoardId(boardId) {
      const lists = get().getListsByBoardId(boardId);
      return sortLists(lists);
    },

    // Utility methods
    setLists(lists, boardId) {
      console.log(`Setting ${lists.length} lists for board ${boardId}`);

      set((s) => {
        // Clear existing lists for this board to prevent duplicates
        if (s.boardLists[boardId]) {
          const existingListIds = [...s.boardLists[boardId]];
          existingListIds.forEach(listId => {
            delete s.lists[listId];
          });
          s.boardLists[boardId] = [];
        }

        // Add the new lists
        if (lists && lists.length > 0) {
          lists.forEach(list => {
            if (!list.id) {
              console.error("List without ID:", list);
              return;
            }

            // Add to lists record
            s.lists[list.id] = list;

            // Add to boardLists relationship
            if (!s.boardLists[boardId]) {
              s.boardLists[boardId] = [];
            }

            if (!s.boardLists[boardId].includes(list.id)) {
              s.boardLists[boardId].push(list.id);
            }
          });
        }
      });

      console.log(`Successfully set ${lists.length} lists for board ${boardId}`);
    },

    // List operations
    async createList(boardId, title) {
      set((s) => { s.loading = true; s.error = null; });

      try {
        console.log(`Creating new list "${title}" for board ${boardId}`);

        // Calculate position for the new list (at the end)
        const lists = get().getListsByBoardId(boardId);
        const position = getNextListPosition(lists);
        console.log(`Calculated position for new list: ${position}`);

        // Create the list
        const list = await boardService.createList(boardId, title, position);
        console.log("List created successfully:", list);

        // Ensure the list has a valid ID
        if (!list.id) {
          console.error("Created list without ID:", list);
          return;
        }

        // Убедимся, что boardId в списке соответствует текущей доске
        if (list.boardId !== boardId) {
          console.log(`Correcting list.boardId from ${list.boardId} to ${boardId}`);
          list.boardId = boardId;
        }

        set((s) => {
          // Add to lists record
          s.lists[list.id] = list;

          // Add to boardLists relationship
          if (!s.boardLists[boardId]) {
            s.boardLists[boardId] = [];
          }

          // Check if list already exists in the relationship
          if (!s.boardLists[boardId].includes(list.id)) {
            s.boardLists[boardId].push(list.id);
          }

          s.loading = false;
        });

        console.log(`List ${list.id} added to store for board ${boardId}`);

        // Показать уведомление об успешном создании списка
        useToastStore.getState().success("Список создан");

        return list;
      } catch (error) {
        console.error(`Error creating list for board ${boardId}:`, error);

        set((s) => {
          s.loading = false;
          s.error = `Failed to create list: ${error}`;
        });

        // Show error toast
        useToastStore.getState().error("Не удалось создать список");
      }
    },

    async updateList(listId, title) {
      const list = get().lists[listId];

      if (!list) {
        console.error(`List with ID ${listId} not found`);
        return;
      }

      // Store original title for rollback
      const originalTitle = list.title;

      // Optimistic update
      set((s) => {
        if (s.lists[listId]) {
          s.lists[listId].title = title;
        }
      });

      try {
        // Call API to update the list
        const updatedList = await boardService.updateList(listId, title);
      } catch (error) {
        console.error(`Error updating list ${listId}:`, error);

        // Revert optimistic update
        set((s) => {
          if (s.lists[listId]) {
            s.lists[listId].title = originalTitle;
          }
        });

        // Show error toast
        useToastStore.getState().error("Не удалось обновить название списка");
        throw error;
      }
    },

    async moveList(listId, position) {
      const list = get().lists[listId];

      if (!list) {
        console.error(`List with ID ${listId} not found`);
        return;
      }

      const boardId = list.boardId;
      const lists = get().getListsByBoardId(boardId);

      // Store original lists state for rollback
      const originalLists = JSON.parse(JSON.stringify(lists));

      try {
        // Optimistic update
        set((s) => {
          const oldPosition = s.lists[listId].position;

          // Update the position of the moved list
          s.lists[listId].position = position;

          // Update positions of other lists in the same board
          lists.forEach(otherList => {
            if (otherList.id === listId) return;

            // If moving forward (e.g., from pos 2 to pos 4)
            if (oldPosition < position) {
              if (otherList.position > oldPosition && otherList.position <= position) {
                s.lists[otherList.id].position--;
              }
            }
            // If moving backward (e.g., from pos 4 to pos 2)
            else if (oldPosition > position) {
              if (otherList.position >= position && otherList.position < oldPosition) {
                s.lists[otherList.id].position++;
              }
            }
          });
        });

        // Call API to persist the change
        await boardService.moveList(listId, position);

        // Show success toast
        useToastStore.getState().success(`Список перемещен`);
      } catch (error) {
        console.error(`Error moving list ${listId}:`, error);

        // Revert optimistic update
        set((s) => {
          // Restore original positions
          originalLists.forEach(originalList => {
            if (s.lists[originalList.id]) {
              s.lists[originalList.id].position = originalList.position;
            }
          });
        });

        // Determine specific error message
        let errorMessage = "Не удалось переместить список. Пожалуйста, попробуйте снова.";

        if (error instanceof Error) {
          if (error.message.includes("not a member")) {
            errorMessage = "У вас нет прав для перемещения этого списка.";
          } else if (error.message.includes("position conflict")) {
            errorMessage = "Конфликт позиций. Порядок списков будет исправлен автоматически.";
          } else if (error.message.includes("network")) {
            errorMessage = "Ошибка сети. Пожалуйста, проверьте подключение и попробуйте снова.";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Превышено время ожидания. Сервер может быть занят, пожалуйста, попробуйте снова.";
          }
        }

        // Show error toast
        useToastStore.getState().error(errorMessage);
      }
    },

    async deleteList(listId) {
      const list = get().lists[listId];

      if (!list) {
        console.error(`List with ID ${listId} not found`);
        return;
      }

      const boardId = list.boardId;

      try {
        await boardService.deleteList(listId);

        set((s) => {
          // Remove from lists record
          delete s.lists[listId];

          // Remove from boardLists relationship
          if (s.boardLists[boardId]) {
            s.boardLists[boardId] = s.boardLists[boardId].filter(id => id !== listId);
          }

          // Normalize positions of remaining lists
          const remainingLists = get().getListsByBoardId(boardId);
          remainingLists.sort((a, b) => a.position - b.position);

          // Reassign positions to be sequential
          remainingLists.forEach((list, idx) => {
            const newPosition = idx + 1;
            if (s.lists[list.id] && s.lists[list.id].position !== newPosition) {
              s.lists[list.id].position = newPosition;
            }
          });
        });

        // Show success toast
        useToastStore.getState().success("Список успешно удален");
      } catch (error) {
        console.error(`Error deleting list ${listId}:`, error);

        // Show error toast
        useToastStore.getState().error("Не удалось удалить список");
      }
    }
  }))
);
