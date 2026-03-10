// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { ViewerPlugin } from '../src/viewer-plugin.js';
import { EventBus } from '@docsdk/core';
import type { DocSDKEventMap, PluginContext, DocumentControllerView } from '@docsdk/shared-types';
import { DocumentState } from '@docsdk/shared-types';

function createMockContext() {
  const events = new EventBus<DocSDKEventMap>();

  const mockPdfEngine = {
    name: 'pdf-engine',
    version: '0.1.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
    renderPage: vi.fn().mockResolvedValue(undefined),
  };

  const controller: DocumentControllerView = {
    state: DocumentState.LOADED,
    currentBytes: new Uint8Array(),
    pageCount: 1,
    updateBytes: vi.fn(),
    setPageCount: vi.fn(),
  };

  const context: PluginContext = {
    events,
    documentController: controller,
    getPlugin: vi.fn().mockImplementation((name: string) => {
      if (name === 'pdf-engine') return mockPdfEngine;
      return undefined;
    }),
  };

  return { context, events, mockPdfEngine };
}

describe('ViewerPlugin', () => {
  it('should have correct name and version', () => {
    const plugin = new ViewerPlugin();
    expect(plugin.name).toBe('viewer');
    expect(plugin.version).toBe('0.1.0');
  });

  it('should expose canvasManager and renderQueue', () => {
    const plugin = new ViewerPlugin();
    expect(plugin.canvasManager).toBeDefined();
    expect(plugin.renderQueue).toBeDefined();
  });

  it('should throw when PDFEnginePlugin is not registered', async () => {
    const events = new EventBus<DocSDKEventMap>();
    const context: PluginContext = {
      events,
      documentController: {
        state: DocumentState.IDLE,
        currentBytes: null,
        pageCount: 0,
        updateBytes: vi.fn(),
        setPageCount: vi.fn(),
      },
      getPlugin: vi.fn().mockReturnValue(undefined),
    };

    const plugin = new ViewerPlugin();
    plugin.initialize(context);

    const mockCanvas = { width: 0, height: 0, getContext: vi.fn() } as never;
    await expect(plugin.renderPage(1, mockCanvas)).rejects.toThrow('PDFEnginePlugin is required');
  });

  it('should clean up on destroy', async () => {
    const { context } = createMockContext();
    const plugin = new ViewerPlugin();
    plugin.initialize(context);

    // Create some canvases
    plugin.canvasManager.create(1, 100, 100);
    plugin.canvasManager.create(2, 100, 100);

    await plugin.destroy();

    expect(plugin.canvasManager.get(1)).toBeUndefined();
    expect(plugin.canvasManager.get(2)).toBeUndefined();
  });
});
