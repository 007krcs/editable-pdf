import { useState } from 'react';
import type { PageOpsPlugin } from '@docsdk/page-ops';

interface PageOpsPanelProps {
  plugin: PageOpsPlugin | null;
  pageCount: number;
}

export function PageOpsPanel({ plugin, pageCount }: PageOpsPanelProps) {
  const [targetPage, setTargetPage] = useState(1);
  const [status, setStatus] = useState('');

  const addPage = async () => {
    if (!plugin) return;
    try {
      const num = await plugin.addPage({ size: 'letter' });
      setStatus(`Added page ${num}`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const deletePage = async () => {
    if (!plugin) return;
    try {
      await plugin.deletePage(targetPage);
      setStatus(`Deleted page ${targetPage}`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const rotateCW = async () => {
    if (!plugin) return;
    try {
      await plugin.rotatePage(targetPage, 90);
      setStatus(`Rotated page ${targetPage} by 90°`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const rotateCCW = async () => {
    if (!plugin) return;
    try {
      await plugin.rotatePage(targetPage, 270);
      setStatus(`Rotated page ${targetPage} by -90°`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="sidebar-section">
      <h3>Page Operations</h3>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 13 }}>
          Page:
          <input
            type="number"
            min={1}
            max={pageCount || 1}
            value={targetPage}
            onChange={(e) => setTargetPage(Number(e.target.value))}
            style={{ width: 50, marginLeft: 4, padding: '2px 4px', fontSize: 13 }}
          />
        </label>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>of {pageCount}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        <button onClick={addPage} style={{ fontSize: 12, padding: '4px 8px' }}>Add Blank Page</button>
        <button onClick={deletePage} style={{ fontSize: 12, padding: '4px 8px', color: 'var(--danger)' }}>
          Delete Page
        </button>
        <button onClick={rotateCW} style={{ fontSize: 12, padding: '4px 8px' }}>Rotate CW</button>
        <button onClick={rotateCCW} style={{ fontSize: 12, padding: '4px 8px' }}>Rotate CCW</button>
      </div>
      {status && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{status}</div>}
    </div>
  );
}
