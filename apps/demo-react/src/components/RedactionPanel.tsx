import { useState, useCallback } from 'react';
import type { RedactionPlugin, RedactionArea } from '@docsdk/redaction';

interface RedactionPanelProps {
  plugin: RedactionPlugin | null;
  pageCount: number;
}

export function RedactionPanel({ plugin, pageCount }: RedactionPanelProps) {
  const [page, setPage] = useState(1);
  const [x, setX] = useState(72);
  const [y, setY] = useState(700);
  const [w, setW] = useState(200);
  const [h, setH] = useState(14);
  const [pending, setPending] = useState<RedactionArea[]>([]);
  const [status, setStatus] = useState('');

  const refresh = useCallback(() => {
    if (plugin) setPending(plugin.getPendingRedactions());
  }, [plugin]);

  const markArea = () => {
    if (!plugin) return;
    plugin.markForRedaction(page, x, y, w, h, 'REDACTED');
    refresh();
    setStatus('Area marked');
  };

  const applyAll = async () => {
    if (!plugin) return;
    try {
      const count = await plugin.applyRedactions();
      refresh();
      setStatus(`${count} redaction(s) applied permanently`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="sidebar-section">
      <h3>Redaction ({pending.length} pending)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8, fontSize: 13 }}>
        <label>Page: <input type="number" min={1} max={pageCount || 1} value={page} onChange={(e) => setPage(Number(e.target.value))} style={{ width: 45, padding: '2px 4px', fontSize: 13 }} /></label>
        <label>X: <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} style={{ width: 55, padding: '2px 4px', fontSize: 13 }} /></label>
        <label>Y: <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} style={{ width: 55, padding: '2px 4px', fontSize: 13 }} /></label>
        <label>W: <input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} style={{ width: 55, padding: '2px 4px', fontSize: 13 }} /></label>
        <label>H: <input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} style={{ width: 55, padding: '2px 4px', fontSize: 13 }} /></label>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button onClick={markArea} style={{ fontSize: 12, padding: '4px 8px' }}>Mark Area</button>
        <button onClick={applyAll} className="primary" style={{ fontSize: 12, padding: '4px 8px', background: '#dc2626', borderColor: '#dc2626', color: 'white' }}>
          Apply Redactions
        </button>
      </div>
      {status && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</div>}
    </div>
  );
}
