import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import type { PageText, SearchResult, SearchOptions } from './text-types.js';
import { extractPageText, extractAllText } from './text-extractor.js';
import { searchInPages } from './text-searcher.js';

export class TextExtractionPlugin implements DocSDKPlugin {
  readonly name = 'text-extraction';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['text-extraction', 'search'] as const;

  private context: PluginContext | null = null;
  private cachedPages: Map<number, PageText> = new Map();

  initialize(context: PluginContext): void {
    this.context = context;
    context.events.on('document:closed', () => {
      this.cachedPages.clear();
    });
    context.events.on('document:loaded', () => {
      this.cachedPages.clear();
    });
  }

  async getPageText(pageNumber: number): Promise<PageText> {
    const cached = this.cachedPages.get(pageNumber);
    if (cached) return cached;

    const pdfjsDoc = this.getPdfEngine().getBridge().getPdfjsDocument();
    const pageText = await extractPageText(pdfjsDoc, pageNumber);
    this.cachedPages.set(pageNumber, pageText);
    return pageText;
  }

  async getAllText(): Promise<PageText[]> {
    const pdfjsDoc = this.getPdfEngine().getBridge().getPdfjsDocument();
    const pages = await extractAllText(pdfjsDoc);
    for (const page of pages) {
      this.cachedPages.set(page.pageNumber, page);
    }
    return pages;
  }

  async getFullText(): Promise<string> {
    const pages = await this.getAllText();
    return pages.map((p) => p.text).join('\n\n');
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!query) return [];
    const pages = await this.getAllText();
    return searchInPages(pages, query, options);
  }

  clearCache(): void {
    this.cachedPages.clear();
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) throw new Error('PDFEnginePlugin is required for TextExtractionPlugin');
    return engine;
  }

  async destroy(): Promise<void> {
    this.cachedPages.clear();
    this.context = null;
  }
}
