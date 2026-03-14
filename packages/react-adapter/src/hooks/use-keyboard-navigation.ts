import { useEffect, useCallback, type RefObject } from 'react';

export interface UseKeyboardNavigationOptions {
  /** Container ref for the PDF viewer */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Total number of pages */
  pageCount: number;
  /** Navigate to a specific page */
  goToPage: (page: number) => void;
  /** Current page number */
  currentPage: number;
  /** Undo callback */
  onUndo?: () => void;
  /** Redo callback */
  onRedo?: () => void;
  /** Scale change callback */
  onScaleChange?: (delta: number) => void;
  /** Whether navigation is enabled */
  enabled?: boolean;
}

export interface UseKeyboardNavigationReturn {
  /** Handle keyboard events — attach to a container's onKeyDown */
  handleKeyDown: (e: React.KeyboardEvent | KeyboardEvent) => void;
}

/**
 * Keyboard navigation hook for PDF viewer.
 *
 * Supports:
 * - Arrow Up/Down or PageUp/PageDown: Navigate between pages
 * - Home/End: Go to first/last page
 * - Ctrl+Z / Cmd+Z: Undo
 * - Ctrl+Y / Cmd+Shift+Z: Redo
 * - +/-: Zoom in/out
 * - Escape: Blur current element
 */
export function useKeyboardNavigation({
  containerRef,
  pageCount,
  goToPage,
  currentPage,
  onUndo,
  onRedo,
  onScaleChange,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (!enabled) return;

      const isMod = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case 'ArrowUp':
        case 'PageUp':
          if (currentPage > 1) {
            e.preventDefault();
            goToPage(currentPage - 1);
          }
          break;

        case 'ArrowDown':
        case 'PageDown':
          if (currentPage < pageCount) {
            e.preventDefault();
            goToPage(currentPage + 1);
          }
          break;

        case 'Home':
          if (pageCount > 0) {
            e.preventDefault();
            goToPage(1);
          }
          break;

        case 'End':
          if (pageCount > 0) {
            e.preventDefault();
            goToPage(pageCount);
          }
          break;

        case 'z':
        case 'Z':
          if (isMod && !e.shiftKey && onUndo) {
            e.preventDefault();
            onUndo();
          } else if (isMod && e.shiftKey && onRedo) {
            e.preventDefault();
            onRedo();
          }
          break;

        case 'y':
        case 'Y':
          if (isMod && onRedo) {
            e.preventDefault();
            onRedo();
          }
          break;

        case '+':
        case '=':
          if (onScaleChange) {
            e.preventDefault();
            onScaleChange(0.1);
          }
          break;

        case '-':
        case '_':
          if (onScaleChange) {
            e.preventDefault();
            onScaleChange(-0.1);
          }
          break;

        case 'Escape':
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          break;
      }
    },
    [enabled, currentPage, pageCount, goToPage, onUndo, onRedo, onScaleChange],
  );

  // Attach global keyboard listener when container is focused
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const listener = (e: KeyboardEvent) => {
      // Only handle when focus is within or on the container
      if (container.contains(document.activeElement) || container === document.activeElement) {
        handleKeyDown(e);
      }
    };

    container.addEventListener('keydown', listener);
    return () => container.removeEventListener('keydown', listener);
  }, [enabled, containerRef, handleKeyDown]);

  return { handleKeyDown };
}
