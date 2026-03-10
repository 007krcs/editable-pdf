// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DocSDKProvider } from '../src/context.js';
import { useFormFields } from '../src/hooks/use-form-fields.js';

type Listener = (payload: any) => void;

function createMockSDK() {
  const listeners: Record<string, Listener[]> = {};
  const mockFormEngine = {
    getFields: vi.fn(() => []),
    writeFieldValue: vi.fn().mockResolvedValue(undefined),
    readFieldValue: vi.fn(() => 'hello'),
    readAllFieldValues: vi.fn(() => ({ name: 'John' })),
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
      if (name === 'form-engine') return mockFormEngine;
      return undefined;
    }),
    export: vi.fn(),
    close: vi.fn(),
    _fire(event: string, payload: any) {
      listeners[event]?.forEach((l) => l(payload));
    },
    _formEngine: mockFormEngine,
  };
}

function makeWrapper(sdk: any) {
  return ({ children }: { children: React.ReactNode }) => (
    <DocSDKProvider sdk={sdk}>{children}</DocSDKProvider>
  );
}

describe('useFormFields', () => {
  it('should initialize with empty fields', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });
    expect(result.current.fields).toEqual([]);
  });

  it('should update fields on fields:detected', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });

    const detectedFields = [
      { name: 'firstName', type: 'text', page: 1, value: '' },
      { name: 'lastName', type: 'text', page: 1, value: '' },
    ];

    act(() => sdk._fire('fields:detected', { fields: detectedFields }));
    expect(result.current.fields).toHaveLength(2);
    expect(result.current.fields[0].name).toBe('firstName');
  });

  it('should refresh fields on field:changed', () => {
    const sdk = createMockSDK();
    const updatedFields = [{ name: 'email', type: 'text', page: 1, value: 'test@test.com' }];
    sdk._formEngine.getFields.mockReturnValue(updatedFields);

    const { result } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });

    act(() => sdk._fire('field:changed', {}));
    expect(sdk._formEngine.getFields).toHaveBeenCalled();
    expect(result.current.fields).toEqual(updatedFields);
  });

  it('should call writeFieldValue via setFieldValue', async () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });

    await act(() => result.current.setFieldValue('name', 'Jane'));
    expect(sdk._formEngine.writeFieldValue).toHaveBeenCalledWith('name', 'Jane');
  });

  it('should call readFieldValue via getFieldValue', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });

    const val = result.current.getFieldValue('name');
    expect(sdk._formEngine.readFieldValue).toHaveBeenCalledWith('name');
    expect(val).toBe('hello');
  });

  it('should call readAllFieldValues via getAllValues', () => {
    const sdk = createMockSDK();
    const { result } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });

    const vals = result.current.getAllValues();
    expect(sdk._formEngine.readAllFieldValues).toHaveBeenCalled();
    expect(vals).toEqual({ name: 'John' });
  });

  it('should unsubscribe on unmount', () => {
    const sdk = createMockSDK();
    const { unmount } = renderHook(() => useFormFields(), { wrapper: makeWrapper(sdk) });
    expect(sdk.events.on).toHaveBeenCalledTimes(2);
    unmount();
  });
});
