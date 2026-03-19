import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import type { Annotation, AnnotationType, AddAnnotationOptions, TextMarkupAnnotation, FreehandAnnotation, TextNoteAnnotation } from './annotation-types.js';
import { renderAnnotation } from './annotation-renderer.js';

let idCounter = 0;
function generateId(): string {
  return `ann_${Date.now()}_${++idCounter}`;
}

export class AnnotationPlugin implements DocSDKPlugin {
  readonly name = 'annotation';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['annotations'] as const;

  private context: PluginContext | null = null;
  private annotations: Map<string, Annotation> = new Map();

  initialize(context: PluginContext): void {
    this.context = context;
    context.events.on('document:closed', () => {
      this.annotations.clear();
    });
  }

  addHighlight(
    pageNumber: number,
    rects: Array<{ x: number; y: number; width: number; height: number }>,
    options: AddAnnotationOptions = {},
  ): TextMarkupAnnotation {
    const ann: TextMarkupAnnotation = {
      id: generateId(),
      type: 'highlight',
      pageNumber,
      rects,
      color: options.color ?? '#FFFF00',
      opacity: options.opacity ?? 0.35,
      createdAt: new Date().toISOString(),
    };
    this.annotations.set(ann.id, ann);
    return ann;
  }

  addUnderline(
    pageNumber: number,
    rects: Array<{ x: number; y: number; width: number; height: number }>,
    options: AddAnnotationOptions = {},
  ): TextMarkupAnnotation {
    const ann: TextMarkupAnnotation = {
      id: generateId(),
      type: 'underline',
      pageNumber,
      rects,
      color: options.color ?? '#0000FF',
      opacity: options.opacity ?? 0.8,
      createdAt: new Date().toISOString(),
    };
    this.annotations.set(ann.id, ann);
    return ann;
  }

  addStrikethrough(
    pageNumber: number,
    rects: Array<{ x: number; y: number; width: number; height: number }>,
    options: AddAnnotationOptions = {},
  ): TextMarkupAnnotation {
    const ann: TextMarkupAnnotation = {
      id: generateId(),
      type: 'strikethrough',
      pageNumber,
      rects,
      color: options.color ?? '#FF0000',
      opacity: options.opacity ?? 0.8,
      createdAt: new Date().toISOString(),
    };
    this.annotations.set(ann.id, ann);
    return ann;
  }

  addFreehand(
    pageNumber: number,
    paths: Array<{ x: number; y: number }>,
    options: AddAnnotationOptions & { strokeWidth?: number } = {},
  ): FreehandAnnotation {
    const ann: FreehandAnnotation = {
      id: generateId(),
      type: 'freehand',
      pageNumber,
      paths,
      strokeWidth: options.strokeWidth ?? 2,
      color: options.color ?? '#000000',
      opacity: options.opacity ?? 1,
      createdAt: new Date().toISOString(),
    };
    this.annotations.set(ann.id, ann);
    return ann;
  }

  addTextNote(
    pageNumber: number,
    x: number,
    y: number,
    content: string,
    options: AddAnnotationOptions = {},
  ): TextNoteAnnotation {
    const ann: TextNoteAnnotation = {
      id: generateId(),
      type: 'text-note',
      pageNumber,
      x,
      y,
      content,
      color: options.color ?? '#FFD700',
      opacity: options.opacity ?? 1,
      createdAt: new Date().toISOString(),
    };
    this.annotations.set(ann.id, ann);
    return ann;
  }

  removeAnnotation(id: string): boolean {
    return this.annotations.delete(id);
  }

  getAnnotations(pageNumber?: number): Annotation[] {
    const all = Array.from(this.annotations.values());
    if (pageNumber !== undefined) {
      return all.filter((a) => a.pageNumber === pageNumber);
    }
    return all;
  }

  getAnnotation(id: string): Annotation | undefined {
    return this.annotations.get(id);
  }

  clearAnnotations(pageNumber?: number): void {
    if (pageNumber !== undefined) {
      for (const [id, ann] of this.annotations) {
        if (ann.pageNumber === pageNumber) this.annotations.delete(id);
      }
    } else {
      this.annotations.clear();
    }
  }

  async flatten(): Promise<void> {
    const pdfEngine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!pdfEngine) throw new Error('PDFEnginePlugin is required');

    const bridge = pdfEngine.getBridge();
    const pdfDoc = bridge.getPdfLibDocument();
    const pages = pdfDoc.getPages();

    for (const ann of this.annotations.values()) {
      const page = pages[ann.pageNumber - 1];
      if (!page) continue;
      await renderAnnotation(pdfDoc, page, ann);
    }

    await pdfEngine.reserialize();
    this.annotations.clear();
  }

  async destroy(): Promise<void> {
    this.annotations.clear();
    this.context = null;
  }
}
