/**
 * A 2D point in coordinate space.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Width and height dimensions.
 */
export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * An axis-aligned rectangle defined by its origin and dimensions.
 */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * An inclusive page range (1-indexed).
 */
export interface PageRange {
  readonly start: number;
  readonly end: number;
}
