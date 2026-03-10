# DocSDK

**AI-native Document SDK** — a modular, plugin-based toolkit for building document processing applications in the browser.

DocSDK provides everything you need to load, render, edit, validate, sign, and export PDF documents through a clean, extensible architecture. Each capability is a standalone plugin that can be used independently or composed together.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Application                  │
├─────────────────────────────────────────────────────┤
│              @docsdk/react-adapter                  │
│         hooks + components for React apps           │
├──────┬──────┬──────┬──────┬──────┬──────┬───────────┤
│ pdf  │ form │valid-│signa-│screen│detec-│  viewer   │
│engine│engine│ation │ture  │ shot │tion  │           │
├──────┴──────┴──────┴──────┴──────┴──────┴───────────┤
│                   @docsdk/core                      │
│       plugin registry · event bus · lifecycle       │
├─────────────────────────────────────────────────────┤
│               @docsdk/shared-types                  │
│     TypeScript interfaces · enums · type guards     │
└─────────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---|---|
| `@docsdk/shared-types` | TypeScript interfaces, enums, and type definitions |
| `@docsdk/core` | Plugin registry, event bus, document lifecycle controller |
| `@docsdk/pdf-engine` | PDF loading, parsing, rendering (via pdf-lib + pdfjs-dist) |
| `@docsdk/form-engine` | Form field detection, reading, and writing |
| `@docsdk/validation` | Rule-based form validation with auto-validate support |
| `@docsdk/signature` | Digital signature image placement on PDF pages |
| `@docsdk/screenshot` | Page capture as PNG/JPEG with configurable scale |
| `@docsdk/detection` | File type detection and PDF metadata extraction |
| `@docsdk/viewer` | Canvas-based page rendering with viewport management |
| `@docsdk/react-adapter` | React hooks and components (`useDocument`, `useFormFields`, etc.) |

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

### Usage

```typescript
import { createDocumentSDK } from '@docsdk/core';
import { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { FormEnginePlugin } from '@docsdk/form-engine';
import { ValidationPlugin } from '@docsdk/validation';

const sdk = await createDocumentSDK({
  plugins: [
    new PDFEnginePlugin(),
    new FormEnginePlugin(),
    new ValidationPlugin({ autoValidate: true }),
  ],
});

// Load a PDF
await sdk.load({ type: 'file', file: pdfFile });

// Read form fields
const formEngine = sdk.getPlugin<FormEnginePlugin>('form-engine');
const fields = formEngine.getFields();

// Edit a field
await formEngine.writeFieldValue('email', 'user@example.com');

// Validate
const validation = sdk.getPlugin<ValidationPlugin>('validation');
const result = validation.validate();

// Export modified PDF
const bytes = await sdk.export();
```

### React Integration

```tsx
import { DocSDKProvider } from '@docsdk/react-adapter/components';
import { useDocument, useFormFields, useValidation } from '@docsdk/react-adapter/hooks';

function PDFEditor() {
  const { state, load, exportPdf } = useDocument();
  const { fields, setFieldValue } = useFormFields();
  const { validate, errors, isValid } = useValidation();

  return (
    <div>
      <input type="file" onChange={(e) => load({ type: 'file', file: e.target.files[0] })} />
      {fields.map((field) => (
        <input
          key={field.name}
          value={String(field.value ?? '')}
          onChange={(e) => setFieldValue(field.name, e.target.value)}
        />
      ))}
      <button onClick={validate}>Validate</button>
      <button onClick={exportPdf}>Export</button>
    </div>
  );
}
```

## Plugin System

Every capability in DocSDK is a plugin that implements the `DocSDKPlugin` interface:

```typescript
interface DocSDKPlugin {
  readonly name: string;
  readonly version: string;
  initialize(context: PluginContext): void | Promise<void>;
  destroy(): void | Promise<void>;
}
```

Plugins communicate through a typed event bus and can discover each other via `context.getPlugin()`. This makes the system fully composable — use only what you need.

### Built-in Events

| Event | Payload | Description |
|---|---|---|
| `document:loading` | `{}` | Document load started |
| `document:loaded` | `{ pageCount }` | Document ready for interaction |
| `document:detected` | `{ fileType, metadata }` | File type and metadata extracted |
| `fields:detected` | `{ fields }` | Form fields discovered |
| `field:changed` | `{ fieldName, value }` | A form field value was modified |
| `validation:result` | `{ valid, errors }` | Validation completed |
| `document:exported` | `{ bytes }` | PDF export finished |

### Writing a Custom Plugin

```typescript
import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';

export class WatermarkPlugin implements DocSDKPlugin {
  readonly name = 'watermark';
  readonly version = '1.0.0';
  private context: PluginContext | null = null;

  initialize(context: PluginContext) {
    this.context = context;
    context.events.on('document:loaded', () => {
      // Add watermark logic here
    });
  }

  destroy() {
    this.context = null;
  }
}
```

## Demo App

```bash
cd apps/demo-react
pnpm dev
```

Features: PDF upload (file or drag-and-drop), form field editing, validation, signature placement, page screenshots, document info display, zoom controls, and PDF export.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests (192 tests across 9 packages)
pnpm test

# Start demo app dev server
pnpm --filter demo-react dev

# Type check
pnpm -r exec tsc --noEmit
```

## Tech Stack

- **Build**: pnpm workspaces + Turborepo + tsup
- **Test**: Vitest + Testing Library + happy-dom
- **PDF**: pdf-lib (editing) + pdfjs-dist (rendering)
- **UI**: React 19 + Vite
- **CI**: GitHub Actions (Node 18/20/22)
- **Lint**: ESLint with @typescript-eslint

## Roadmap

### Near-term
- [ ] **Annotation plugin** — highlight, underline, strikethrough, and freehand drawing on pages
- [ ] **Redaction plugin** — permanently remove sensitive content from PDFs
- [ ] **Text extraction plugin** — extract structured text with position data per page
- [ ] **Page manipulation** — insert, delete, reorder, and rotate pages
- [ ] **Multi-document support** — merge/split PDFs within a single SDK instance
- [ ] **Undo/redo system** — command-based history for all document mutations

### Mid-term
- [ ] **AI-powered form filling** — auto-fill fields using LLM extraction from context documents
- [ ] **AI field detection** — detect form-like regions in non-AcroForm PDFs using vision models
- [ ] **Smart validation** — context-aware validation rules powered by LLMs (e.g., "does this address look real?")
- [ ] **Document comparison** — diff two PDF versions with visual and structural change detection
- [ ] **Template engine** — define reusable PDF templates with dynamic data binding
- [ ] **Collaborative editing** — real-time multi-user form filling via CRDT-based sync

### Long-term
- [ ] **Framework adapters** — Vue, Svelte, Angular, and Solid adapters alongside React
- [ ] **Server-side rendering** — Node.js/Deno support for headless PDF processing pipelines
- [ ] **WASM PDF engine** — replace pdfjs-dist with a Rust/WASM renderer for 10x performance
- [ ] **Digital signatures (cryptographic)** — PKCS#7/CAdES signing with certificate chain validation
- [ ] **Accessibility checker** — validate PDF/UA compliance and suggest fixes
- [ ] **Plugin marketplace** — discover, install, and compose community plugins
- [ ] **Document intelligence API** — hosted service for OCR, classification, and data extraction at scale

## License

MIT
