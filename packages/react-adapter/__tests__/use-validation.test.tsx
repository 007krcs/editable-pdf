// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DocSDKProvider } from '../src/context.js';
import { useValidation } from '../src/hooks/use-validation.js';

type Listener = (payload: any) => void;

function createMockSDK() {
  const listeners: Record<string, Listener[]> = {};
  const mockValidationPlugin = {
    validate: vi.fn(() => ({
      valid: false,
      errors: [{ fieldName: 'email', rule: 'required', message: 'Email is required' }],
    })),
  };

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
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    state: 'IDLE' as any,
    load: vi.fn(),
    getPlugin: vi.fn((name: string) => {
      if (name === 'validation') return mockValidationPlugin;
      return undefined;
    }),
    export: vi.fn(),
    close: vi.fn(),
    _fire(event: string, payload: any) {
      listeners[event]?.forEach((l) => l(payload));
    },
    _validationPlugin: mockValidationPlugin,
  };
}

function makeWrapper(sdk: any) {
  return ({ children }: { children: React.ReactNode }) => (
    <DocSDKProvider sdk={sdk}>{children}</DocSDKProvider>
  );
}

describe('useValidation', () => {
  it('should initialize with null result and isValid true', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useValidation(), { wrapper: makeWrapper(sdk) });

    expect(result.current.result).toBeNull();
    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('should call validation plugin when validate is called', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useValidation(), { wrapper: makeWrapper(sdk) });

    let vr: any;
    act(() => {
      vr = result.current.validate();
    });

    expect(sdk._validationPlugin.validate).toHaveBeenCalled();
    expect(vr.valid).toBe(false);
    expect(vr.errors).toHaveLength(1);
  });

  it('should update state after validate', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useValidation(), { wrapper: makeWrapper(sdk) });

    act(() => {
      result.current.validate();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].fieldName).toBe('email');
  });

  it('should update on validation:result event', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useValidation(), { wrapper: makeWrapper(sdk) });

    act(() => {
      sdk._fire('validation:result', {
        valid: true,
        errors: [],
      });
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('should report invalid when result has errors', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useValidation(), { wrapper: makeWrapper(sdk) });

    act(() => {
      sdk._fire('validation:result', {
        valid: false,
        errors: [
          { fieldName: 'age', rule: 'min', message: 'Must be 18+' },
          { fieldName: 'name', rule: 'required', message: 'Name required' },
        ],
      });
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(2);
  });

  it('should unsubscribe on unmount', () => {
    const sdk = createMockSDK();
    const { unmount } = renderHook(() => useValidation(), { wrapper: makeWrapper(sdk) });
    expect(sdk.events.on).toHaveBeenCalledTimes(1);
    unmount();
  });
});
