export interface TextWatermarkOptions {
  readonly text: string;
  readonly fontSize?: number;
  readonly color?: string;
  readonly opacity?: number;
  readonly rotation?: number;
  readonly position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  readonly pages?: number[] | 'all';
}

export interface ImageWatermarkOptions {
  readonly imageBytes: Uint8Array;
  readonly width?: number;
  readonly height?: number;
  readonly opacity?: number;
  readonly position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  readonly pages?: number[] | 'all';
}
