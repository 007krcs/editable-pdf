import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { RenderOptions, CanvasTarget } from '@docsdk/shared-types';

/**
 * LRU cache for rendered page bitmaps.
 * Key: `${pageNumber}@${scale}x${rotation}` → cached ImageBitmap or ImageData.
 */
class RenderCache {
  private cache = new Map<string, ImageData>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  private key(page: number, scale: number, rotation: number): string {
    return `${page}@${scale}x${rotation}`;
  }

  get(page: number, scale: number, rotation: number): ImageData | undefined {
    const k = this.key(page, scale, rotation);
    const entry = this.cache.get(k);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(k);
      this.cache.set(k, entry);
    }
    return entry;
  }

  set(page: number, scale: number, rotation: number, data: ImageData): void {
    const k = this.key(page, scale, rotation);
    this.cache.delete(k);
    if (this.cache.size >= this.maxSize) {
      // Evict oldest (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(k, data);
  }

  invalidate(): void {
    this.cache.clear();
  }
}

const renderCache = new RenderCache();

export async function renderPage(
  pdfjsDoc: PDFDocumentProxy,
  pageNumber: number,
  canvas: CanvasTarget,
  options: RenderOptions = {},
): Promise<void> {
  if (pageNumber < 1 || pageNumber > pdfjsDoc.numPages) {
    throw new Error(`Page ${pageNumber} is out of range (1-${pdfjsDoc.numPages})`);
  }

  const scale = options.scale ?? 1.0;
  const rotation = options.rotation ?? 0;

  // Check cache first
  const cached = renderCache.get(pageNumber, scale, rotation);
  if (cached) {
    canvas.width = cached.width;
    canvas.height = cached.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context from canvas');
    }
    context.putImageData(cached, 0, 0);
    return;
  }

  const page = await pdfjsDoc.getPage(pageNumber);

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

  // Store result in cache
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  renderCache.set(pageNumber, scale, rotation, imageData);
}

export function invalidateRenderCache(): void {
  renderCache.invalidate();
}
