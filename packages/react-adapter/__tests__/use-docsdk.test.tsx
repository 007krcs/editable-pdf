// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { DocSDKProvider } from '../src/context.js';
import { useDocSDK } from '../src/hooks/use-docsdk.js';

function createMockSDK() {
  return {
    events: {
      on: vi.fn(() => vi.fn()),
      once: vi.fn(() => vi.fn()),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    state: 'IDLE' as const,
    load: vi.fn(),
    getPlugin: vi.fn(),
    export: vi.fn(),
    close: vi.fn(),
  };
}

describe('useDocSDK', () => {
  it('should return the SDK from context', () => {
    const sdk = createMockSDK();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocSDKProvider sdk={sdk as any}>{children}</DocSDKProvider>
    );

    const { result } = renderHook(() => useDocSDK(), { wrapper });
    expect(result.current).toBe(sdk);
  });

  it('should throw when used outside DocSDKProvider', () => {
    expect(() => {
      renderHook(() => useDocSDK());
    }).toThrow('useDocSDK must be used within a DocSDKProvider');
  });

  it('should return the same SDK instance on re-render', () => {
    const sdk = createMockSDK();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DocSDKProvider sdk={sdk as any}>{children}</DocSDKProvider>
    );

    const { result, rerender } = renderHook(() => useDocSDK(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
