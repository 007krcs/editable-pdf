import { describe, it, expect } from 'vitest';
import { searchInPages } from '../src/text-searcher.js';
import type { PageText } from '../src/text-types.js';

const pages: PageText[] = [
  { pageNumber: 1, text: 'Hello World this is a test document.', items: [] },
  { pageNumber: 2, text: 'Another page with Hello again and more content.', items: [] },
  { pageNumber: 3, text: 'Final page without the keyword.', items: [] },
];

describe('searchInPages', () => {
  it('finds matches across pages', () => {
    const results = searchInPages(pages, 'Hello');
    expect(results).toHaveLength(2);
    expect(results[0].pageNumber).toBe(1);
    expect(results[1].pageNumber).toBe(2);
  });

  it('case insensitive by default', () => {
    const results = searchInPages(pages, 'hello');
    expect(results).toHaveLength(2);
  });

  it('case sensitive when option set', () => {
    const results = searchInPages(pages, 'hello', { caseSensitive: true });
    expect(results).toHaveLength(0);
  });

  it('whole word matching', () => {
    const results = searchInPages(pages, 'page', { wholeWord: true });
    expect(results).toHaveLength(2); // page 2 and 3
  });

  it('respects maxResults', () => {
    const results = searchInPages(pages, 'a', { maxResults: 2 });
    expect(results).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    const results = searchInPages(pages, 'xyz');
    expect(results).toHaveLength(0);
  });

  it('provides context around matches', () => {
    const results = searchInPages(pages, 'test');
    expect(results[0].context).toContain('test');
    expect(results[0].context.length).toBeGreaterThan(4);
  });
});
