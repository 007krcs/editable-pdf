import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RenderOptions, CanvasTarget } from '@docsdk/shared-types';

export async function renderPage(
  pdfjsDoc: PDFDocumentProxy,
  pageNumber: number,
  canvas: CanvasTarget,
  options: RenderOptions = {},
): Promise<void> {
  if (pageNumber < 1 || pageNumber > pdfjsDoc.numPages) {
    throw new Error(`Page ${pageNumber} is out of range (1-${pdfjsDoc.numPages})`);
  }

  const page = await pdfjsDoc.getPage(pageNumber);
  const scale = options.scale ?? 1.0;
  const rotation = options.rotation ?? 0;

  const viewport = page.getViewport({ scale, rotation });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D rendering context from canvas');
  }

  const renderTask = page.render({
    canvasContext: context as object,
    viewport,
  } as never);
  await renderTask.promise;
}
