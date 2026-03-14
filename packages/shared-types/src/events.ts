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
  readonly timestamp: string;
  readonly action: string;
  readonly userId?: string;
  readonly documentId?: string;
  readonly sessionId: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Complete map of all SDK events.
 * Each key is an event name, each value is the payload type.
 * All plugins and consumers subscribe through this typed contract.
 */
export interface DocSDKEventMap {
  // ── Document lifecycle ──────────────────────────────────
  'document:loading': { readonly source: DocumentSource };
  'document:loaded': { readonly document: DocumentHandle; readonly pageCount: number };
  'document:error': { readonly error: Error; readonly phase: string };
  'document:exporting': Record<string, never>;
  'document:exported': { readonly bytes: Uint8Array };
  'document:closed': Record<string, never>;
  'document:progress': { readonly phase: string; readonly percent: number };

  // ── Detection ───────────────────────────────────────────
  'document:detected': { readonly fileType: FileTypeInfo; readonly metadata: DocumentMetadata };

  // ── Rendering ───────────────────────────────────────────
  'page:rendering': { readonly pageNumber: number };
  'page:rendered': { readonly pageNumber: number; readonly canvas: CanvasTarget };

  // ── Form fields ─────────────────────────────────────────
  'fields:detected': { readonly fields: readonly FormFieldDescriptor[] };
  'field:changed': {
    readonly fieldName: string;
    readonly oldValue: FormFieldValue;
    readonly newValue: FormFieldValue;
  };

  // ── Signatures ──────────────────────────────────────────
  'signature:placed': { readonly pageNumber: number; readonly bounds: Rectangle };

  // ── Validation ──────────────────────────────────────────
  'validation:result': ValidationResult;

  // ── Security ────────────────────────────────────────────
  'security:validation-failed': { readonly error: Error; readonly code: string };

  // ── Audit ───────────────────────────────────────────────
  'audit:entry': { readonly entry: AuditLogEntry };

  // ── History (Undo/Redo) ─────────────────────────────────
  'history:pushed': { readonly description: string; readonly canUndo: boolean; readonly canRedo: boolean };
  'history:undone': { readonly description: string; readonly canUndo: boolean; readonly canRedo: boolean };
  'history:redone': { readonly description: string; readonly canUndo: boolean; readonly canRedo: boolean };
}

/**
 * Union type of all valid event names.
 */
export type DocSDKEventName = keyof DocSDKEventMap;
