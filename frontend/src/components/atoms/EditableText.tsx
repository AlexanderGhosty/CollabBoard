import { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from 'react';
import clsx from 'clsx';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void> | void;
  className?: string;
  placeholder?: string;
  textClassName?: string;
  inputClassName?: string;
  validateEmpty?: boolean;
  emptyErrorMessage?: string;
}

export default function EditableText({
  value,
  onSave,
  className = '',
  placeholder = 'Click to edit',
  textClassName = '',
  inputClassName = '',
  validateEmpty = true,
  emptyErrorMessage = 'Value cannot be empty'
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
    if (error) setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Only save on blur if there are no errors and the value has changed
    if (!error && editValue !== value) {
      handleSave();
    } else if (error) {
      cancelEdit();
    }
  };

  const cancelEdit = () => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    // Validate
    if (validateEmpty && !editValue.trim()) {
      setError(emptyErrorMessage);
      return;
    }

    // Don't save if value hasn't changed
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(editValue.trim());
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error saving value:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={clsx('relative', className)}>
      {isEditing ? (
        <div>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={isLoading}
            className={clsx(
              'w-full rounded border px-2 py-1 outline-none focus:ring-2 transition-colors duration-300',
              error
                ? 'border-red-400 dark:border-red-500 focus:ring-red-300 dark:focus:ring-red-600 bg-white dark:bg-dark-blue-50'
                : 'border-zinc-300 dark:border-dark-blue-200 focus:ring-blue-300 dark:focus:ring-blue-700 bg-white dark:bg-dark-blue-50',
              inputClassName
            )}
          />
          {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400 transition-colors duration-300">{error}</p>}
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={clsx(
            'cursor-pointer rounded px-2 py-1 hover:bg-zinc-200 dark:hover:bg-dark-blue-100 transition-colors duration-300',
            textClassName
          )}
        >
          {value || <span className="text-zinc-400 dark:text-blue-500">{placeholder}</span>}
        </div>
      )}
    </div>
  );
}
