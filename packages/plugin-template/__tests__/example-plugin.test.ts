import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExamplePlugin } from '../src/example-plugin.js';

function createMockContext() {
  const handlers = new Map<string, Function[]>();
  return {
    events: {
      on: vi.fn((event: string, handler: Function) => {
        if (!handlers.has(event)) handlers.set(event, []);
        handlers.get(event)!.push(handler);
        return () => {
          const arr = handlers.get(event);
          if (arr) {
            const idx = arr.indexOf(handler);
            if (idx !== -1) arr.splice(idx, 1);
          }
        };
      }),
      emit: vi.fn(),
    },
    getPlugin: vi.fn((name: string) => ({ name, version: '1.0.0' })),
    _emit(event: string, payload: unknown) {
      for (const h of handlers.get(event) ?? []) h(payload);
    },
  };
}

describe('ExamplePlugin', () => {
  let plugin: ExamplePlugin;
  let ctx: ReturnType<typeof createMockContext>;

  beforeEach(async () => {
    plugin = new ExamplePlugin();
    ctx = createMockContext();
    await plugin.initialize(ctx as never);
  });

  it('has correct metadata', () => {
    expect(plugin.name).toBe('example');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.capabilities).toContain('example-feature');
  });

  it('counts events', () => {
    expect(plugin.getEventCount()).toBe(0);
    ctx._emit('document:loaded', { pageCount: 3 });
    expect(plugin.getEventCount()).toBe(1);
    ctx._emit('document:closed', {});
    expect(plugin.getEventCount()).toBe(2);
  });

  it('accesses other plugins via context', () => {
    const info = plugin.getOtherPluginInfo('pdf-engine');
    expect(info).toBe('pdf-engine@1.0.0');
  });

  it('returns undefined for missing plugins', () => {
    ctx.getPlugin.mockImplementation(() => {
      throw new Error('not found');
    });
    expect(plugin.getOtherPluginInfo('missing')).toBeUndefined();
  });

  it('cleans up on destroy', async () => {
    await plugin.destroy();
    ctx._emit('document:loaded', { pageCount: 1 });
    expect(plugin.getEventCount()).toBe(0);
  });
});
