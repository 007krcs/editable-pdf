import { useState } from 'react';
import type { TextExtractionPlugin, SearchResult } from '@docsdk/text-extraction';

interface SearchPanelProps {
  plugin: TextExtractionPlugin | null;
}

export function SearchPanel({ plugin }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fullText, setFullText] = useState('');
  const [showText, setShowText] = useState(false);

  const handleSearch = async () => {
    if (!plugin || !query.trim()) return;
    const res = await plugin.search(query.trim());
    setResults(res);
  };

  const handleExtractText = async () => {
    if (!plugin) return;
    const text = await plugin.getFullText();
    setFullText(text);
    setShowText(true);
  };

  const copyText = () => {
    navigator.clipboard.writeText(fullText);
  };

  return (
    <div className="sidebar-section">
      <h3>Text Search</h3>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Search text..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, padding: '4px 6px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        />
        <button onClick={handleSearch} style={{ fontSize: 12, padding: '4px 8px' }}>Search</button>
      </div>
      {results.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          <strong>{results.length} result(s)</strong>
          <ul style={{ margin: '4px 0', paddingLeft: 16, maxHeight: 120, overflow: 'auto' }}>
            {results.map((r, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                Page {r.pageNumber}: ...{r.context}...
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={handleExtractText} style={{ fontSize: 12, padding: '4px 8px' }}>Extract All Text</button>
        {showText && <button onClick={copyText} style={{ fontSize: 12, padding: '4px 8px' }}>Copy</button>}
      </div>
      {showText && (
        <pre style={{ fontSize: 11, maxHeight: 150, overflow: 'auto', background: 'var(--surface-alt)', padding: 8, borderRadius: 'var(--radius-sm)', marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {fullText || '(No text found)'}
        </pre>
      )}
    </div>
  );
}
