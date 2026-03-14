import type {
  DocSDKPlugin,
  PluginContext,
  DocumentSource,
  RenderOptions,
  CanvasTarget,
} from '@docsdk/shared-types';
import { PDFDocumentBridge } from './pdf-document-bridge.js';
import { loadPdfBytes } from './pdf-loader.js';
import { renderPage } from './pdf-renderer.js';
import { setupWorker } from './worker-setup.js';

export interface PDFEngineConfig {
  workerSrc?: string;
}

export class PDFEnginePlugin implements DocSDKPlugin {
  readonly name = 'pdf-engine';
  readonly version = '0.1.0';

  private context: PluginContext | null = null;
  private bridge = new PDFDocumentBridge();
  private config: PDFEngineConfig;

  constructor(config: PDFEngineConfig = {}) {
    this.config = config;
  }

  initialize(context: PluginContext): void {
    this.context = context;
    setupWorker(this.config.workerSrc);
  }

  /**
   * Load raw document bytes from any source type.
   * Called by createDocumentSDK() via duck-typing.
   * Runs security validation (if SecurityPlugin is registered), then
   * initializes the pdf-lib / pdfjs-dist bridge and sets the page count.
   */
  async loadBytes(source: DocumentSource): Promise<Uint8Array> {
    const bytes = await loadPdfBytes(source);

    // Run security validation if the security plugin is registered
    const securityPlugin = this.context?.getPlugin<DocSDKPlugin & { validate(b: Uint8Array): void }>('security');
    if (securityPlugin && typeof securityPlugin.validate === 'function') {
      securityPlugin.validate(bytes);
    }

    await this.bridge.initialize(bytes);
    this.context?.documentController.setPageCount(this.bridge.getPageCount());
    return bytes;
  }

  async renderPage(
    pageNumber: number,
    canvas: CanvasTarget,
    options: RenderOptions = {},
  ): Promise<void> {
    const controller = this.context?.documentController as
      | (PluginContext['documentController'] & {
          markRendering?(p: number): void;
          markRendered?(p: number, c: CanvasTarget): void;
        })
      | undefined;

    controller?.markRendering?.(pageNumber);

    const pdfjsDoc = this.bridge.getPdfjsDocument();
    await renderPage(pdfjsDoc, pageNumber, canvas, options);

    controller?.markRendered?.(pageNumber, canvas);
  }

  async reserialize(): Promise<Uint8Array> {
    const newBytes = await this.bridge.reserialize();
    this.context?.documentController.updateBytes(newBytes);
    return newBytes;
  }

  async serializeDocument(): Promise<Uint8Array> {
    return this.bridge.getPdfLibDocument().save().then((b) => new Uint8Array(b));
  }

  getBridge(): PDFDocumentBridge {
    return this.bridge;
  }

  async destroy(): Promise<void> {
    await this.bridge.destroy();
    this.context = null;
  }
}
