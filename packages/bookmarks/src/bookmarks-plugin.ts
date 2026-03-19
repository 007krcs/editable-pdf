import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import type { Bookmark, BookmarkTree } from './bookmark-types.js';
import { readBookmarks } from './bookmark-reader.js';

export class BookmarksPlugin implements DocSDKPlugin {
  readonly name = 'bookmarks';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['bookmarks', 'outline'] as const;

  private context: PluginContext | null = null;
  private cachedBookmarks: Bookmark[] | null = null;

  initialize(context: PluginContext): void {
    this.context = context;
    context.events.on('document:loaded', () => {
      this.cachedBookmarks = null;
    });
    context.events.on('document:closed', () => {
      this.cachedBookmarks = null;
    });
  }

  async getBookmarks(): Promise<BookmarkTree> {
    if (this.cachedBookmarks) return { items: this.cachedBookmarks };

    const pdfjsDoc = this.getPdfEngine().getBridge().getPdfjsDocument();
    this.cachedBookmarks = await readBookmarks(pdfjsDoc);
    return { items: this.cachedBookmarks };
  }

  async flattenBookmarks(): Promise<Array<{ title: string; pageNumber: number; level: number }>> {
    const tree = await this.getBookmarks();
    const flat: Array<{ title: string; pageNumber: number; level: number }> = [];

    function walk(items: readonly Bookmark[], level: number) {
      for (const item of items) {
        flat.push({ title: item.title, pageNumber: item.pageNumber, level });
        walk(item.children, level + 1);
      }
    }

    walk(tree.items, 0);
    return flat;
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) throw new Error('PDFEnginePlugin is required for BookmarksPlugin');
    return engine;
  }

  async destroy(): Promise<void> {
    this.cachedBookmarks = null;
    this.context = null;
  }
}
