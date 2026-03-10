import type { DocSDKPlugin, PluginContext, RenderOptions, CanvasTarget } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { CanvasManager } from './canvas-manager.js';
import { RenderQueue } from './render-queue.js';

export class ViewerPlugin implements DocSDKPlugin {
  readonly name = 'viewer';
  readonly version = '0.1.0';

  private context: PluginContext | null = null;
  readonly canvasManager = new CanvasManager();
  readonly renderQueue = new RenderQueue();

  initialize(context: PluginContext): void {
    this.context = context;
  }

  async renderPage(
    pageNumber: number,
    canvas: CanvasTarget,
    options: RenderOptions = {},
  ): Promise<void> {
    const pdfEngine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!pdfEngine) {
      throw new Error('PDFEnginePlugin is required for ViewerPlugin');
    }
    await this.renderQueue.enqueue(pageNumber, () =>
      pdfEngine.renderPage(pageNumber, canvas, options),
    );
  }

  async destroy(): Promise<void> {
    this.renderQueue.clear();
    this.canvasManager.disposeAll();
    this.context = null;
  }
}
