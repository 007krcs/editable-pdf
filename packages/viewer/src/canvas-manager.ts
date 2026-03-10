export class CanvasManager {
  private canvases = new Map<number, HTMLCanvasElement | OffscreenCanvas>();

  create(pageNumber: number, width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
    this.dispose(pageNumber);

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
    } else if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else {
      throw new Error('No canvas implementation available');
    }

    canvas.width = width;
    canvas.height = height;
    this.canvases.set(pageNumber, canvas);
    return canvas;
  }

  get(pageNumber: number): HTMLCanvasElement | OffscreenCanvas | undefined {
    return this.canvases.get(pageNumber);
  }

  resize(pageNumber: number, width: number, height: number): void {
    const canvas = this.canvases.get(pageNumber);
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  dispose(pageNumber: number): void {
    this.canvases.delete(pageNumber);
  }

  disposeAll(): void {
    this.canvases.clear();
  }

  getAll(): Map<number, HTMLCanvasElement | OffscreenCanvas> {
    return new Map(this.canvases);
  }
}
