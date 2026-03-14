import { useRef, type DragEvent } from 'react';

export interface SignatureData {
  imageBytes: Uint8Array | null;
  imageDataUrl: string | null;
  width: number;
  height: number;
  rotation: number;
}

interface SignatureModeProps {
  pageCount: number;
  signature: SignatureData;
  onSignatureChange: (data: Partial<SignatureData>) => void;
  status: string;
}

/** Drag data type used to identify signature drags vs. file drops. */
export const SIGNATURE_DRAG_TYPE = 'application/x-docsdk-signature';

export function SignatureMode({ pageCount, signature, onSignatureChange, status }: SignatureModeProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Create data URL for preview display
    const blob = new Blob([bytes], { type: file.type });
    const dataUrl = URL.createObjectURL(blob);

    onSignatureChange({
      imageBytes: bytes,
      imageDataUrl: dataUrl,
    });
  };

  const handleClear = () => {
    if (signature.imageDataUrl) {
      URL.revokeObjectURL(signature.imageDataUrl);
    }
    onSignatureChange({
      imageBytes: null,
      imageDataUrl: null,
    });
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const dragImgRef = useRef<HTMLImageElement>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!signature.imageBytes) return;

    // Mark this drag as a signature drag so the viewer can distinguish it from PDF file drops
    e.dataTransfer.setData(SIGNATURE_DRAG_TYPE, 'true');
    e.dataTransfer.effectAllowed = 'copy';

    // Use the original (non-rotated) image as the drag ghost
    if (dragImgRef.current) {
      e.dataTransfer.setDragImage(
        dragImgRef.current,
        signature.width / 4,
        signature.height / 4,
      );
    }
  };

  if (pageCount === 0) return null;

  return (
    <div className="sidebar-section">
      <h3>Signature</h3>
      <div className="signature-controls">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileSelect}
            style={{ fontSize: 12, flex: 1 }}
          />
          {signature.imageBytes && (
            <button onClick={handleClear} className="sig-clear-btn" title="Clear signature">
              Clear
            </button>
          )}
        </div>

        {signature.imageDataUrl && (
          <>
            <div
              className="signature-preview-container"
              draggable
              onDragStart={handleDragStart}
              style={{ cursor: 'grab' }}
            >
              <img
                ref={dragImgRef}
                src={signature.imageDataUrl}
                alt="Signature preview"
                className="signature-preview-img"
                draggable={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: 100,
                  transform: signature.rotation ? `rotate(${signature.rotation}deg)` : undefined,
                  transition: 'transform 0.2s ease',
                }}
              />
              <div className="signature-drag-hint">
                Drag onto PDF page to place
              </div>
            </div>

            <div className="signature-placement-row">
              <label>
                Width:
                <input
                  type="number"
                  min={20}
                  max={600}
                  value={signature.width}
                  onChange={(e) => onSignatureChange({ width: Number(e.target.value) })}
                />
              </label>
              <label>
                Height:
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={signature.height}
                  onChange={(e) => onSignatureChange({ height: Number(e.target.value) })}
                />
              </label>
              <label>
                Rotate:
                <select
                  value={signature.rotation}
                  onChange={(e) => onSignatureChange({ rotation: Number(e.target.value) })}
                >
                  <option value={0}>0°</option>
                  <option value={90}>90°</option>
                  <option value={180}>180°</option>
                  <option value={270}>270°</option>
                </select>
              </label>
            </div>
          </>
        )}

        {status && (
          <div style={{
            fontSize: 12,
            color: status.startsWith('Error') ? 'var(--danger)' : 'var(--success)',
            marginTop: 4,
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
