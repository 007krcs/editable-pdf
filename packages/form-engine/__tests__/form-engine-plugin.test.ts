import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { FormEnginePlugin } from '../src/form-engine-plugin.js';
import { EventBus } from '@docsdk/core';
import type { DocSDKEventMap, PluginContext, DocumentControllerView } from '@docsdk/shared-types';
import { DocumentState, FormFieldType } from '@docsdk/shared-types';

async function createTestPdfWithFields() {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const form = doc.getForm();

  const tf = form.createTextField('name');
  tf.addToPage(page, { x: 50, y: 700, width: 200, height: 30 });
  tf.setText('John');

  const cb = form.createCheckBox('agree');
  cb.addToPage(page, { x: 50, y: 650, width: 20, height: 20 });

  return doc;
}

function createMockPdfEngine(pdfDoc: PDFDocument) {
  return {
    name: 'pdf-engine',
    version: '0.1.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
    getBridge: () => ({
      getPdfLibDocument: () => pdfDoc,
      getPdfjsDocument: vi.fn(),
      getPageCount: () => pdfDoc.getPageCount(),
    }),
    reserialize: vi.fn().mockResolvedValue(new Uint8Array()),
  };
}

function createMockContext(pdfDoc: PDFDocument) {
  const events = new EventBus<DocSDKEventMap>();
  const mockPdfEngine = createMockPdfEngine(pdfDoc);

  const controller: DocumentControllerView = {
    state: DocumentState.LOADED,
    currentBytes: new Uint8Array(),
    pageCount: pdfDoc.getPageCount(),
    updateBytes: vi.fn(),
    setPageCount: vi.fn(),
  };

  const context: PluginContext = {
    events,
    documentController: controller,
    getPlugin: vi.fn().mockImplementation((name: string) => {
      if (name === 'pdf-engine') return mockPdfEngine;
      return undefined;
    }),
  };

  return { context, events, mockPdfEngine };
}

describe('FormEnginePlugin', () => {
  it('should have correct name and version', () => {
    const plugin = new FormEnginePlugin();
    expect(plugin.name).toBe('form-engine');
    expect(plugin.version).toBe('0.1.0');
  });

  it('should detect fields on document:loaded', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context, events } = createMockContext(pdfDoc);

    plugin.initialize(context);

    const fieldsListener = vi.fn();
    events.on('fields:detected', fieldsListener);

    events.emit('document:loaded', {
      document: { id: 'doc_1', pageCount: 1, bytes: new Uint8Array(), mimeType: undefined },
      pageCount: 1,
    });

    expect(fieldsListener).toHaveBeenCalledOnce();
    const { fields } = fieldsListener.mock.calls[0][0];
    expect(fields).toHaveLength(2);
    expect(fields[0].name).toBe('name');
    expect(fields[0].type).toBe(FormFieldType.TEXT);
    expect(fields[1].name).toBe('agree');
    expect(fields[1].type).toBe(FormFieldType.CHECKBOX);
  });

  it('should cache detected fields', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context, events } = createMockContext(pdfDoc);

    plugin.initialize(context);
    events.emit('document:loaded', {
      document: { id: 'doc_1', pageCount: 1, bytes: new Uint8Array(), mimeType: undefined },
      pageCount: 1,
    });

    const cached = plugin.getFields();
    expect(cached).toHaveLength(2);
  });

  it('should read a field value', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context } = createMockContext(pdfDoc);

    plugin.initialize(context);

    expect(plugin.readFieldValue('name')).toBe('John');
  });

  it('should read all field values', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context } = createMockContext(pdfDoc);

    plugin.initialize(context);

    const values = plugin.readAllFieldValues();
    expect(values['name']).toBe('John');
    expect(values['agree']).toBe(false);
  });

  it('should write a field value and emit field:changed', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context, events } = createMockContext(pdfDoc);

    plugin.initialize(context);

    const changedListener = vi.fn();
    events.on('field:changed', changedListener);

    await plugin.writeFieldValue('name', 'Jane');

    expect(changedListener).toHaveBeenCalledWith({
      fieldName: 'name',
      oldValue: 'John',
      newValue: 'Jane',
    });
  });

  it('should call reserialize after writing', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context, mockPdfEngine } = createMockContext(pdfDoc);

    plugin.initialize(context);

    await plugin.writeFieldValue('name', 'Updated');
    expect(mockPdfEngine.reserialize).toHaveBeenCalledOnce();
  });

  it('should clean up listeners on destroy', async () => {
    const pdfDoc = await createTestPdfWithFields();
    const plugin = new FormEnginePlugin();
    const { context, events } = createMockContext(pdfDoc);

    plugin.initialize(context);
    await plugin.destroy();

    // After destroy, emitting document:loaded should not trigger field detection
    const fieldsListener = vi.fn();
    events.on('fields:detected', fieldsListener);

    events.emit('document:loaded', {
      document: { id: 'doc_2', pageCount: 1, bytes: new Uint8Array(), mimeType: undefined },
      pageCount: 1,
    });

    expect(fieldsListener).not.toHaveBeenCalled();
  });

  it('should throw when PDFEnginePlugin is not registered', () => {
    const plugin = new FormEnginePlugin();
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

    plugin.initialize(context);
    expect(() => plugin.detectFields()).toThrow('PDFEnginePlugin is required');
  });
});
