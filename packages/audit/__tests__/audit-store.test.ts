import { describe, it, expect } from 'vitest';
import { InMemoryAuditStore } from '../src/audit-store.js';
import type { AuditLogEntry } from '../src/audit-store.js';

function createEntry(action = 'test:action', overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    sessionId: 'test-session',
    ...overrides,
  };
}

describe('InMemoryAuditStore', () => {
  it('should store and retrieve entries', () => {
    const store = new InMemoryAuditStore();
    const entry = createEntry();
    store.append(entry);

    const entries = store.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(entry);
  });

  it('should return a defensive copy of entries', () => {
    const store = new InMemoryAuditStore();
    store.append(createEntry('a'));
    store.append(createEntry('b'));

    const entries1 = store.getEntries();
    const entries2 = store.getEntries();
    expect(entries1).not.toBe(entries2);
    expect(entries1).toEqual(entries2);
  });

  it('should respect max size limit (FIFO eviction)', () => {
    const store = new InMemoryAuditStore(3);
    store.append(createEntry('first'));
    store.append(createEntry('second'));
    store.append(createEntry('third'));
    store.append(createEntry('fourth'));

    const entries = store.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0].action).toBe('second');
    expect(entries[2].action).toBe('fourth');
  });

  it('should clear all entries', () => {
    const store = new InMemoryAuditStore();
    store.append(createEntry());
    store.append(createEntry());
    expect(store.getEntries()).toHaveLength(2);

    store.clear();
    expect(store.getEntries()).toHaveLength(0);
  });

  it('should handle entries with all optional fields', () => {
    const store = new InMemoryAuditStore();
    const entry = createEntry('test', {
      userId: 'user-1',
      documentId: 'doc-1',
      details: { key: 'value' },
    });
    store.append(entry);

    const retrieved = store.getEntries()[0];
    expect(retrieved.userId).toBe('user-1');
    expect(retrieved.documentId).toBe('doc-1');
    expect(retrieved.details).toEqual({ key: 'value' });
  });
});
