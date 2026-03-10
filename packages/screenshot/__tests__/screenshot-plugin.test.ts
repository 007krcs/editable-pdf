import { describe, it, expect, vi } from 'vitest';
import { ScreenshotPlugin } from '../src/screenshot-plugin.js';
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

describe('ScreenshotPlugin', () => {
  it('should have correct name and version', () => {
    const plugin = new ScreenshotPlugin();
    expect(plugin.name).toBe('screenshot');
    expect(plugin.version).toBe('0.1.0');
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

    const plugin = new ScreenshotPlugin();
    plugin.initialize(context);

    await expect(plugin.capturePage({ pageNumber: 1 })).rejects.toThrow('PDFEnginePlugin is required');
  });

  it('should clean up on destroy', async () => {
    const { context } = createMockContext();
    const plugin = new ScreenshotPlugin();
    plugin.initialize(context);

    await plugin.destroy();

    // After destroy, operations should fail
    await expect(plugin.capturePage({ pageNumber: 1 })).rejects.toThrow();
  });
});
