import type { PageText, SearchResult, SearchOptions } from './text-types.js';

export function searchInPages(pages: readonly PageText[], query: string, options: SearchOptions = {}): SearchResult[] {
  const { caseSensitive = false, wholeWord = false, maxResults = 100 } = options;
  const results: SearchResult[] = [];

  const normalizedQuery = caseSensitive ? query : query.toLowerCase();

  for (const page of pages) {
    const text = caseSensitive ? page.text : page.text.toLowerCase();
    let startIndex = 0;

    while (startIndex < text.length && results.length < maxResults) {
      const idx = text.indexOf(normalizedQuery, startIndex);
      if (idx === -1) break;

      if (wholeWord) {
        const before = idx > 0 ? text[idx - 1] : ' ';
        const after = idx + normalizedQuery.length < text.length ? text[idx + normalizedQuery.length] : ' ';
        if (/\w/.test(before) || /\w/.test(after)) {
          startIndex = idx + 1;
          continue;
        }
      }

      const contextStart = Math.max(0, idx - 30);
      const contextEnd = Math.min(text.length, idx + normalizedQuery.length + 30);
      const context = page.text.substring(contextStart, contextEnd);

      results.push({
        pageNumber: page.pageNumber,
        index: idx,
        text: page.text.substring(idx, idx + query.length),
        context,
      });

      startIndex = idx + 1;
    }
  }

  return results;
}
