import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarksPlugin } from '../src/bookmarks-plugin.js';
import type { PluginContext } from '@docsdk/shared-types';

function createMockContext(): PluginContext {
  const listeners = new Map<string, Function[]>();
  return {
    events: {
      on: vi.fn((event: string, listener: Function) => {
        const arr = listeners.get(event) ?? [];
        arr.push(listener);
        listeners.set(event, arr);
        return () => {};
      }),
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn((event: string, payload: any) => {
        (listeners.get(event) ?? []).forEach((fn) => fn(payload));
      }),
      removeAllListeners: vi.fn(),
    },
    documentController: {
      state: 'READY' as any,
      currentBytes: new Uint8Array(),
      pageCount: 3,
      updateBytes: vi.fn(),
      setPageCount: vi.fn(),
    },
    getPlugin: vi.fn(() => ({
      getBridge: () => ({
        getPdfjsDocument: () => ({
          getOutline: async () => [],
        }),
      }),
    })),
  } as unknown as PluginContext;
}

describe('BookmarksPlugin', () => {
  let plugin: BookmarksPlugin;

  beforeEach(() => {
    plugin = new BookmarksPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);
  });

  it('returns empty bookmarks for PDF without outline', async () => {
    const tree = await plugin.getBookmarks();
    expect(tree.items).toHaveLength(0);
  });

  it('returns flat list', async () => {
    const flat = await plugin.flattenBookmarks();
    expect(flat).toHaveLength(0);
  });
});
