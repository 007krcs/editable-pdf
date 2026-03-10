import { describe, it, expect, vi } from 'vitest';
import { ValidationPlugin } from '../src/validation-plugin.js';
import { EventBus } from '@docsdk/core';
import type { DocSDKEventMap, PluginContext, DocumentControllerView, FormFieldDescriptor } from '@docsdk/shared-types';
import { DocumentState, FormFieldType } from '@docsdk/shared-types';

function makeField(overrides: Partial<FormFieldDescriptor> = {}): FormFieldDescriptor {
  return {
    name: 'test',
    type: FormFieldType.TEXT,
    required: false,
    readOnly: false,
    value: '',
    page: 1,
    rect: { x: 0, y: 0, width: 100, height: 20 },
    ...overrides,
  };
}

function createMockContext(fields: FormFieldDescriptor[] = []) {
  const events = new EventBus<DocSDKEventMap>();

  const mockFormEngine = {
    name: 'form-engine',
    version: '0.1.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
    getFields: vi.fn().mockReturnValue(fields),
  };

  const controller: DocumentControllerView = {
    state: DocumentState.LOADED,
    currentBytes: new Uint8Array(),
    pageCount: 1,
    updateBytes: vi.fn(),
    setPageCount: vi.fn(),
  };

  const context: PluginContext = {
    events,
    documentController: controller,
    getPlugin: vi.fn().mockImplementation((name: string) => {
      if (name === 'form-engine') return mockFormEngine;
      return undefined;
    }),
  };

  return { context, events, mockFormEngine };
}

describe('ValidationPlugin', () => {
  it('should have correct name and version', () => {
    const plugin = new ValidationPlugin();
    expect(plugin.name).toBe('validation');
    expect(plugin.version).toBe('0.1.0');
  });

  it('should validate required fields', () => {
    const fields = [
      makeField({ name: 'required_empty', required: true, value: '' }),
      makeField({ name: 'required_filled', required: true, value: 'test' }),
      makeField({ name: 'optional_empty', required: false, value: '' }),
    ];
    const { context } = createMockContext(fields);
    const plugin = new ValidationPlugin();
    plugin.initialize(context);

    const result = plugin.validate();
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].fieldName).toBe('required_empty');
  });

  it('should emit validation:result event', () => {
    const fields = [makeField({ required: true, value: 'filled' })];
    const { context, events } = createMockContext(fields);
    const plugin = new ValidationPlugin();
    plugin.initialize(context);

    const listener = vi.fn();
    events.on('validation:result', listener);

    plugin.validate();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].valid).toBe(true);
  });

  it('should validate a single field', () => {
    const fields = [
      makeField({ name: 'email', required: true, value: '' }),
      makeField({ name: 'name', required: true, value: 'Alice' }),
    ];
    const { context } = createMockContext(fields);
    const plugin = new ValidationPlugin();
    plugin.initialize(context);

    const error = plugin.validateField('email');
    expect(error).not.toBeNull();
    expect(error!.fieldName).toBe('email');

    const noError = plugin.validateField('name');
    expect(noError).toBeNull();
  });

  it('should add and remove custom rules', () => {
    const { context } = createMockContext([makeField()]);
    const plugin = new ValidationPlugin();
    plugin.initialize(context);

    plugin.addRule({
      name: 'custom',
      validate: () => [{ fieldName: 'test', rule: 'custom', message: 'Custom error' }],
    });

    let result = plugin.validate();
    expect(result.errors.some((e) => e.rule === 'custom')).toBe(true);

    plugin.removeRule('custom');
    result = plugin.validate();
    expect(result.errors.some((e) => e.rule === 'custom')).toBe(false);
  });

  it('should auto-validate on field:changed when configured', () => {
    const fields = [makeField({ name: 'field1', required: true, value: '' })];
    const { context, events } = createMockContext(fields);
    const plugin = new ValidationPlugin({ autoValidate: true });
    plugin.initialize(context);

    const resultListener = vi.fn();
    events.on('validation:result', resultListener);

    events.emit('field:changed', { fieldName: 'field1', oldValue: '', newValue: 'x' });
    expect(resultListener).toHaveBeenCalledOnce();
  });

  it('should not auto-validate by default', () => {
    const fields = [makeField({ name: 'field1', required: true, value: '' })];
    const { context, events } = createMockContext(fields);
    const plugin = new ValidationPlugin();
    plugin.initialize(context);

    const resultListener = vi.fn();
    events.on('validation:result', resultListener);

    events.emit('field:changed', { fieldName: 'field1', oldValue: '', newValue: 'x' });
    expect(resultListener).not.toHaveBeenCalled();
  });

  it('should clean up listeners on destroy', async () => {
    const fields = [makeField({ required: true, value: '' })];
    const { context, events } = createMockContext(fields);
    const plugin = new ValidationPlugin({ autoValidate: true });
    plugin.initialize(context);

    await plugin.destroy();

    const resultListener = vi.fn();
    events.on('validation:result', resultListener);

    events.emit('field:changed', { fieldName: 'test', oldValue: '', newValue: 'x' });
    expect(resultListener).not.toHaveBeenCalled();
  });

  it('should throw when FormEnginePlugin is not registered', () => {
    const events = new EventBus<DocSDKEventMap>();
    const context: PluginContext = {
      events,
      documentController: {
        state: DocumentState.IDLE,
        currentBytes: null,
        pageCount: 0,
        updateBytes: vi.fn(),
        setPageCount: vi.fn(),
      },
      getPlugin: vi.fn().mockReturnValue(undefined),
    };

    const plugin = new ValidationPlugin();
    plugin.initialize(context);
    expect(() => plugin.validate()).toThrow('FormEnginePlugin is required');
  });
});
