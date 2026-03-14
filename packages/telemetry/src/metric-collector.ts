export interface MetricEntry {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface MetricSummary {
  name: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export class MetricCollector {
  private metrics = new Map<string, number[]>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);
    // FIFO eviction
    if (values.length > this.maxEntries) {
      values.shift();
    }
  }

  getSummary(name: string): MetricSummary | undefined {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      name,
      count,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sorted.reduce((sum, v) => sum + v, 0) / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  getAllSummaries(): MetricSummary[] {
    const summaries: MetricSummary[] = [];
    for (const name of this.metrics.keys()) {
      const summary = this.getSummary(name);
      if (summary) summaries.push(summary);
    }
    return summaries;
  }

  clear(): void {
    this.metrics.clear();
  }
}
