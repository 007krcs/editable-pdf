import { useState } from 'react';
import type { MergeSplitPlugin } from '@docsdk/merge-split';

interface MergeSplitPanelProps {
  plugin: MergeSplitPlugin | null;
  pageCount: number;
}

export function MergeSplitPanel({ plugin, pageCount }: MergeSplitPanelProps) {
  const [status, setStatus] = useState('');
  const [extractPages, setExtractPages] = useState('1');

  const handleMergeFile = async () => {
    if (!plugin) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        await plugin.mergeWith([bytes]);
        setStatus(`Merged with ${file.name}`);
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  };

  const handleExtract = async () => {
    if (!plugin) return;
    try {
      const pages = extractPages.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      if (pages.length === 0) { setStatus('Enter page numbers'); return; }
      const bytes = await plugin.extractPages(pages);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `extracted-pages.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus(`Extracted pages ${pages.join(', ')}`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSplitHalf = async () => {
    if (!plugin || pageCount < 2) return;
    try {
      const mid = Math.ceil(pageCount / 2);
      const parts = await plugin.split([
        { start: 1, end: mid },
        { start: mid + 1, end: pageCount },
      ]);
      for (let i = 0; i < parts.length; i++) {
        const blob = new Blob([parts[i]], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `split-part-${i + 1}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
      setStatus(`Split into ${parts.length} parts`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="sidebar-section">
      <h3>Merge / Split</h3>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={handleMergeFile} style={{ fontSize: 12, padding: '4px 8px' }}>Merge PDF...</button>
        <button onClick={handleSplitHalf} disabled={pageCount < 2} style={{ fontSize: 12, padding: '4px 8px' }}>
          Split in Half
        </button>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Pages: 1,3,5"
          value={extractPages}
          onChange={(e) => setExtractPages(e.target.value)}
          style={{ flex: 1, padding: '4px 6px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        />
        <button onClick={handleExtract} style={{ fontSize: 12, padding: '4px 8px' }}>Extract</button>
      </div>
      {status && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</div>}
    </div>
  );
}
