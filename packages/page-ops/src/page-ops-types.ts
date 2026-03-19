export interface PageInfo {
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export type PageSize = 'letter' | 'a4' | 'legal' | 'custom';

export interface AddPageOptions {
  readonly size?: PageSize;
  readonly width?: number;
  readonly height?: number;
  readonly insertAt?: number;
}

export const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
  legal: { width: 612, height: 1008 },
};
