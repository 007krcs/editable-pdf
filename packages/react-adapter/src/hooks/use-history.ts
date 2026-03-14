import { useState, useCallback, useEffect } from 'react';
import { useDocSDK } from './use-docsdk.js';
import type { DocSDKPlugin } from '@docsdk/shared-types';

/** Duck-typed HistoryPlugin interface (avoids hard dependency on @docsdk/history) */
interface HistoryPluginLike extends DocSDKPlugin {
  undo(): Promise<unknown>;
  redo(): Promise<unknown>;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  getUndoHistory(): string[];
  getRedoHistory(): string[];
  push(command: unknown): void;
}

export interface UseHistoryReturn {
  /** Undo the most recent command */
  undo: () => Promise<void>;
  /** Redo the most recently undone command */
  redo: () => Promise<void>;
  /** Whether there are commands to undo */
  canUndo: boolean;
  /** Whether there are commands to redo */
  canRedo: boolean;
  /** Number of undoable commands */
  undoCount: number;
  /** Number of redoable commands */
  redoCount: number;
  /** Descriptions of undoable commands (most recent first) */
  undoHistory: string[];
  /** Descriptions of redoable commands (most recent first) */
  redoHistory: string[];
}

/**
 * Hook for undo/redo functionality.
 * Requires the HistoryPlugin to be registered in the SDK.
 * Returns no-op functions if the plugin is not available.
 */
export function useHistory(): UseHistoryReturn {
  const sdk = useDocSDK();
  const [, forceUpdate] = useState(0);

  const getPlugin = useCallback((): HistoryPluginLike | null => {
    try {
      return sdk.getPlugin<HistoryPluginLike>('history');
    } catch {
      return null;
    }
  }, [sdk]);

  // Subscribe to history events to trigger re-renders
  useEffect(() => {
    const unsubs = [
      sdk.events.on('history:pushed', () => forceUpdate((n) => n + 1)),
      sdk.events.on('history:undone', () => forceUpdate((n) => n + 1)),
      sdk.events.on('history:redone', () => forceUpdate((n) => n + 1)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [sdk]);

  const undo = useCallback(async () => {
    await getPlugin()?.undo();
  }, [getPlugin]);

  const redo = useCallback(async () => {
    await getPlugin()?.redo();
  }, [getPlugin]);

  const plugin = getPlugin();

  return {
    undo,
    redo,
    canUndo: plugin?.canUndo ?? false,
    canRedo: plugin?.canRedo ?? false,
    undoCount: plugin?.undoCount ?? 0,
    redoCount: plugin?.redoCount ?? 0,
    undoHistory: plugin?.getUndoHistory() ?? [],
    redoHistory: plugin?.getRedoHistory() ?? [],
  };
}
