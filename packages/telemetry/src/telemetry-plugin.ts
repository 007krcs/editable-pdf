import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import { MetricCollector } from './metric-collector.js';
import { ErrorTracker } from './error-tracker.js';

export class TelemetryPlugin implements DocSDKPlugin {
  readonly name = 'telemetry';
  readonly version = '0.1.0';
  readonly dependencies = [];
  readonly capabilities = ['telemetry', 'error-tracking'];

  private context: PluginContext | null = null;
  private unsubscribers: Array<() => void> = [];
  readonly metrics = new MetricCollector();
  readonly errors = new ErrorTracker();

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Track document lifecycle timing
    let loadStart = 0;

    this.unsubscribers.push(
      context.events.on('document:loading', () => {
        loadStart = performance.now();
        this.errors.addBreadcrumb({ type: 'action', message: 'Document loading started' });
      }),
    );

    this.unsubscribers.push(
      context.events.on('document:loaded', () => {
        if (loadStart > 0) {
          const duration = performance.now() - loadStart;
          this.metrics.record('document.load', duration);
          performance.mark('docsdk:document-loaded');
          this.errors.addBreadcrumb({
            type: 'event',
            message: 'Document loaded',
            data: { duration },
          });
          loadStart = 0;
        }
      }),
    );

    this.unsubscribers.push(
      context.events.on('document:error', ({ error }) => {
        this.errors.captureError(
          error instanceof Error ? error : new Error(String(error)),
          { phase: 'document' },
        );
        this.errors.addBreadcrumb({
          type: 'error',
          message: `Document error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }),
    );

    this.unsubscribers.push(
      context.events.on('page:rendered', ({ pageNumber }) => {
        this.errors.addBreadcrumb({
          type: 'event',
          message: `Page ${pageNumber} rendered`,
        });
      }),
    );

    this.unsubscribers.push(
      context.events.on('field:changed', ({ fieldName }) => {
        this.errors.addBreadcrumb({
          type: 'action',
          message: `Field "${fieldName}" changed`,
        });
      }),
    );

    this.unsubscribers.push(
      context.events.on('signature:placed', () => {
        this.errors.addBreadcrumb({
          type: 'action',
          message: 'Signature placed',
        });
      }),
    );
  }

  /** Record a custom timing metric */
  recordMetric(name: string, value: number): void {
    this.metrics.record(name, value);
  }

  /** Start a timer, returns a function that stops and records the metric */
  startTimer(name: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.metrics.record(name, duration);
      return duration;
    };
  }

  async destroy(): Promise<void> {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.context = null;
  }
}
