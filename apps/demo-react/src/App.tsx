import { useRef, useState, useEffect, useCallback } from 'react';
import { createDocumentSDK } from '@docsdk/core';
import type { DocumentSDK } from '@docsdk/shared-types';
import { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { FormEnginePlugin } from '@docsdk/form-engine';
import { ScreenshotPlugin } from '@docsdk/screenshot';
import { SignaturePlugin } from '@docsdk/signature';
import { ValidationPlugin } from '@docsdk/validation';
import { DetectionPlugin } from '@docsdk/detection';
import { DocSDKProvider } from '@docsdk/react-adapter/components';
import {
  useDocument,
  useFormFields,
  useViewer,
  useValidation,
  useScreenshot,
  useDetection,
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
};

function AppContent({ sdk }: { sdk: DocumentSDK }) {
  const doc = useDocument();
  const { fields, setFieldValue } = useFormFields();
  const { validate, errors, isValid } = useValidation();
  const screenshot = useScreenshot();
  const { fileType, metadata } = useDetection();
  const viewerRef = useRef<HTMLDivElement>(null);
  const { scale, setScale } = useViewer(viewerRef);

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

  // ── Signature drop handler ──────────────────────────────────
  const handleSignatureDrop = useCallback(
    async (info: SignatureDropInfo) => {
      if (!signature.imageBytes) {
        setSigStatus('Error: No signature image loaded');
        return;
      }

      try {
        const sigPlugin = sdk.getPlugin<SignaturePlugin>('signature');
        await sigPlugin.placeSignature(
          signature.imageBytes,
          {
            pageNumber: info.pageNumber,
            x: info.x,
            y: info.y,
            width: signature.width,
            height: signature.height,
          },
          scale,
        );
        setSigStatus(`Placed on page ${info.pageNumber}`);
      } catch (err) {
        setSigStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [sdk, signature.imageBytes, signature.width, signature.height, scale],
  );

  return (
    <div className="app">
      <div className="header">
        <h1>DocSDK Demo</h1>
        <span className="header-status">
          State: <strong>{doc.state}</strong> | Pages: {doc.pageCount}
        </span>
        {doc.error && (
          <span style={{ color: 'var(--danger)', fontSize: 13 }}>
            Error: {doc.error.message}
          </span>
        )}
      </div>

      <Toolbar
        document={doc}
        scale={scale}
        onScaleChange={setScale}
        onValidate={validate}
      />

      <ValidationErrors errors={errors} isValid={isValid} />

      <div className="main">
        <PDFViewerPanel
          viewerRef={viewerRef}
          onFileDrop={handleFileDrop}
          onSignatureDrop={handleSignatureDrop}
        />

        <div className="sidebar">
          <DocumentInfo fileType={fileType} metadata={metadata} />
          <FormFieldPanel fields={fields} onFieldChange={setFieldValue} />
          <ScreenshotPanel screenshot={screenshot} pageCount={doc.pageCount} />
          <SignatureMode
            pageCount={doc.pageCount}
            signature={signature}
            onSignatureChange={handleSignatureChange}
            status={sigStatus}
          />
        </div>
      </div>
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

  if (!sdk) return <div className="loading">Initializing DocSDK...</div>;

  return (
    <DocSDKProvider sdk={sdk}>
      <AppContent sdk={sdk} />
    </DocSDKProvider>
  );
}
