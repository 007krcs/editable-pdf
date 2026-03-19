export type AnnotationType = 'highlight' | 'underline' | 'strikethrough' | 'freehand' | 'text-note';

export interface AnnotationBase {
  readonly id: string;
  readonly type: AnnotationType;
  readonly pageNumber: number;
  readonly color: string;
  readonly opacity: number;
  readonly createdAt: string;
}

export interface TextMarkupAnnotation extends AnnotationBase {
  readonly type: 'highlight' | 'underline' | 'strikethrough';
  readonly rects: ReadonlyArray<{ x: number; y: number; width: number; height: number }>;
}

export interface FreehandAnnotation extends AnnotationBase {
  readonly type: 'freehand';
  readonly paths: ReadonlyArray<{ x: number; y: number }>;
  readonly strokeWidth: number;
}

export interface TextNoteAnnotation extends AnnotationBase {
  readonly type: 'text-note';
  readonly x: number;
  readonly y: number;
  readonly content: string;
}

export type Annotation = TextMarkupAnnotation | FreehandAnnotation | TextNoteAnnotation;

export interface AddAnnotationOptions {
  color?: string;
  opacity?: number;
}
