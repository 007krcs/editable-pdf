import { describe, it, expect, vi } from 'vitest';
import { DocumentController } from '../src/document-controller.js';
import { EventBus } from '../src/event-bus.js';
import { InvalidStateError } from '../src/errors.js';
import { DocumentState } from '@docsdk/shared-types';
import type { DocSDKEventMap, CanvasTarget } from '@docsdk/shared-types';

function setup() {
  const events = new EventBus<DocSDKEventMap>();
  const controller = new DocumentController(events);
  return { events, controller };
}

const MOCK_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

describe('DocumentController', () => {
  it('should start in IDLE state', () => {
    const { controller } = setup();
    expect(controller.state).toBe(DocumentState.IDLE);
    expect(controller.currentBytes).toBeNull();
    expect(controller.pageCount).toBe(0);
    expect(controller.documentId).toBeNull();
    expect(controller.isLocked).toBe(false);
  });

  describe('load()', () => {
    it('should transition IDLE → LOADING → LOADED and return DocumentHandle', async () => {
      const { controller, events } = setup();
      const loadedListener = vi.fn();
      events.on('document:loaded', loadedListener);

      const handle = await controller.load(
        { type: 'buffer', buffer: MOCK_BYTES },
        async () => MOCK_BYTES,
      );

      expect(controller.state).toBe(DocumentState.LOADED);
      expect(controller.currentBytes).toBe(MOCK_BYTES);
      expect(handle).toBeDefined();
      expect(handle.id).toMatch(/^doc_\d+$/);
      expect(handle.bytes).toBe(MOCK_BYTES);
      expect(handle.mimeType).toBeUndefined();
      expect(loadedListener).toHaveBeenCalledOnce();
    });

    it('should emit document:loading before loading', async () => {
      const { controller, events } = setup();
      const loadingListener = vi.fn();
      events.on('document:loading', loadingListener);

      await controller.load(
        { type: 'url', url: 'https://example.com/doc.pdf' },
        async () => MOCK_BYTES,
      );

      expect(loadingListener).toHaveBeenCalledWith({
        source: { type: 'url', url: 'https://example.com/doc.pdf' },
      });
    });

    it('should return to IDLE on load failure and emit document:error', async () => {
      const { controller, events } = setup();
      const errorListener = vi.fn();
      events.on('document:error', errorListener);

      await expect(
        controller.load(
          { type: 'url', url: 'http://fail.test' },
          async () => { throw new Error('network error'); },
        ),
      ).rejects.toThrow('network error');

      expect(controller.state).toBe(DocumentState.IDLE);
      expect(controller.isLocked).toBe(false);
      expect(errorListener).toHaveBeenCalledOnce();
      expect(errorListener.mock.calls[0][0].phase).toBe('loading');
    });

    it('should throw when loading from non-IDLE state (operation lock)', async () => {
      const { controller } = setup();
      await controller.load(
        { type: 'buffer', buffer: MOCK_BYTES },
        async () => MOCK_BYTES,
      );

      // Now in LOADED state — can't transition to LOADING again
      await expect(
        controller.load(
          { type: 'buffer', buffer: MOCK_BYTES },
          async () => MOCK_BYTES,
        ),
      ).rejects.toThrow();
    });

    // ── Operation lock ──────────────────────────────────────

    it('should prevent concurrent loads via operation lock', async () => {
      const { controller } = setup();

      // Start a slow load
      let resolveLoad!: (bytes: Uint8Array) => void;
      const slowLoad = new Promise<Uint8Array>((resolve) => {
        resolveLoad = resolve;
      });

      const loadPromise = controller.load(
        { type: 'buffer', buffer: MOCK_BYTES },
        async () => slowLoad,
      );

      expect(controller.isLocked).toBe(true);

      // Second load should fail while first is in progress
      await expect(
        controller.load(
          { type: 'buffer', buffer: MOCK_BYTES },
          async () => MOCK_BYTES,
        ),
      ).rejects.toThrow('another operation is in progress');

      resolveLoad(MOCK_BYTES);
      await loadPromise;
      expect(controller.isLocked).toBe(false);
    });

    // ── AbortSignal ─────────────────────────────────────────

    it('should abort load when signal is already aborted', async () => {
      const { controller } = setup();
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        controller.load(
          { type: 'buffer', buffer: MOCK_BYTES },
          async () => MOCK_BYTES,
          abortController.signal,
        ),
      ).rejects.toThrow('Load aborted');

      expect(controller.state).toBe(DocumentState.IDLE);
      expect(controller.isLocked).toBe(false);
    });
  });

  describe('rendering lifecycle', () => {
    it('should transition LOADED → RENDERING → READY', async () => {
      const { controller } = setup();
      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);

      controller.markRendering(1);
      expect(controller.state).toBe(DocumentState.RENDERING);

      controller.markRendered(1, {} as CanvasTarget);
      expect(controller.state).toBe(DocumentState.READY);
    });

    it('should throw on markRendering from IDLE state', () => {
      const { controller } = setup();
      expect(() => controller.markRendering(1)).toThrow(InvalidStateError);
    });

    it('should emit page:rendering and page:rendered events', async () => {
      const { controller, events } = setup();
      const renderingListener = vi.fn();
      const renderedListener = vi.fn();
      events.on('page:rendering', renderingListener);
      events.on('page:rendered', renderedListener);

      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);
      controller.markRendering(1);
      const canvas = {} as CanvasTarget;
      controller.markRendered(1, canvas);

      expect(renderingListener).toHaveBeenCalledWith({ pageNumber: 1 });
      expect(renderedListener).toHaveBeenCalledWith({ pageNumber: 1, canvas });
    });
  });

  describe('updateBytes()', () => {
    it('should transition READY → MODIFIED when bytes are updated', async () => {
      const { controller } = setup();
      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);
      controller.markRendering(1);
      controller.markRendered(1, {} as CanvasTarget);
      expect(controller.state).toBe(DocumentState.READY);

      const newBytes = new Uint8Array([1, 2, 3]);
      controller.updateBytes(newBytes);
      expect(controller.state).toBe(DocumentState.MODIFIED);
      expect(controller.currentBytes).toBe(newBytes);
    });

    it('should not change state when updating bytes in LOADED state', async () => {
      const { controller } = setup();
      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);
      expect(controller.state).toBe(DocumentState.LOADED);

      controller.updateBytes(new Uint8Array([9, 9]));
      expect(controller.state).toBe(DocumentState.LOADED);
    });

    it('should throw InvalidStateError when updating bytes from IDLE state', () => {
      const { controller } = setup();
      expect(() => controller.updateBytes(new Uint8Array([1]))).toThrow(InvalidStateError);
    });
  });

  describe('export()', () => {
    it('should transition LOADED → EXPORTING → READY', async () => {
      const { controller, events } = setup();
      const exportedListener = vi.fn();
      events.on('document:exported', exportedListener);

      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);

      const exportedBytes = new Uint8Array([10, 20]);
      const result = await controller.export(async () => exportedBytes);

      expect(result).toBe(exportedBytes);
      expect(controller.state).toBe(DocumentState.READY);
      expect(controller.currentBytes).toBe(exportedBytes);
      expect(exportedListener).toHaveBeenCalledWith({ bytes: exportedBytes });
    });

    it('should recover to LOADED on export failure', async () => {
      const { controller, events } = setup();
      const errorListener = vi.fn();
      events.on('document:error', errorListener);

      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);

      await expect(
        controller.export(async () => { throw new Error('serialize failed'); }),
      ).rejects.toThrow('serialize failed');

      expect(controller.state).toBe(DocumentState.LOADED);
      expect(controller.isLocked).toBe(false);
      expect(errorListener).toHaveBeenCalledOnce();
      expect(errorListener.mock.calls[0][0].phase).toBe('exporting');
    });

    it('should prevent concurrent export via operation lock', async () => {
      const { controller } = setup();
      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);

      let resolveExport!: (bytes: Uint8Array) => void;
      const slowExport = new Promise<Uint8Array>((resolve) => {
        resolveExport = resolve;
      });

      const exportPromise = controller.export(async () => slowExport);
      expect(controller.isLocked).toBe(true);

      await expect(
        controller.export(async () => MOCK_BYTES),
      ).rejects.toThrow('another operation is in progress');

      resolveExport(MOCK_BYTES);
      await exportPromise;
      expect(controller.isLocked).toBe(false);
    });

    it('should abort export when signal is already aborted', async () => {
      const { controller } = setup();
      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);

      const abortController = new AbortController();
      abortController.abort();

      await expect(
        controller.export(async () => MOCK_BYTES, abortController.signal),
      ).rejects.toThrow('Export aborted');

      expect(controller.state).toBe(DocumentState.LOADED);
      expect(controller.isLocked).toBe(false);
    });
  });

  describe('reset()', () => {
    it('should return to IDLE and emit document:closed', async () => {
      const { controller, events } = setup();
      const closedListener = vi.fn();
      events.on('document:closed', closedListener);

      await controller.load({ type: 'buffer', buffer: MOCK_BYTES }, async () => MOCK_BYTES);
      controller.reset();

      expect(controller.state).toBe(DocumentState.IDLE);
      expect(controller.currentBytes).toBeNull();
      expect(controller.pageCount).toBe(0);
      expect(controller.documentId).toBeNull();
      expect(controller.isLocked).toBe(false);
      expect(closedListener).toHaveBeenCalledOnce();
    });
  });

  describe('setPageCount()', () => {
    it('should update the page count', () => {
      const { controller } = setup();
      controller.setPageCount(5);
      expect(controller.pageCount).toBe(5);
    });
  });
});
