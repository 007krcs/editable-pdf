import type {
  DocSDKPlugin,
  PluginContext,
  SignaturePlacement,
  SignatureImage,
} from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { embedImage } from './image-embedder.js';
import { viewportToPdfCoords } from './placement-calculator.js';

export class SignaturePlugin implements DocSDKPlugin {
  readonly name = 'signature';
  readonly version = '0.1.0';

  private context: PluginContext | null = null;

  initialize(context: PluginContext): void {
    this.context = context;
  }

  async placeSignature(
    image: Uint8Array | SignatureImage,
    placement: SignaturePlacement,
    scale = 1.0,
  ): Promise<void> {
    const imageBytes = image instanceof Uint8Array ? image : image.bytes;
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();
    const pages = pdfDoc.getPages();

    if (placement.pageNumber < 1 || placement.pageNumber > pages.length) {
      throw new Error(`Page ${placement.pageNumber} is out of range (1-${pages.length})`);
    }

    const page = pages[placement.pageNumber - 1];
    const { height: pageHeight } = page.getSize();

    const embeddedImage = await embedImage(pdfDoc, imageBytes);
    const coords = viewportToPdfCoords(placement, pageHeight, scale);

    page.drawImage(embeddedImage, {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
    });

    // Reserialize to update rendering
    await pdfEngine.reserialize();

    this.context?.events.emit('signature:placed', {
      pageNumber: placement.pageNumber,
      bounds: {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      },
    });
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) {
      throw new Error('PDFEnginePlugin is required for SignaturePlugin');
    }
    return engine;
  }

  async destroy(): Promise<void> {
    this.context = null;
  }
}
