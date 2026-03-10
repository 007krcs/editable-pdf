/**
 * Options controlling how a PDF page is rendered.
 */
export interface RenderOptions {
  /** Scale factor (default: 1.0) */
  readonly scale?: number;
  /** Rotation in degrees. Only multiples of 90 are supported. */
  readonly rotation?: 0 | 90 | 180 | 270;
  /** Target DPI for rendering (default: 72) */
  readonly dpi?: number;
}

/**
 * Computed viewport dimensions after applying render options.
 */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly rotation: number;
}

/**
 * Canvas target for rendering operations.
 * Supports both browser and OffscreenCanvas environments.
 */
export type CanvasTarget = HTMLCanvasElement | OffscreenCanvas;
