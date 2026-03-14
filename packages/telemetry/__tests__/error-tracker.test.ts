import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorTracker } from '../src/error-tracker.js';

describe('ErrorTracker', () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    tracker = new ErrorTracker();
  });

  it('adds breadcrumbs', () => {
    tracker.addBreadcrumb({ type: 'event', message: 'test event' });
    tracker.addBreadcrumb({ type: 'action', message: 'test action' });
    // Breadcrumbs are internal, verify via captured error
    const err = tracker.captureError(new Error('test'));
    expect(err.breadcrumbs).toHaveLength(2);
    expect(err.breadcrumbs[0].message).toBe('test event');
  });

  it('captures errors with breadcrumb snapshot', () => {
    tracker.addBreadcrumb({ type: 'event', message: 'before error' });
    const tracked = tracker.captureError(new Error('oops'), { key: 'value' });
    expect(tracked.error.message).toBe('oops');
    expect(tracked.context).toEqual({ key: 'value' });
    expect(tracked.breadcrumbs).toHaveLength(1);
  });

  it('limits breadcrumb count', () => {
    const small = new ErrorTracker(3, 100);
    for (let i = 0; i < 10; i++) {
      small.addBreadcrumb({ type: 'event', message: `msg ${i}` });
    }
    const err = small.captureError(new Error('test'));
    expect(err.breadcrumbs).toHaveLength(3);
    expect(err.breadcrumbs[0].message).toBe('msg 7');
  });

  it('limits error count', () => {
    const small = new ErrorTracker(50, 3);
    for (let i = 0; i < 10; i++) {
      small.captureError(new Error(`err ${i}`));
    }
    expect(small.getErrors()).toHaveLength(3);
  });

  it('gets recent errors', () => {
    for (let i = 0; i < 5; i++) {
      tracker.captureError(new Error(`err ${i}`));
    }
    const recent = tracker.getRecentErrors(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].error.message).toBe('err 3');
    expect(recent[1].error.message).toBe('err 4');
  });

  it('clears all state', () => {
    tracker.addBreadcrumb({ type: 'event', message: 'test' });
    tracker.captureError(new Error('test'));
    tracker.clear();
    expect(tracker.getErrors()).toHaveLength(0);
    const err = tracker.captureError(new Error('after clear'));
    expect(err.breadcrumbs).toHaveLength(0);
  });
});
