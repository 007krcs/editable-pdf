// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DocSDKProvider } from '../src/context.js';
import { useDocument } from '../src/hooks/use-document.js';

type Listener = (payload: any) => void;

function createMockSDK() {
  const listeners: Record<string, Listener[]> = {};
  return {
    events: {
      on: vi.fn((event: string, listener: Listener) => {
        (listeners[event] ??= []).push(listener);
        return () => {
          const idx = listeners[event]?.indexOf(listener) ?? -1;
          if (idx >= 0) listeners[event].splice(idx, 1);
        };
      }),
      once: vi.fn(() => vi.fn()),
      off: vi.fn(),
      emit: vi.fn((event: string, payload: any) => {
        listeners[event]?.forEach((l) => l(payload));
      }),
      removeAllListeners: vi.fn(),
    },
    state: 'IDLE' as any,
    load: vi.fn(),
    getPlugin: vi.fn(),
    export: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    close: vi.fn().mockResolvedValue(undefined),
    _fire(event: string, payload: any) {
      listeners[event]?.forEach((l) => l(payload));
    },
  };
}

function makeWrapper(sdk: any) {
  return ({ children }: { children: React.ReactNode }) => (
    <DocSDKProvider sdk={sdk}>{children}</DocSDKProvider>
  );
}

describe('useDocument', () => {
  it('should initialize with IDLE state and 0 pages', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    expect(result.current.state).toBe('IDLE');
    expect(result.current.pageCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should update state on document:loading', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    act(() => sdk._fire('document:loading', {}));
    expect(result.current.state).toBe('LOADING');
  });

  it('should update state and pageCount on document:loaded', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    act(() => sdk._fire('document:loaded', { pageCount: 5 }));
    expect(result.current.state).toBe('LOADED');
    expect(result.current.pageCount).toBe(5);
  });

  it('should set error on document:error', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    const err = new Error('load failed');
    act(() => sdk._fire('document:error', { error: err }));
    expect(result.current.error).toBe(err);
  });

  it('should clear error when loading again', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    act(() => sdk._fire('document:error', { error: new Error('fail') }));
    expect(result.current.error).toBeTruthy();

    act(() => sdk._fire('document:loading', {}));
    expect(result.current.error).toBeNull();
  });

  it('should call sdk.load when load is called', async () => {
    const sdk = createMockSDK();
    sdk.load.mockResolvedValue({});
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    const source = { type: 'buffer' as const, buffer: new Uint8Array([1]) };
    await act(() => result.current.load(source));
    expect(sdk.load).toHaveBeenCalledWith(source);
  });

  it('should call sdk.export when exportPdf is called', async () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    const bytes = await act(() => result.current.exportPdf());
    expect(sdk.export).toHaveBeenCalled();
  });

  it('should track exporting state', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    act(() => sdk._fire('document:exporting', {}));
    expect(result.current.state).toBe('EXPORTING');

    act(() => sdk._fire('document:exported', {}));
    expect(result.current.state).toBe('READY');
  });

  it('should unsubscribe from events on unmount', () => {
    const sdk = createMockSDK();
    const { unmount } = renderHook(() => useDocument(), { wrapper: makeWrapper(sdk) });

    // 5 event listeners are registered
    expect(sdk.events.on).toHaveBeenCalledTimes(5);
    unmount();

    // After unmount, firing events should not cause errors
    act(() => sdk._fire('document:loaded', { pageCount: 10 }));
  });
});
