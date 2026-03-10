import { describe, it, expect, vi } from 'vitest';
import { DetectionPlugin } from '../src/detection-plugin.js';
import { EventBus } from '@docsdk/core';
import type { DocSDKEventMap, PluginContext, DocumentControllerView } from '@docsdk/shared-types';
import { DocumentState } from '@docsdk/shared-types';

/** Build a minimal PDF header for testing */
function buildMinimalPdf(): Uint8Array {
  const content = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R >>
endobj
4 0 obj
<< /Title (Test Doc) /Author (Unit Test) >>
endobj
trailer
<< /Root 1 0 R /Info 4 0 R >>
%%EOF`;
  return new Uint8Array([...content].map((c) => c.charCodeAt(0)));
}

function createMockContext(bytes: Uint8Array | null = null): {
  context: PluginContext;
  events: EventBus<DocSDKEventMap>;
  controller: DocumentControllerView;
} {
  const events = new EventBus<DocSDKEventMap>();
  const controller: DocumentControllerView = {
    state: bytes ? DocumentState.LOADED : DocumentState.IDLE,
    currentBytes: bytes,
    pageCount: 0,
    updateBytes: vi.fn(),
    setPageCount: vi.fn(),
  };

  const context: PluginContext = {
    events,
    documentController: controller,
    getPlugin: vi.fn(),
  };

  return { context, events, controller };
}

describe('DetectionPlugin', () => {
  it('should initialize and listen for document:loaded', () => {
    const plugin = new DetectionPlugin();
    const { context } = createMockContext();
    plugin.initialize(context);

    expect(plugin.name).toBe('detection');
    expect(plugin.version).toBe('0.1.0');
  });

  it('should emit document:detected on document:loaded', () => {
    const pdfBytes = buildMinimalPdf();
    const plugin = new DetectionPlugin();
    const { context, events } = createMockContext(pdfBytes);

    plugin.initialize(context);

    const detectedListener = vi.fn();
    events.on('document:detected', detectedListener);

    // Simulate document:loaded event
    events.emit('document:loaded', {
      document: { id: 'doc_1', pageCount: 1, bytes: pdfBytes, mimeType: undefined },
      pageCount: 1,
    });

    expect(detectedListener).toHaveBeenCalledOnce();
    const payload = detectedListener.mock.calls[0][0];
    expect(payload.fileType.type).toBe('pdf');
    expect(payload.fileType.version).toBe('1.7');
    expect(payload.metadata.title).toBe('Test Doc');
    expect(payload.metadata.author).toBe('Unit Test');
  });

  it('should not emit metadata for non-PDF files', () => {
    const nonPdfBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const plugin = new DetectionPlugin();
    const { context, events } = createMockContext(nonPdfBytes);

    plugin.initialize(context);

    const detectedListener = vi.fn();
    events.on('document:detected', detectedListener);

    events.emit('document:loaded', {
      document: { id: 'doc_1', pageCount: 0, bytes: nonPdfBytes, mimeType: undefined },
      pageCount: 0,
    });

    expect(detectedListener).toHaveBeenCalledOnce();
    const payload = detectedListener.mock.calls[0][0];
    expect(payload.fileType.type).toBe('unknown');
    expect(payload.metadata).toEqual({});
  });

  it('should expose detectFileType() for on-demand use', () => {
    const pdfBytes = buildMinimalPdf();
    const plugin = new DetectionPlugin();
    const { context } = createMockContext(pdfBytes);
    plugin.initialize(context);

    const result = plugin.detectFileType();
    expect(result.type).toBe('pdf');
    expect(result.version).toBe('1.7');
  });

  it('should expose readMetadata() for on-demand use', () => {
    const pdfBytes = buildMinimalPdf();
    const plugin = new DetectionPlugin();
    const { context } = createMockContext(pdfBytes);
    plugin.initialize(context);

    const metadata = plugin.readMetadata();
    expect(metadata.title).toBe('Test Doc');
    expect(metadata.author).toBe('Unit Test');
  });

  it('should throw on detectFileType() with no document loaded', () => {
    const plugin = new DetectionPlugin();
    const { context } = createMockContext(null);
    plugin.initialize(context);

    expect(() => plugin.detectFileType()).toThrow('No document loaded');
  });

  it('should throw on readMetadata() with no document loaded', () => {
    const plugin = new DetectionPlugin();
    const { context } = createMockContext(null);
    plugin.initialize(context);

    expect(() => plugin.readMetadata()).toThrow('No document loaded');
  });

  it('should clean up context on destroy', async () => {
    const plugin = new DetectionPlugin();
    const { context } = createMockContext(buildMinimalPdf());
    plugin.initialize(context);
    await plugin.destroy();

    expect(() => plugin.detectFileType()).toThrow();
  });
});
