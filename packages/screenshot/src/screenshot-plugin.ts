import type {
  DocSDKPlugin,
  PluginContext,
  ScreenshotOptions,
} from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { capturePage } from './page-capture.js';
import { encodeCanvas, encodeCanvasToDataURL } from './image-encoder.js';

export class ScreenshotPlugin implements DocSDKPlugin {
  readonly name = 'screenshot';
  readonly version = '0.1.0';

  private context: PluginContext | null = null;

  initialize(context: PluginContext): void {
    this.context = context;
  }

  async capturePage(options: ScreenshotOptions): Promise<Uint8Array> {
    const pdfEngine = this.getPdfEngine();

    const canvas = await capturePage(pdfEngine, options.pageNumber, {
      scale: options.scale ?? 1.0,
    });

    return encodeCanvas(canvas, options.format, options.quality);
  }

  async capturePageAsDataURL(options: ScreenshotOptions): Promise<string> {
    const pdfEngine = this.getPdfEngine();

    const canvas = await capturePage(pdfEngine, options.pageNumber, {
      scale: options.scale ?? 1.0,
    });

    return await encodeCanvasToDataURL(canvas, options.format, options.quality);
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) {
      throw new Error('PDFEnginePlugin is required for ScreenshotPlugin');
    }
    return engine;
  }

  async destroy(): Promise<void> {
    this.context = null;
  }
}
