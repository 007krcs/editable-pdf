import { useRef, useState, useEffect, useCallback } from 'react';
import { createDocumentSDK } from '@docsdk/core';
import type { DocumentSDK } from '@docsdk/shared-types';
import { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { FormEnginePlugin } from '@docsdk/form-engine';
import { ScreenshotPlugin } from '@docsdk/screenshot';
import { SignaturePlugin } from '@docsdk/signature';
import { ValidationPlugin } from '@docsdk/validation';
import { DetectionPlugin } from '@docsdk/detection';
import { DocSDKProvider, ThemeProvider } from '@docsdk/react-adapter/components';
import {
  useDocument,
  useFormFields,
  useViewer,
  useValidation,
  useScreenshot,
  useDetection,
  useTheme,
  useHistory,
  useKeyboardShortcuts,
} from '@docsdk/react-adapter/hooks';

import { Toolbar } from './components/Toolbar.js';
import { PDFViewerPanel } from './components/PDFViewerPanel.js';
import type { SignatureDropInfo } from './components/PDFViewerPanel.js';
import { FormFieldPanel } from './components/FormFieldPanel.js';
import { ValidationErrors } from './components/ValidationErrors.js';
import { DocumentInfo } from './components/DocumentInfo.js';
import { ScreenshotPanel } from './components/ScreenshotPanel.js';
import { SignatureMode } from './components/SignatureMode.js';
import type { SignatureData } from './components/SignatureMode.js';
import './App.css';

const DEFAULT_SIGNATURE: SignatureData = {
  imageBytes: null,
  imageDataUrl: null,
  width: 150,
  height: 50,
  rotation: 0,
};

function AppContent({ sdk }: { sdk: DocumentSDK }) {
  const doc = useDocument();
  const { fields, setFieldValue } = useFormFields();
  const { validate, errors, isValid } = useValidation();
  const screenshot = useScreenshot();
  const { fileType, metadata } = useDetection();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { undo, redo } = useHistory();
  const viewerRef = useRef<HTMLDivElement>(null);
  const { scale, setScale } = useViewer(viewerRef);

  // ── Keyboard shortcuts ────────────────────────────────────
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'mod+z', handler: undo, description: 'Undo' },
      { key: 'mod+shift+z', handler: redo, description: 'Redo' },
      { key: 'mod+y', handler: redo, description: 'Redo' },
    ],
  });

  // ── Lifted signature state ──────────────────────────────────
  const [signature, setSignature] = useState<SignatureData>(DEFAULT_SIGNATURE);
  const [sigStatus, setSigStatus] = useState('');

  const handleSignatureChange = useCallback((patch: Partial<SignatureData>) => {
    setSignature((prev) => ({ ...prev, ...patch }));
    setSigStatus('');
  }, []);

  const handleFileDrop = useCallback(
    (file: File) => {
      doc.load({ type: 'file', file });
    },
    [doc],
  );

  // ── Rotate image bytes on a canvas ─────────────────────────
  const rotateImageBytes = useCallback(
    (bytes: Uint8Array, deg: number): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        if (deg === 0) {
          resolve(bytes);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const swap = deg === 90 || deg === 270;
          const w = swap ? img.height : img.width;
          const h = swap ? img.width : img.height;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.translate(w / 2, h / 2);
          ctx.rotate((deg * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Failed to rotate image')); return; }
            blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('Failed to load image for rotation'));
        img.src = URL.createObjectURL(new Blob([bytes]));
      });
    },
    [],
  );

  // ── Signature drop handler ──────────────────────────────────
  const handleSignatureDrop = useCallback(
    async (info: SignatureDropInfo) => {
      if (!signature.imageBytes) {
        setSigStatus('Error: No signature image loaded');
        return;
      }

      try {
        const sigPlugin = sdk.getPlugin<SignaturePlugin>('signature');
        // Pre-rotate the image bytes so the embedded image is already rotated
        const finalBytes = await rotateImageBytes(signature.imageBytes, signature.rotation);
        const finalWidth = (signature.rotation === 90 || signature.rotation === 270)
          ? signature.height : signature.width;
        const finalHeight = (signature.rotation === 90 || signature.rotation === 270)
          ? signature.width : signature.height;
        await sigPlugin.placeSignature(
          finalBytes,
          {
            pageNumber: info.pageNumber,
            x: info.x,
            y: info.y,
            width: finalWidth,
            height: finalHeight,
          },
          scale,
        );
        setSigStatus(`Placed on page ${info.pageNumber}`);
      } catch (err) {
        setSigStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [sdk, signature.imageBytes, signature.width, signature.height, signature.rotation, scale, rotateImageBytes],
  );

  return (
    <div className="app">
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <header className="header">
        <h1>DocSDK Demo</h1>
        <span className="header-status" aria-live="polite">
          State: <strong>{doc.state}</strong> | Pages: {doc.pageCount}
        </span>
        {doc.error && (
          <span role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
            Error: {doc.error.message}
          </span>
        )}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {resolvedTheme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </header>

      <nav aria-label="Document toolbar">
        <Toolbar
          document={doc}
          scale={scale}
          onScaleChange={setScale}
          onValidate={validate}
        />
      </nav>

      <ValidationErrors errors={errors} isValid={isValid} />

      <main id="main-content" className="main">
        <PDFViewerPanel
          viewerRef={viewerRef}
          onFileDrop={handleFileDrop}
          onSignatureDrop={handleSignatureDrop}
        />

        <aside className="sidebar" aria-label="Document tools">
          <DocumentInfo fileType={fileType} metadata={metadata} />
          <FormFieldPanel fields={fields} onFieldChange={setFieldValue} />
          <ScreenshotPanel screenshot={screenshot} pageCount={doc.pageCount} />
          <SignatureMode
            pageCount={doc.pageCount}
            signature={signature}
            onSignatureChange={handleSignatureChange}
            status={sigStatus}
          />
        </aside>
      </main>
    </div>
  );
}

export default function App() {
  const [sdk, setSdk] = useState<DocumentSDK | null>(null);

  useEffect(() => {
    createDocumentSDK({
      plugins: [
        new PDFEnginePlugin(),
        new FormEnginePlugin(),
        new ScreenshotPlugin(),
        new SignaturePlugin(),
        new ValidationPlugin(),
        new DetectionPlugin(),
      ],
    }).then(setSdk);
  }, []);

  if (!sdk) return <div className="loading" role="status" aria-live="polite">Initializing DocSDK...</div>;

  return (
    <ThemeProvider>
      <DocSDKProvider sdk={sdk}>
        <AppContent sdk={sdk} />
      </DocSDKProvider>
    </ThemeProvider>
  );
}
