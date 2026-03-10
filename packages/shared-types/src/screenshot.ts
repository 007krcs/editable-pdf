/**
 * Options for capturing a page as an image.
 */
export interface ScreenshotOptions {
  readonly pageNumber: number;
  readonly format: ImageFormat;
  readonly quality?: number;
  readonly scale?: number;
}

/**
 * Supported image output formats.
 */
export type ImageFormat = 'png' | 'jpeg';
