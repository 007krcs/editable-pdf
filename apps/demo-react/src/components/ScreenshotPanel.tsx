import { useState } from 'react';
import type { UseScreenshotReturn } from '@docsdk/react-adapter/hooks';
import type { ImageFormat } from '@docsdk/shared-types';

interface ScreenshotPanelProps {
  screenshot: UseScreenshotReturn;
  pageCount: number;
}

export function ScreenshotPanel({ screenshot, pageCount }: ScreenshotPanelProps) {
  const [page, setPage] = useState(1);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [scale, setScale] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const dataUrl = await screenshot.capturePageAsDataURL({
        pageNumber: page,
        format,
        scale,
      });
      setPreview(dataUrl);
    } catch {
      // capture failed
    } finally {
      setCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    const link = window.document.createElement('a');
    link.href = preview;
    link.download = `page-${page}.${format}`;
    link.click();
  };

  if (pageCount === 0) return null;

  return (
    <div className="sidebar-section">
      <h3>Screenshot</h3>
      <div className="screenshot-controls">
        <label>
          Page:
          <input
            type="number"
            min={1}
            max={pageCount}
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          />
        </label>
        <label>
          Format:
          <select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label>
          Scale:
          <input
            type="number"
            min={0.5}
            max={4}
            step={0.5}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" onClick={handleCapture} disabled={capturing} style={{
          padding: '6px 14px', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)',
          background: 'var(--primary)', color: 'white', cursor: 'pointer', fontSize: 13
        }}>
          {capturing ? 'Capturing...' : 'Capture'}
        </button>
        {preview && (
          <button onClick={handleDownload} style={{
            padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)', cursor: 'pointer', fontSize: 13
          }}>
            Download
          </button>
        )}
      </div>
      {preview && (
        <div className="screenshot-preview" style={{ marginTop: 12 }}>
          <img src={preview} alt={`Page ${page} screenshot`} />
        </div>
      )}
    </div>
  );
}
