export interface Bookmark {
  readonly title: string;
  readonly pageNumber: number;
  readonly children: readonly Bookmark[];
}

export interface BookmarkTree {
  readonly items: readonly Bookmark[];
}
