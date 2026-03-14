export interface Breadcrumb {
  type: 'event' | 'action' | 'error';
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface TrackedError {
  error: Error;
  breadcrumbs: Breadcrumb[];
  timestamp: number;
  context?: Record<string, unknown>;
}

export class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private errors: TrackedError[] = [];
  private maxBreadcrumbs: number;
  private maxErrors: number;

  constructor(maxBreadcrumbs = 50, maxErrors = 100) {
    this.maxBreadcrumbs = maxBreadcrumbs;
    this.maxErrors = maxErrors;
  }

  addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'>): void {
    this.breadcrumbs.push({ ...crumb, timestamp: Date.now() });
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  captureError(error: Error, context?: Record<string, unknown>): TrackedError {
    const tracked: TrackedError = {
      error,
      breadcrumbs: [...this.breadcrumbs],
      timestamp: Date.now(),
      context,
    };
    this.errors.push(tracked);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    return tracked;
  }

  getErrors(): readonly TrackedError[] {
    return this.errors;
  }

  getRecentErrors(count = 10): TrackedError[] {
    return this.errors.slice(-count);
  }

  clear(): void {
    this.breadcrumbs = [];
    this.errors = [];
  }
}
