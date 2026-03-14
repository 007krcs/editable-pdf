import { describe, it, expect, beforeEach } from 'vitest';
import { MetricCollector } from '../src/metric-collector.js';

describe('MetricCollector', () => {
  let collector: MetricCollector;

  beforeEach(() => {
    collector = new MetricCollector();
  });

  it('records and retrieves metric summary', () => {
    collector.record('load', 100);
    collector.record('load', 200);
    collector.record('load', 300);

    const summary = collector.getSummary('load');
    expect(summary).toBeDefined();
    expect(summary!.count).toBe(3);
    expect(summary!.min).toBe(100);
    expect(summary!.max).toBe(300);
    expect(summary!.avg).toBe(200);
  });

  it('returns undefined for unknown metric', () => {
    expect(collector.getSummary('unknown')).toBeUndefined();
  });

  it('calculates percentiles', () => {
    for (let i = 1; i <= 100; i++) {
      collector.record('latency', i);
    }
    const summary = collector.getSummary('latency')!;
    // With 100 values (1-100), floor(100*0.5)=50 → sorted[50]=51 (0-indexed)
    expect(summary.p50).toBe(51);
    expect(summary.p95).toBe(96);
    expect(summary.p99).toBe(100);
  });

  it('enforces max entries with FIFO eviction', () => {
    const small = new MetricCollector(5);
    for (let i = 0; i < 10; i++) {
      small.record('x', i);
    }
    const summary = small.getSummary('x')!;
    expect(summary.count).toBe(5);
    expect(summary.min).toBe(5); // first 5 evicted
  });

  it('gets all summaries', () => {
    collector.record('a', 1);
    collector.record('b', 2);
    const summaries = collector.getAllSummaries();
    expect(summaries).toHaveLength(2);
  });

  it('clears all metrics', () => {
    collector.record('test', 42);
    collector.clear();
    expect(collector.getSummary('test')).toBeUndefined();
  });
});
