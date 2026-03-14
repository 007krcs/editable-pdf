// ── Geometry ──────────────────────────────────────────────
export type { Point, Dimensions, Rectangle, PageRange } from './common.js';

// ── Document lifecycle ────────────────────────────────────
export { DocumentState } from './document.js';
export type { DocumentSource, DocumentHandle } from './document.js';

// ── Form fields ───────────────────────────────────────────
export { FormFieldType } from './form.js';
export type { FormFieldValue, FormFieldDescriptor } from './form.js';

// ── Rendering ─────────────────────────────────────────────
export type { RenderOptions, Viewport, CanvasTarget } from './rendering.js';

// ── Signatures ────────────────────────────────────────────
export type { SignaturePlacement, SignatureImage } from './signature.js';

// ── Validation ────────────────────────────────────────────
export type { ValidationError, ValidationResult, ValidationRule } from './validation.js';

// ── Detection ─────────────────────────────────────────────
export type { FileTypeInfo, DocumentMetadata } from './detection.js';

// ── Screenshots ───────────────────────────────────────────
export type { ScreenshotOptions, ImageFormat } from './screenshot.js';

// ── Events ────────────────────────────────────────────────
export type { DocSDKEventMap, DocSDKEventName, AuditLogEntry } from './events.js';

// ── Plugin system ─────────────────────────────────────────
export type {
  TypedEventEmitter,
  DocumentControllerView,
  PluginContext,
  DocSDKPlugin,
  DocumentSDK,
} from './plugin.js';
