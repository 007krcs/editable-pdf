import type { DocSDKPlugin, PluginContext, DocSDKEventMap } from '@docsdk/shared-types';
import { InMemoryAuditStore } from './audit-store.js';
import type { AuditStore, AuditLogEntry } from './audit-store.js';

export interface AuditPluginConfig {
  /** User ID to attach to every audit entry */
  readonly userId?: string;
  /** Document ID to attach to every audit entry */
  readonly documentId?: string;
  /** Custom audit store implementation (default: InMemoryAuditStore) */
  readonly store?: AuditStore;
  /** Events to exclude from auditing (e.g., ['page:rendering', 'page:rendered']) */
  readonly excludeEvents?: readonly string[];
}

/**
 * Audit plugin that subscribes to all SDK events and records structured log entries.
 *
 * Usage:
 * ```ts
 * const sdk = await createDocumentSDK({
 *   plugins: [
 *     new AuditPlugin({ userId: 'user-123' }),
 *     new PDFEnginePlugin(),
 *     // ...
 *   ],
 * });
 *
 * // Later: retrieve audit trail
 * const audit = sdk.getPlugin<AuditPlugin>('audit');
 * console.log(audit.getEntries());
 * ```
 */
export class AuditPlugin implements DocSDKPlugin {
  readonly name = 'audit';
  readonly version = '0.1.0';
  readonly capabilities = ['audit', 'compliance'] as const;

  private context: PluginContext | null = null;
  private store: AuditStore;
  private userId?: string;
  private documentId?: string;
  private sessionId: string;
  private excludeEvents: ReadonlySet<string>;
  private unsubscribers: Array<() => void> = [];

  constructor(config: AuditPluginConfig = {}) {
    this.store = config.store ?? new InMemoryAuditStore();
    this.userId = config.userId;
    this.documentId = config.documentId;
    this.sessionId = generateSessionId();
    this.excludeEvents = new Set(config.excludeEvents ?? []);
  }

  initialize(context: PluginContext): void {
    this.context = context;

    // Subscribe to all known SDK events
    const events: Array<keyof DocSDKEventMap> = [
      'document:loading',
      'document:loaded',
      'document:error',
      'document:exporting',
      'document:exported',
      'document:closed',
      'document:detected',
      'page:rendering',
      'page:rendered',
      'fields:detected',
      'field:changed',
      'signature:placed',
      'validation:result',
    ];

    for (const eventName of events) {
      if (this.excludeEvents.has(eventName)) continue;

      const unsub = context.events.on(eventName, (payload: unknown) => {
        this.recordEntry(eventName, payload);
      });
      this.unsubscribers.push(unsub);
    }
  }

  /** Get all audit log entries */
  getEntries(): readonly AuditLogEntry[] {
    return this.store.getEntries();
  }

  /** Clear the audit log */
  clearEntries(): void {
    this.store.clear();
  }

  /** Get the current session ID */
  getSessionId(): string {
    return this.sessionId;
  }

  /** Update user and document identifiers */
  setIdentifiers(opts: { userId?: string; documentId?: string }): void {
    if (opts.userId !== undefined) this.userId = opts.userId;
    if (opts.documentId !== undefined) this.documentId = opts.documentId;
  }

  private recordEntry(action: string, payload: unknown): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: this.userId,
      documentId: this.documentId,
      sessionId: this.sessionId,
      details: sanitizePayload(payload),
    };
    this.store.append(entry);

    // Also emit the audit:entry event for real-time consumers
    this.context?.events.emit('audit:entry' as any, { entry } as any);
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.context = null;
  }
}

/**
 * Generate a unique session identifier.
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `audit-${timestamp}-${random}`;
}

/**
 * Sanitize event payloads to produce JSON-safe audit details.
 * Strips Uint8Array/ArrayBuffer (too large), converts errors to strings.
 */
function sanitizePayload(payload: unknown): Record<string, unknown> | undefined {
  if (payload == null || typeof payload !== 'object') return undefined;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
      result[key] = `[binary ${value instanceof Uint8Array ? value.length : value.byteLength} bytes]`;
    } else if (value instanceof Error) {
      result[key] = { name: value.name, message: value.message };
    } else if (typeof value === 'object' && value !== null) {
      // Shallow copy to avoid deep nesting / circular refs
      result[key] = String(value);
    } else {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
