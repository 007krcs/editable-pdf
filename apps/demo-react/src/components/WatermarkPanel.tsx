import { useState } from 'react';
import type { WatermarkPlugin } from '@docsdk/watermark';

interface WatermarkPanelProps {
  plugin: WatermarkPlugin | null;
}

export function WatermarkPanel({ plugin }: WatermarkPanelProps) {
  const [text, setText] = useState('DRAFT');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.3);
  const [position, setPosition] = useState<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
  const [status, setStatus] = useState('');

  const apply = async () => {
    if (!plugin || !text.trim()) return;
    try {
      await plugin.addTextWatermark({
        text: text.trim(),
        fontSize,
        opacity,
        position,
        color: '#CCCCCC',
      });
      setStatus('Watermark applied');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="sidebar-section">
      <h3>Watermark</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Watermark text..."
          style={{ padding: '4px 6px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
        />
        <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
          <label>
            Size:
            <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} min={12} max={120} style={{ width: 50, marginLeft: 4, padding: '2px 4px', fontSize: 13 }} />
          </label>
          <label>
            Opacity:
            <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: 60, marginLeft: 4 }} />
            <span>{opacity.toFixed(2)}</span>
          </label>
        </div>
        <select value={position} onChange={(e) => setPosition(e.target.value as any)} style={{ padding: '4px 6px', fontSize: 13 }}>
          <option value="center">Center</option>
          <option value="top-left">Top Left</option>
          <option value="top-right">Top Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="bottom-right">Bottom Right</option>
        </select>
      </div>
      <button onClick={apply} style={{ fontSize: 12, padding: '4px 8px' }}>Apply Watermark</button>
      {status && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{status}</div>}
    </div>
  );
}
