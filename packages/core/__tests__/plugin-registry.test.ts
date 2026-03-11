import { describe, it, expect, vi } from 'vitest';
import { PluginRegistry } from '../src/plugin-registry.js';
import {
  DuplicatePluginError,
  PluginNotFoundError,
  MissingDependencyError,
  CyclicDependencyError,
  PluginInitError,
} from '../src/errors.js';
import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';

function createMockPlugin(
  name: string,
  overrides: Partial<DocSDKPlugin> = {},
): DocSDKPlugin {
  return {
    name,
    version: '1.0.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
    ...overrides,
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
  // ── Registration ────────────────────────────────────────────

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

  it('should prevent registration after initialization', async () => {
    const registry = new PluginRegistry();
    await registry.initialize(createMockContext());
    expect(() => registry.register(createMockPlugin('late'))).toThrow('after initialization');
  });

  // ── Initialization order ────────────────────────────────────

  it('should initialize plugins in topological order (no deps = registration order)', async () => {
    const registry = new PluginRegistry();
    const order: string[] = [];
    const p1 = createMockPlugin('first', {
      initialize: vi.fn(() => { order.push('first'); }),
    });
    const p2 = createMockPlugin('second', {
      initialize: vi.fn(() => { order.push('second'); }),
    });

    registry.register(p1);
    registry.register(p2);
    await registry.initialize(createMockContext());

    expect(order).toEqual(['first', 'second']);
  });

  it('should initialize dependencies before dependents', async () => {
    const registry = new PluginRegistry();
    const order: string[] = [];

    // Register dependent FIRST, dependency SECOND
    const dependent = createMockPlugin('form-engine', {
      dependencies: ['pdf-engine'],
      initialize: vi.fn(() => { order.push('form-engine'); }),
    });
    const dependency = createMockPlugin('pdf-engine', {
      initialize: vi.fn(() => { order.push('pdf-engine'); }),
    });

    registry.register(dependent);
    registry.register(dependency);
    await registry.initialize(createMockContext());

    // Despite registration order, pdf-engine should init first
    expect(order).toEqual(['pdf-engine', 'form-engine']);
  });

  it('should set isInitialized to true after initialization', async () => {
    const registry = new PluginRegistry();
    expect(registry.isInitialized).toBe(false);
    await registry.initialize(createMockContext());
    expect(registry.isInitialized).toBe(true);
  });

  it('should throw when initialized twice', async () => {
    const registry = new PluginRegistry();
    await registry.initialize(createMockContext());
    await expect(registry.initialize(createMockContext())).rejects.toThrow('already initialized');
  });

  // ── Dependency validation ───────────────────────────────────

  it('should throw MissingDependencyError when a required dependency is missing', async () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('consumer', {
      dependencies: ['missing-dep'],
    }));

    await expect(registry.initialize(createMockContext())).rejects.toThrow(MissingDependencyError);
    await expect(registry.initialize(createMockContext()).catch((e) => {
      throw e;
    })).rejects.toThrow('requires "missing-dep"');
  });

  it('should throw CyclicDependencyError when dependencies form a cycle', async () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('a', { dependencies: ['b'] }));
    registry.register(createMockPlugin('b', { dependencies: ['a'] }));

    // Reset isInitialized — we need a fresh one
    const reg2 = new PluginRegistry();
    reg2.register(createMockPlugin('a', { dependencies: ['b'] }));
    reg2.register(createMockPlugin('b', { dependencies: ['a'] }));

    await expect(reg2.initialize(createMockContext())).rejects.toThrow(CyclicDependencyError);
  });

  it('should allow optional dependencies that are not registered', async () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('consumer', {
      optionalDependencies: ['optional-thing'],
    }));

    // Should NOT throw — optional deps are nice-to-have
    await expect(registry.initialize(createMockContext())).resolves.toBeUndefined();
  });

  // ── Init rollback ───────────────────────────────────────────

  it('should rollback previously-initialized plugins when one fails', async () => {
    const registry = new PluginRegistry();
    const destroySpy = vi.fn();

    registry.register(createMockPlugin('ok-plugin', {
      destroy: destroySpy,
    }));
    registry.register(createMockPlugin('bad-plugin', {
      initialize: vi.fn(() => { throw new Error('init boom'); }),
    }));

    try {
      await registry.initialize(createMockContext());
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PluginInitError);
      const pie = err as PluginInitError;
      expect(pie.pluginName).toBe('bad-plugin');
      expect(pie.rolledBack).toEqual(['ok-plugin']);
      expect(destroySpy).toHaveBeenCalledOnce();
    }
  });

  // ── Plugin lookup ───────────────────────────────────────────

  it('should throw PluginNotFoundError for missing plugin via getPlugin', () => {
    const registry = new PluginRegistry();
    expect(() => registry.getPlugin('missing')).toThrow(PluginNotFoundError);
    expect(() => registry.getPlugin('missing')).toThrow('not registered');
  });

  it('should return undefined for missing plugin via tryGetPlugin', () => {
    const registry = new PluginRegistry();
    expect(registry.tryGetPlugin('missing')).toBeUndefined();
  });

  // ── Capability registry ─────────────────────────────────────

  it('should track capabilities from plugins', async () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('form-engine', {
      capabilities: ['forms', 'editing'],
    }));
    registry.register(createMockPlugin('signature', {
      capabilities: ['signatures'],
    }));

    expect(registry.hasCapability('forms')).toBe(true);
    expect(registry.hasCapability('signatures')).toBe(true);
    expect(registry.hasCapability('ocr')).toBe(false);

    expect(registry.getPluginsByCapability('forms')).toEqual(['form-engine']);
    expect(registry.getPluginsByCapability('editing')).toEqual(['form-engine']);
    expect(registry.getPluginsByCapability('signatures')).toEqual(['signature']);
    expect(registry.getPluginsByCapability('nonexistent')).toEqual([]);
  });

  it('should allow multiple plugins to provide the same capability', () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('plugin-a', { capabilities: ['rendering'] }));
    registry.register(createMockPlugin('plugin-b', { capabilities: ['rendering'] }));

    expect(registry.hasCapability('rendering')).toBe(true);
    expect(registry.getPluginsByCapability('rendering')).toEqual(['plugin-a', 'plugin-b']);
  });

  // ── Destroy ─────────────────────────────────────────────────

  it('should destroy plugins in reverse init order', async () => {
    const registry = new PluginRegistry();
    const order: string[] = [];
    const p1 = createMockPlugin('first', {
      destroy: vi.fn(() => { order.push('first'); }),
    });
    const p2 = createMockPlugin('second', {
      destroy: vi.fn(() => { order.push('second'); }),
    });

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

  it('should throw AggregateError if multiple plugins fail on destroy', async () => {
    const registry = new PluginRegistry();
    registry.register(createMockPlugin('a', {
      destroy: vi.fn(() => { throw new Error('destroy-a'); }),
    }));
    registry.register(createMockPlugin('b', {
      destroy: vi.fn(() => { throw new Error('destroy-b'); }),
    }));

    await registry.initialize(createMockContext());

    await expect(registry.destroy()).rejects.toThrow(AggregateError);
  });
});
