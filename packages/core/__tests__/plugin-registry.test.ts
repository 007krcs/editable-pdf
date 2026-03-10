import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '../src/plugin-registry.js';
import { DuplicatePluginError, PluginNotFoundError } from '../src/errors.js';
import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';

function createMockPlugin(name: string): DocSDKPlugin {
  return {
    name,
    version: '1.0.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
  };
}

function createMockContext(): PluginContext {
  return {
    events: {
      on: vi.fn(() => () => {}),
      once: vi.fn(() => () => {}),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    documentController: {
      state: 'IDLE' as never,
      currentBytes: null,
      pageCount: 0,
      updateBytes: vi.fn(),
      setPageCount: vi.fn(),
    },
    getPlugin: vi.fn(),
  };
}

describe('PluginRegistry', () => {
  it('should register and retrieve a plugin', () => {
    const registry = new PluginRegistry();
    const plugin = createMockPlugin('test-plugin');
    registry.register(plugin);
    expect(registry.tryGetPlugin('test-plugin')).toBe(plugin);
  });

  it('should throw DuplicatePluginError on duplicate registration', () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('dup'));
    expect(() => registry.register(createMockPlugin('dup'))).toThrow(DuplicatePluginError);
    expect(() => registry.register(createMockPlugin('dup'))).toThrow('already registered');
  });

  it('should initialize plugins in registration order', async () => {
    const registry = new PluginRegistry();
    const order: string[] = [];
    const p1 = createMockPlugin('first');
    (p1.initialize as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('first'); });
    const p2 = createMockPlugin('second');
    (p2.initialize as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('second'); });

    registry.register(p1);
    registry.register(p2);
    await registry.initialize(createMockContext());

    expect(order).toEqual(['first', 'second']);
  });

  it('should set isInitialized to true after initialization', async () => {
    const registry = new PluginRegistry();
    expect(registry.isInitialized).toBe(false);
    await registry.initialize(createMockContext());
    expect(registry.isInitialized).toBe(true);
  });

  it('should prevent registration after initialization', async () => {
    const registry = new PluginRegistry();
    await registry.initialize(createMockContext());
    expect(() => registry.register(createMockPlugin('late'))).toThrow('after initialization');
  });

  it('should throw PluginNotFoundError for missing plugin via getPlugin', () => {
    const registry = new PluginRegistry();
    expect(() => registry.getPlugin('missing')).toThrow(PluginNotFoundError);
    expect(() => registry.getPlugin('missing')).toThrow('not registered');
  });

  it('should return undefined for missing plugin via tryGetPlugin', () => {
    const registry = new PluginRegistry();
    expect(registry.tryGetPlugin('missing')).toBeUndefined();
  });

  it('should destroy plugins in reverse registration order', async () => {
    const registry = new PluginRegistry();
    const order: string[] = [];
    const p1 = createMockPlugin('first');
    (p1.destroy as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('first'); });
    const p2 = createMockPlugin('second');
    (p2.destroy as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('second'); });

    registry.register(p1);
    registry.register(p2);
    await registry.initialize(createMockContext());
    await registry.destroy();

    expect(order).toEqual(['second', 'first']);
  });

  it('should reset isInitialized after destroy', async () => {
    const registry = new PluginRegistry();
    await registry.initialize(createMockContext());
    expect(registry.isInitialized).toBe(true);
    await registry.destroy();
    expect(registry.isInitialized).toBe(false);
  });
});
