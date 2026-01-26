import { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardNavigationProps {
  items: HTMLElement[];
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
  loop?: boolean;
  initialIndex?: number;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onEscape,
  enabled = true,
  loop = true,
  initialIndex = -1,
}: UseKeyboardNavigationProps) {
  const currentIndexRef = useRef(initialIndex);
  const itemsRef = useRef<HTMLElement[]>([]);

  // Update items reference
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const setActiveIndex = useCallback((index: number) => {
    const validIndex = Math.max(-1, Math.min(index, itemsRef.current.length - 1));
    currentIndexRef.current = validIndex;

    // Remove previous active states
    itemsRef.current.forEach((item, i) => {
      if (i === validIndex) {
        item.setAttribute('data-keyboard-active', 'true');
        item.focus();
      } else {
        item.removeAttribute('data-keyboard-active');
      }
    });
  }, []);

  const moveNext = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= itemsRef.current.length) {
      setActiveIndex(loop ? 0 : itemsRef.current.length - 1);
    } else {
      setActiveIndex(nextIndex);
    }
  }, [loop, setActiveIndex]);

  const movePrevious = useCallback(() => {
    const prevIndex = currentIndexRef.current - 1;
    if (prevIndex < 0) {
      setActiveIndex(loop ? itemsRef.current.length - 1 : 0);
    } else {
      setActiveIndex(prevIndex);
    }
  }, [loop, setActiveIndex]);

  const selectCurrent = useCallback(() => {
    if (currentIndexRef.current >= 0 && onSelect) {
      onSelect(currentIndexRef.current);
    }
  }, [onSelect]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || itemsRef.current.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        movePrevious();
        break;
      case 'Enter':
        event.preventDefault();
        selectCurrent();
        break;
      case 'Escape':
        event.preventDefault();
        if (onEscape) {
          onEscape();
        }
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(itemsRef.current.length - 1);
        break;
    }
  }, [enabled, moveNext, movePrevious, selectCurrent, onEscape, setActiveIndex]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    currentIndex: currentIndexRef.current,
    setActiveIndex,
    moveNext,
    movePrevious,
    selectCurrent,
  };
}