import type { DocumentSource, DocumentHandle } from './document.js';
import type { FormFieldDescriptor, FormFieldValue } from './form.js';
import type { Rectangle } from './common.js';
import type { ValidationResult } from './validation.js';
import type { FileTypeInfo, DocumentMetadata } from './detection.js';
import type { CanvasTarget } from './rendering.js';

/**
 * Structured audit log entry for compliance tracking.
 */
export interface AuditLogEntry {
  /** ISO 8601 timestamp of when the action occurred. */
  readonly timestamp: string;
  /** Identifier for the action performed (e.g., 'field:changed', 'document:exported'). */
  readonly action: string;
  /** Optional user identifier for attribution. */
  readonly userId?: string;
  /** Optional document identifier for cross-referencing. */
  readonly documentId?: string;
  /** Session identifier grouping related audit entries. */
  readonly sessionId: string;
  /** Optional arbitrary metadata attached to the log entry. */
  readonly details?: Record<string, unknown>;
}

/**
 * Complete map of all SDK events.
 * Each key is an event name, each value is the payload type.
 * All plugins and consumers subscribe through this typed contract.
 */
export interface DocSDKEventMap {
  // ── Document lifecycle ──────────────────────────────────
  /** Fired when a document source begins loading. */
  'document:loading': { readonly source: DocumentSource };
  /** Fired after the document has been successfully loaded and parsed. */
  'document:loaded': { readonly document: DocumentHandle; readonly pageCount: number };
  /** Fired when an error occurs during any document lifecycle phase. */
  'document:error': { readonly error: Error; readonly phase: string };
  /** Fired when document export begins. */
  'document:exporting': Record<string, never>;
  /** Fired after the document has been serialized to bytes. */
  'document:exported': { readonly bytes: Uint8Array };
  /** Fired when the document is closed and resources are released. */
  'document:closed': Record<string, never>;
  /** Fired to report incremental progress during long-running operations. */
  'document:progress': { readonly phase: string; readonly percent: number };

  // ── Detection ───────────────────────────────────────────
  /** Fired when the file type and metadata of a document have been identified. */
  'document:detected': { readonly fileType: FileTypeInfo; readonly metadata: DocumentMetadata };

  // ── Rendering ───────────────────────────────────────────
  /** Fired when a page begins rendering to a canvas target. */
  'page:rendering': { readonly pageNumber: number };
  /** Fired after a page has finished rendering. */
  'page:rendered': { readonly pageNumber: number; readonly canvas: CanvasTarget };

  // ── Form fields ─────────────────────────────────────────
  /** Fired when form fields are discovered in the document. */
  'fields:detected': { readonly fields: readonly FormFieldDescriptor[] };
  /** Fired when a form field value changes, carrying the previous and new values. */
  'field:changed': {
    readonly fieldName: string;
    readonly oldValue: FormFieldValue;
    readonly newValue: FormFieldValue;
  };

  // ── Signatures ──────────────────────────────────────────
  /** Fired when a signature image is placed on a page. */
  'signature:placed': { readonly pageNumber: number; readonly bounds: Rectangle };

  // ── Validation ──────────────────────────────────────────
  /** Fired when field or document validation completes with pass/fail results. */
  'validation:result': ValidationResult;

  // ── Security ────────────────────────────────────────────
  /** Fired when a security check (e.g., content validation or signature verification) fails. */
  'security:validation-failed': { readonly error: Error; readonly code: string };

  // ── Audit ───────────────────────────────────────────────
  /** Fired when a structured audit log entry is recorded for compliance tracking. */
  'audit:entry': { readonly entry: AuditLogEntry };

  // ── History (Undo/Redo) ─────────────────────────────────
  /** Fired when a new operation is pushed onto the undo stack. */
  'history:pushed': { readonly description: string; readonly canUndo: boolean; readonly canRedo: boolean };
  /** Fired when an operation is undone, restoring the previous state. */
  'history:undone': { readonly description: string; readonly canUndo: boolean; readonly canRedo: boolean };
  /** Fired when a previously undone operation is reapplied. */
  'history:redone': { readonly description: string; readonly canUndo: boolean; readonly canRedo: boolean };
}

/**
 * Union type of all valid event names.
 */
export type DocSDKEventName = keyof DocSDKEventMap;
