import { useState, useCallback } from 'react';
import type { AnnotationPlugin, Annotation } from '@docsdk/annotation';

interface AnnotationPanelProps {
  plugin: AnnotationPlugin | null;
  pageCount: number;
}

export function AnnotationPanel({ plugin, pageCount }: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [page, setPage] = useState(1);
  const [color, setColor] = useState('#FFFF00');
  const [status, setStatus] = useState('');

  const refresh = useCallback(() => {
    if (plugin) setAnnotations(plugin.getAnnotations());
  }, [plugin]);

  const addHighlight = () => {
    if (!plugin) return;
    plugin.addHighlight(page, [{ x: 72, y: 700, width: 200, height: 14 }], { color });
    refresh();
    setStatus('Highlight added');
  };

  const addUnderline = () => {
    if (!plugin) return;
    plugin.addUnderline(page, [{ x: 72, y: 680, width: 200, height: 14 }], { color });
    refresh();
    setStatus('Underline added');
  };

  const addStrikethrough = () => {
    if (!plugin) return;
    plugin.addStrikethrough(page, [{ x: 72, y: 660, width: 200, height: 14 }], { color });
    refresh();
    setStatus('Strikethrough added');
  };

  const addNote = () => {
    if (!plugin) return;
    const text = window.prompt('Enter note text:');
    if (!text) return;
    plugin.addTextNote(page, 72, 640, text, { color });
    refresh();
    setStatus('Note added');
  };

  const flattenAll = async () => {
    if (!plugin) return;
    try {
      await plugin.flatten();
      refresh();
      setStatus('Annotations flattened into PDF');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const clearAll = () => {
    if (!plugin) return;
    plugin.clearAnnotations();
    refresh();
    setStatus('All annotations cleared');
  };

  return (
    <div className="sidebar-section">
      <h3>Annotations ({annotations.length})</h3>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13 }}>
          Page:
          <input
            type="number"
            min={1}
            max={pageCount || 1}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            style={{ width: 50, marginLeft: 4, padding: '2px 4px', fontSize: 13 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          Color:
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 30, height: 24, marginLeft: 4, border: 'none', cursor: 'pointer' }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        <button onClick={addHighlight} style={{ fontSize: 12, padding: '4px 8px' }}>Highlight</button>
        <button onClick={addUnderline} style={{ fontSize: 12, padding: '4px 8px' }}>Underline</button>
        <button onClick={addStrikethrough} style={{ fontSize: 12, padding: '4px 8px' }}>Strikethrough</button>
        <button onClick={addNote} style={{ fontSize: 12, padding: '4px 8px' }}>Note</button>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button onClick={flattenAll} className="primary" style={{ fontSize: 12, padding: '4px 8px' }}>
          Flatten to PDF
        </button>
        <button onClick={clearAll} style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }}>
          Clear All
        </button>
      </div>
      {status && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</div>}
    </div>
  );
}
