import { describe, it, expect, vi } from 'vitest';
import { HistoryPlugin } from '../src/history-plugin.js';
import { createCommand } from '../src/command.js';
import type { PluginContext } from '@docsdk/shared-types';

function createMockContext(): PluginContext & { listeners: Map<string, Array<(payload: any) => void>> } {
  const listeners = new Map<string, Array<(payload: any) => void>>();

  return {
    listeners,
    events: {
      on: vi.fn((event: string, listener: (payload: any) => void) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event)!.push(listener);
        return () => {
          const arr = listeners.get(event);
          if (arr) {
            const idx = arr.indexOf(listener);
            if (idx >= 0) arr.splice(idx, 1);
          }
        };
      }),
      once: vi.fn(() => () => {}),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    documentController: {
      state: 'READY' as any,
      currentBytes: null,
      pageCount: 1,
      updateBytes: vi.fn(),
      setPageCount: vi.fn(),
    },
    getPlugin: vi.fn(() => ({
      writeFieldValue: vi.fn(),
    })),
  };
}

describe('HistoryPlugin', () => {
  it('should have correct metadata', () => {
    const plugin = new HistoryPlugin();
    expect(plugin.name).toBe('history');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.capabilities).toContain('undo');
    expect(plugin.capabilities).toContain('redo');
  });

  it('should auto-capture field changes', () => {
    const plugin = new HistoryPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    // Simulate field:changed event
    const fieldListeners = ctx.listeners.get('field:changed') ?? [];
    fieldListeners[0]({ fieldName: 'name', oldValue: 'Alice', newValue: 'Bob' });

    expect(plugin.canUndo).toBe(true);
    expect(plugin.undoCount).toBe(1);
  });

  it('should undo and redo custom commands', async () => {
    const execFn = vi.fn();
    const undoFn = vi.fn();
    const plugin = new HistoryPlugin({ autoCapture: false });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const cmd = createCommand({ execute: execFn, undo: undoFn, description: 'custom op' });
    plugin.push(cmd);

    expect(plugin.canUndo).toBe(true);
    await plugin.undo();
    expect(undoFn).toHaveBeenCalledOnce();
    expect(plugin.canRedo).toBe(true);

    await plugin.redo();
    expect(execFn).toHaveBeenCalledOnce();
  });

  it('should emit history events', async () => {
    const plugin = new HistoryPlugin({ autoCapture: false });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const cmd = createCommand({ execute: vi.fn(), undo: vi.fn(), description: 'test' });
    plugin.push(cmd);

    expect(ctx.events.emit).toHaveBeenCalledWith('history:pushed', expect.objectContaining({
      description: 'test',
    }));

    await plugin.undo();
    expect(ctx.events.emit).toHaveBeenCalledWith('history:undone', expect.any(Object));

    await plugin.redo();
    expect(ctx.events.emit).toHaveBeenCalledWith('history:redone', expect.any(Object));
  });

  it('should clear history on document:loading', () => {
    const plugin = new HistoryPlugin({ autoCapture: false });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    plugin.push(createCommand({ execute: vi.fn(), undo: vi.fn(), description: 'test' }));
    expect(plugin.canUndo).toBe(true);

    // Simulate document:loading
    const loadingListeners = ctx.listeners.get('document:loading') ?? [];
    loadingListeners[0]({ source: { type: 'file' } });

    expect(plugin.canUndo).toBe(false);
  });

  it('should clear history on document:closed', () => {
    const plugin = new HistoryPlugin({ autoCapture: false });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    plugin.push(createCommand({ execute: vi.fn(), undo: vi.fn(), description: 'test' }));

    const closedListeners = ctx.listeners.get('document:closed') ?? [];
    closedListeners[0]({});

    expect(plugin.canUndo).toBe(false);
  });

  it('should not capture changes during undo/redo', async () => {
    const plugin = new HistoryPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    // Simulate a field change
    const fieldListeners = ctx.listeners.get('field:changed') ?? [];
    fieldListeners[0]({ fieldName: 'name', oldValue: 'A', newValue: 'B' });
    expect(plugin.undoCount).toBe(1);

    // Undo — the writeFieldValue call might trigger another field:changed
    // but it should be ignored because _isUndoRedoing is true
    await plugin.undo();
    // Count should not have increased beyond what undo manages
    expect(plugin.undoCount).toBe(0);
  });

  it('should provide undo/redo history', () => {
    const plugin = new HistoryPlugin({ autoCapture: false });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    plugin.push(createCommand({ execute: vi.fn(), undo: vi.fn(), description: 'op1' }));
    plugin.push(createCommand({ execute: vi.fn(), undo: vi.fn(), description: 'op2' }));

    expect(plugin.getUndoHistory()).toEqual(['op2', 'op1']);
    expect(plugin.getRedoHistory()).toEqual([]);
  });

  it('should clean up on destroy', () => {
    const plugin = new HistoryPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    plugin.push(createCommand({ execute: vi.fn(), undo: vi.fn(), description: 'test' }));
    plugin.destroy();

    expect(plugin.canUndo).toBe(false);
    expect(plugin.canRedo).toBe(false);
  });
});
