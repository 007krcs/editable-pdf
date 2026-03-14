import { describe, it, expect, vi } from 'vitest';
import { AuditPlugin } from '../src/audit-plugin.js';
import type { PluginContext } from '@docsdk/shared-types';

function createMockContext(): PluginContext & { listeners: Map<string, Array<(payload: unknown) => void>> } {
  const listeners = new Map<string, Array<(payload: unknown) => void>>();

  return {
    listeners,
    events: {
      on: vi.fn((event: string, listener: (payload: unknown) => void) => {
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
      state: 'IDLE' as any,
      currentBytes: null,
      pageCount: 0,
      updateBytes: vi.fn(),
      setPageCount: vi.fn(),
    },
    getPlugin: vi.fn(),
  };
}

describe('AuditPlugin', () => {
  it('should have correct metadata', () => {
    const plugin = new AuditPlugin();
    expect(plugin.name).toBe('audit');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.capabilities).toContain('audit');
  });

  it('should subscribe to SDK events on initialize', () => {
    const plugin = new AuditPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    // Should have subscribed to multiple events
    expect(ctx.events.on).toHaveBeenCalled();
    const calls = (ctx.events.on as ReturnType<typeof vi.fn>).mock.calls;
    const subscribedEvents = calls.map(c => c[0]);
    expect(subscribedEvents).toContain('document:loaded');
    expect(subscribedEvents).toContain('field:changed');
    expect(subscribedEvents).toContain('signature:placed');
  });

  it('should record entries when events fire', () => {
    const plugin = new AuditPlugin({ userId: 'test-user' });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    // Simulate a document:loaded event
    const loadedListeners = ctx.listeners.get('document:loaded') ?? [];
    expect(loadedListeners).toHaveLength(1);
    loadedListeners[0]({ pageCount: 5 });

    const entries = plugin.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('document:loaded');
    expect(entries[0].userId).toBe('test-user');
    expect(entries[0].sessionId).toBeTruthy();
  });

  it('should exclude specified events', () => {
    const plugin = new AuditPlugin({ excludeEvents: ['page:rendering', 'page:rendered'] });
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const subscribedEvents = (ctx.events.on as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
    expect(subscribedEvents).not.toContain('page:rendering');
    expect(subscribedEvents).not.toContain('page:rendered');
  });

  it('should support runtime identifier updates', () => {
    const plugin = new AuditPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    plugin.setIdentifiers({ userId: 'user-42', documentId: 'doc-99' });

    const loadedListeners = ctx.listeners.get('document:loaded') ?? [];
    loadedListeners[0]({ pageCount: 1 });

    const entries = plugin.getEntries();
    expect(entries[0].userId).toBe('user-42');
    expect(entries[0].documentId).toBe('doc-99');
  });

  it('should clear entries', () => {
    const plugin = new AuditPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const listeners = ctx.listeners.get('document:loaded') ?? [];
    listeners[0]({ pageCount: 1 });
    expect(plugin.getEntries()).toHaveLength(1);

    plugin.clearEntries();
    expect(plugin.getEntries()).toHaveLength(0);
  });

  it('should unsubscribe on destroy', () => {
    const plugin = new AuditPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const listenersBefore = ctx.listeners.get('document:loaded')?.length ?? 0;
    expect(listenersBefore).toBeGreaterThan(0);

    plugin.destroy();

    const listenersAfter = ctx.listeners.get('document:loaded')?.length ?? 0;
    expect(listenersAfter).toBe(0);
  });

  it('should generate unique session IDs', () => {
    const plugin1 = new AuditPlugin();
    const plugin2 = new AuditPlugin();
    expect(plugin1.getSessionId()).not.toBe(plugin2.getSessionId());
  });

  it('should sanitize binary data in event payloads', () => {
    const plugin = new AuditPlugin();
    const ctx = createMockContext();
    plugin.initialize(ctx);

    const exportedListeners = ctx.listeners.get('document:exported') ?? [];
    exportedListeners[0]({ bytes: new Uint8Array(1024) });

    const entries = plugin.getEntries();
    expect(entries[0].details?.bytes).toBe('[binary 1024 bytes]');
  });
});
