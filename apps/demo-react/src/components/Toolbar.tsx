import { useState } from 'react';
import type { UseDocumentReturn } from '@docsdk/react-adapter/hooks';

interface ToolbarProps {
  document: UseDocumentReturn;
  scale: number;
  onScaleChange: (scale: number) => void;
  onValidate: () => void;
}

export function Toolbar({ document: doc, scale, onScaleChange, onValidate }: ToolbarProps) {
  const { state, load, exportPdf } = doc;
  const [url, setUrl] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await load({ type: 'file', file });
  };

  const handleExport = async () => {
    const bytes = await exportPdf();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = window.document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'filled-form.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleUrlLoad = async () => {
    if (!url.trim()) return;
    await load({ type: 'url', url: url.trim() });
  };

  const disabled = state === 'IDLE';

  return (
    <div className="toolbar" role="toolbar" aria-label="Document toolbar">
      <input type="file" accept=".pdf" aria-label="Upload PDF file" onChange={handleFileUpload} />
      <div className="url-input">
        <input
          type="text"
          placeholder="Load from URL..."
          aria-label="PDF URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
        />
        <button onClick={handleUrlLoad} disabled={!url.trim()} aria-label="Load from URL">
          Load
        </button>
      </div>
      <button className="primary" onClick={handleExport} disabled={disabled}>
        Export PDF
      </button>
      <button onClick={onValidate} disabled={disabled}>
        Validate
      </button>
      <div className="scale-control">
        <label htmlFor="scale-range">Scale:</label>
        <input
          id="scale-range"
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={scale}
          aria-label={`Zoom level: ${scale.toFixed(1)}x`}
          onChange={(e) => onScaleChange(Number(e.target.value))}
        />
        <span>{scale.toFixed(1)}x</span>
      </div>
    </div>
  );
}
