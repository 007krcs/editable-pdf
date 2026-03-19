import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import type { PageInfo, AddPageOptions } from './page-ops-types.js';
import { getPageInfo, addBlankPage, deletePage, rotatePage, reorderPages } from './page-operations.js';

export class PageOpsPlugin implements DocSDKPlugin {
  readonly name = 'page-ops';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['page-manipulation'] as const;

  private context: PluginContext | null = null;

  initialize(context: PluginContext): void {
    this.context = context;
  }

  getPageInfo(): PageInfo[] {
    const pdfDoc = this.getPdfEngine().getBridge().getPdfLibDocument();
    return getPageInfo(pdfDoc);
  }

  async addPage(options?: AddPageOptions): Promise<number> {
    const engine = this.getPdfEngine();
    const pdfDoc = engine.getBridge().getPdfLibDocument();
    const pageNum = addBlankPage(pdfDoc, options);
    await engine.reserialize();
    this.context?.documentController.setPageCount(pdfDoc.getPageCount());
    return pageNum;
  }

  async deletePage(pageNumber: number): Promise<void> {
    const engine = this.getPdfEngine();
    const pdfDoc = engine.getBridge().getPdfLibDocument();
    deletePage(pdfDoc, pageNumber);
    await engine.reserialize();
    this.context?.documentController.setPageCount(pdfDoc.getPageCount());
  }

  async rotatePage(pageNumber: number, angle: number): Promise<void> {
    const engine = this.getPdfEngine();
    const pdfDoc = engine.getBridge().getPdfLibDocument();
    rotatePage(pdfDoc, pageNumber, angle);
    await engine.reserialize();
  }

  async reorderPages(newOrder: number[]): Promise<void> {
    const engine = this.getPdfEngine();
    const bridge = engine.getBridge();
    const pdfDoc = bridge.getPdfLibDocument();
    const newDoc = await reorderPages(pdfDoc, newOrder);
    const newBytes = await newDoc.save();
    await bridge.initialize(new Uint8Array(newBytes));
    this.context?.documentController.updateBytes(new Uint8Array(newBytes));
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) throw new Error('PDFEnginePlugin is required for PageOpsPlugin');
    return engine;
  }

  async destroy(): Promise<void> {
    this.context = null;
  }
}
