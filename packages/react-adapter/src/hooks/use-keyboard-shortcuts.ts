import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /** Key combination, e.g. 'ctrl+z', 'ctrl+shift+z', '+', '-' */
  key: string;
  /** Handler function */
  handler: () => void;
  /** Description for help display */
  description: string;
  /** Whether this shortcut is currently enabled */
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  /** Whether all shortcuts are enabled */
  enabled?: boolean;
}

export interface UseKeyboardShortcutsReturn {
  /** List of active shortcuts for help display */
  shortcuts: Array<{ key: string; description: string }>;
}

/**
 * Global keyboard shortcuts hook.
 *
 * Registers document-level keydown listeners for common shortcuts:
 * - Ctrl+O: Open file
 * - Ctrl+S: Save/Export
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Ctrl+F: Search (future)
 * - +/-: Zoom
 * - PgUp/PgDn: Navigate pages
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions): UseKeyboardShortcutsReturn {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const parts = shortcut.key.toLowerCase().split('+');
        const mainKey = parts[parts.length - 1];
        const needsCtrl = parts.includes('ctrl') || parts.includes('mod');
        const needsShift = parts.includes('shift');
        const needsAlt = parts.includes('alt');

        const keyMatch = e.key.toLowerCase() === mainKey || e.code.toLowerCase() === `key${mainKey}`;
        const ctrlMatch = needsCtrl ? isMod : !isMod;
        const shiftMatch = needsShift ? e.shiftKey : !e.shiftKey;
        const altMatch = needsAlt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcuts
      .filter((s) => s.enabled !== false)
      .map(({ key, description }) => ({ key, description })),
  };
}
