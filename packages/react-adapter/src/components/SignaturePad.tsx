import { useRef, useCallback, useState } from 'react';
import type { SignaturePlacement } from '@docsdk/shared-types';
import type { SignaturePlugin } from '@docsdk/signature';
import { useDocSDK } from '../hooks/use-docsdk.js';

export interface SignaturePadProps {
  pageNumber: number;
  scale?: number;
  width?: number;
  height?: number;
}

export function SignaturePad({
  pageNumber,
  scale = 1.0,
  width = 200,
  height = 80,
}: SignaturePadProps) {
  const sdk = useDocSDK();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setClickPos({ x, y });
      fileInputRef.current?.click();
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.width / 2;
        const y = rect.height / 2;
        setClickPos({ x, y });
        fileInputRef.current?.click();
      }
    },
    [],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !clickPos) return;

      const bytes = new Uint8Array(await file.arrayBuffer());
      const signaturePlugin = sdk.getPlugin<SignaturePlugin>('signature');

      const placement: SignaturePlacement = {
        pageNumber,
        x: clickPos.x,
        y: clickPos.y,
        width,
        height,
      };

      await signaturePlugin.placeSignature(bytes, placement, scale);
      setClickPos(null);
      e.target.value = '';
    },
    [sdk, clickPos, pageNumber, width, height, scale],
  );

  return (
    <>
      <div
        role="application"
        aria-label="Signature placement area. Click to select position for signature."
        tabIndex={0}
        onClick={handleCanvasClick}
        onKeyDown={handleKeyDown}
        style={{
          cursor: 'crosshair',
          position: 'absolute',
          inset: 0,
        }}
        title="Click to place signature"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        aria-label="Upload signature image"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}
