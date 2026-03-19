import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedactionPlugin } from '../src/redaction-plugin.js';
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
    getPlugin: vi.fn(),
  } as unknown as PluginContext;
}

describe('RedactionPlugin', () => {
  let plugin: RedactionPlugin;
  let ctx: PluginContext;

  beforeEach(() => {
    plugin = new RedactionPlugin();
    ctx = createMockContext();
    plugin.initialize(ctx);
  });

  it('marks areas for redaction', () => {
    const area = plugin.markForRedaction(1, 50, 100, 200, 20, 'SSN');
    expect(area.pageNumber).toBe(1);
    expect(area.label).toBe('SSN');
    expect(plugin.getPendingRedactions()).toHaveLength(1);
  });

  it('unmarks redactions', () => {
    const area = plugin.markForRedaction(1, 50, 100, 200, 20);
    expect(plugin.unmarkRedaction(area.id)).toBe(true);
    expect(plugin.getPendingRedactions()).toHaveLength(0);
  });

  it('filters by page', () => {
    plugin.markForRedaction(1, 50, 100, 200, 20);
    plugin.markForRedaction(2, 50, 100, 200, 20);
    expect(plugin.getPendingRedactions(1)).toHaveLength(1);
    expect(plugin.getPendingRedactions(2)).toHaveLength(1);
  });

  it('clears on document close', () => {
    plugin.markForRedaction(1, 50, 100, 200, 20);
    (ctx.events.emit as any)('document:closed', {});
    expect(plugin.getPendingRedactions()).toHaveLength(0);
  });
});
