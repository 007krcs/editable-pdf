/**
 * A single audit log entry recording a document operation.
 */
export interface AuditLogEntry {
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Action type (e.g., 'document:loaded', 'field:changed', 'signature:placed') */
  readonly action: string;
  /** Optional user identifier (set via AuditPlugin config) */
  readonly userId?: string;
  /** Optional document identifier */
  readonly documentId?: string;
  /** Session identifier (auto-generated per AuditPlugin instance) */
  readonly sessionId: string;
  /** Action-specific details */
  readonly details?: Record<string, unknown>;
}

/**
 * Pluggable storage interface for audit log entries.
 * Implement this interface to send audit logs to a remote API, IndexedDB, etc.
 */
export interface AuditStore {
  /** Append an entry to the audit log */
  append(entry: AuditLogEntry): void | Promise<void>;
  /** Retrieve all stored entries (for inspection / export) */
  getEntries(): readonly AuditLogEntry[];
  /** Clear all stored entries */
  clear(): void;
}

/**
 * Default in-memory audit store.
 * Keeps entries in an array with a configurable max size (default 10000).
 * When the limit is reached, oldest entries are discarded (FIFO).
 */
export class InMemoryAuditStore implements AuditStore {
  private entries: AuditLogEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
  }

  append(entry: AuditLogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxSize) {
      this.entries.splice(0, this.entries.length - this.maxSize);
    }
  }

  getEntries(): readonly AuditLogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}
