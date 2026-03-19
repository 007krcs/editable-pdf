export interface TextItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pageNumber: number;
}

export interface PageText {
  readonly pageNumber: number;
  readonly text: string;
  readonly items: readonly TextItem[];
}

export interface SearchResult {
  readonly pageNumber: number;
  readonly index: number;
  readonly text: string;
  readonly context: string;
}

export interface SearchOptions {
  readonly caseSensitive?: boolean;
  readonly wholeWord?: boolean;
  readonly maxResults?: number;
}
