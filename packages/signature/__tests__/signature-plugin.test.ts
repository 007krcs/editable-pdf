import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { SignaturePlugin } from '../src/signature-plugin.js';
import { EventBus } from '@docsdk/core';
import type { DocSDKEventMap, PluginContext, DocumentControllerView } from '@docsdk/shared-types';
import { DocumentState } from '@docsdk/shared-types';

// Minimal 1x1 PNG
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
]);

async function createMockPdfEngine() {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);

  return {
    name: 'pdf-engine',
    version: '0.1.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
    getBridge: () => ({
      getPdfLibDocument: () => doc,
      getPageCount: () => doc.getPageCount(),
    }),
    reserialize: vi.fn().mockResolvedValue(new Uint8Array()),
  };
}

async function createMockContext() {
  const events = new EventBus<DocSDKEventMap>();
  const mockPdfEngine = await createMockPdfEngine();

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

describe('SignaturePlugin', () => {
  it('should have correct name and version', () => {
    const plugin = new SignaturePlugin();
    expect(plugin.name).toBe('signature');
    expect(plugin.version).toBe('0.1.0');
  });

  it('should place a signature and emit event', async () => {
    const { context, events, mockPdfEngine } = await createMockContext();
    const plugin = new SignaturePlugin();
    plugin.initialize(context);

    const listener = vi.fn();
    events.on('signature:placed', listener);

    await plugin.placeSignature(PNG_BYTES, {
      pageNumber: 1,
      x: 100,
      y: 600,
      width: 200,
      height: 80,
    });

    expect(mockPdfEngine.reserialize).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].pageNumber).toBe(1);
    expect(listener.mock.calls[0][0].bounds.width).toBe(200);
  });

  it('should accept SignatureImage object', async () => {
    const { context, mockPdfEngine } = await createMockContext();
    const plugin = new SignaturePlugin();
    plugin.initialize(context);

    await plugin.placeSignature(
      { bytes: PNG_BYTES, format: 'png' },
      { pageNumber: 1, x: 50, y: 50, width: 100, height: 40 },
    );

    expect(mockPdfEngine.reserialize).toHaveBeenCalledOnce();
  });

  it('should throw for out-of-range page', async () => {
    const { context } = await createMockContext();
    const plugin = new SignaturePlugin();
    plugin.initialize(context);

    await expect(
      plugin.placeSignature(PNG_BYTES, {
        pageNumber: 5,
        x: 0, y: 0, width: 100, height: 50,
      }),
    ).rejects.toThrow('out of range');
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

    const plugin = new SignaturePlugin();
    plugin.initialize(context);

    await expect(
      plugin.placeSignature(PNG_BYTES, { pageNumber: 1, x: 0, y: 0, width: 100, height: 50 }),
    ).rejects.toThrow('PDFEnginePlugin is required');
  });
});
