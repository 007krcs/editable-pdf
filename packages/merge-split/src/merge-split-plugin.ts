import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { mergePdfs, splitPdf, extractPages } from './merge-operations.js';

export class MergeSplitPlugin implements DocSDKPlugin {
  readonly name = 'merge-split';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['merge', 'split'] as const;

  private context: PluginContext | null = null;

  initialize(context: PluginContext): void {
    this.context = context;
  }

  async mergeWith(otherPdfBytes: Uint8Array[]): Promise<void> {
    const engine = this.getPdfEngine();
    const currentBytes = this.context?.documentController.currentBytes;
    if (!currentBytes) throw new Error('No document loaded');

    const allBytes = [currentBytes, ...otherPdfBytes];
    const merged = await mergePdfs(allBytes);
    const bridge = engine.getBridge();
    await bridge.initialize(merged);
    this.context?.documentController.updateBytes(merged);
    this.context?.documentController.setPageCount(bridge.getPageCount());
  }

  async mergePdfs(pdfBytesList: Uint8Array[]): Promise<Uint8Array> {
    return mergePdfs(pdfBytesList);
  }

  async split(ranges: Array<{ start: number; end: number }>): Promise<Uint8Array[]> {
    const currentBytes = this.context?.documentController.currentBytes;
    if (!currentBytes) throw new Error('No document loaded');
    return splitPdf(currentBytes, ranges);
  }

  async extractPages(pageNumbers: number[]): Promise<Uint8Array> {
    const currentBytes = this.context?.documentController.currentBytes;
    if (!currentBytes) throw new Error('No document loaded');
    return extractPages(currentBytes, pageNumbers);
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) throw new Error('PDFEnginePlugin is required for MergeSplitPlugin');
    return engine;
  }

  async destroy(): Promise<void> {
    this.context = null;
  }
}
