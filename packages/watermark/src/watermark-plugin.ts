import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import type { TextWatermarkOptions, ImageWatermarkOptions } from './watermark-types.js';
import { applyTextWatermark, applyImageWatermark } from './watermark-renderer.js';

export class WatermarkPlugin implements DocSDKPlugin {
  readonly name = 'watermark';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['watermark'] as const;

  private context: PluginContext | null = null;

  initialize(context: PluginContext): void {
    this.context = context;
  }

  async addTextWatermark(options: TextWatermarkOptions): Promise<void> {
    const engine = this.getPdfEngine();
    const pdfDoc = engine.getBridge().getPdfLibDocument();
    await applyTextWatermark(pdfDoc, options);
    await engine.reserialize();
  }

  async addImageWatermark(options: ImageWatermarkOptions): Promise<void> {
    const engine = this.getPdfEngine();
    const pdfDoc = engine.getBridge().getPdfLibDocument();
    await applyImageWatermark(pdfDoc, options);
    await engine.reserialize();
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) throw new Error('PDFEnginePlugin is required for WatermarkPlugin');
    return engine;
  }

  async destroy(): Promise<void> {
    this.context = null;
  }
}
