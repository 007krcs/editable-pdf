/**
 * Specifies where a signature image should be placed on a page.
 * Coordinates are in viewport space (top-left origin, scaled pixels).
 */
export interface SignaturePlacement {
  readonly pageNumber: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Rotation angle in degrees (0, 90, 180, 270). Default: 0 */
  readonly rotation?: number;
}

/**
 * A signature image with its raw bytes and detected format.
 */
export interface SignatureImage {
  readonly bytes: Uint8Array;
  readonly format: 'png' | 'jpeg';
}
