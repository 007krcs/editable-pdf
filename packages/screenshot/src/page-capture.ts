import type { CanvasTarget, RenderOptions } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';

export async function capturePage(
  pdfEngine: PDFEnginePlugin,
  pageNumber: number,
  options: RenderOptions = {},
): Promise<CanvasTarget> {
  let canvas: CanvasTarget;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(1, 1);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
  } else {
    throw new Error('No canvas implementation available for screenshot capture');
  }

  await pdfEngine.renderPage(pageNumber, canvas, options);
  return canvas;
}
