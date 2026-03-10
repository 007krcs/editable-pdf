import { useState, useRef } from 'react';
import type { SignaturePlugin } from '@docsdk/signature';
import type { DocumentSDK } from '@docsdk/shared-types';

interface SignatureModeProps {
  sdk: DocumentSDK;
  pageCount: number;
}

export function SignatureMode({ sdk, pageCount }: SignatureModeProps) {
  const [page, setPage] = useState(1);
  const [x, setX] = useState(100);
  const [y, setY] = useState(100);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(80);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePlace = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus('Select a signature image first');
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sigPlugin = sdk.getPlugin<SignaturePlugin>('signature');
      await sigPlugin.placeSignature(bytes, {
        pageNumber: page,
        x,
        y,
        width,
        height,
      });
      setStatus('Signature placed!');
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (pageCount === 0) return null;

  return (
    <div className="sidebar-section">
      <h3>Signature</h3>
      <div className="signature-controls">
        <label>
          Image: <input ref={fileRef} type="file" accept="image/png,image/jpeg" style={{ fontSize: 12 }} />
        </label>
        <div className="signature-placement-row">
          <label>Page: <input type="number" min={1} max={pageCount} value={page} onChange={(e) => setPage(Number(e.target.value))} /></label>
          <label>X: <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} /></label>
          <label>Y: <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} /></label>
        </div>
        <div className="signature-placement-row">
          <label>W: <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
          <label>H: <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} /></label>
        </div>
        <button onClick={handlePlace} style={{
          padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)', cursor: 'pointer', fontSize: 13
        }}>
          Place Signature
        </button>
        {status && <div style={{ fontSize: 12, color: status.startsWith('Error') ? 'var(--danger)' : 'var(--success)' }}>{status}</div>}
      </div>
    </div>
  );
}
