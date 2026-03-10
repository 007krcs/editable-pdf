import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { detectFields } from '../src/field-detector.js';
import { FormFieldType } from '@docsdk/shared-types';

describe('detectFields', () => {
  it('should return empty array for PDF without forms', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const fields = detectFields(doc);
    expect(fields).toEqual([]);
  });

  it('should detect a text field', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('name');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });
    tf.setText('John');

    const fields = detectFields(doc);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('name');
    expect(fields[0].type).toBe(FormFieldType.TEXT);
    expect(fields[0].value).toBe('John');
  });

  it('should detect a checkbox', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const cb = form.createCheckBox('agree');
    cb.addToPage(page, { x: 50, y: 50, width: 20, height: 20 });
    cb.check();

    const fields = detectFields(doc);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('agree');
    expect(fields[0].type).toBe(FormFieldType.CHECKBOX);
    expect(fields[0].value).toBe(true);
  });

  it('should detect a dropdown', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const dd = form.createDropdown('state');
    dd.addOptions(['CA', 'NY', 'TX']);
    dd.select('NY');
    dd.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    const fields = detectFields(doc);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('state');
    expect(fields[0].type).toBe(FormFieldType.DROPDOWN);
    expect(fields[0].options).toEqual(['CA', 'NY', 'TX']);
  });

  it('should detect multiple fields', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();

    const tf = form.createTextField('firstName');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });
    const cb = form.createCheckBox('terms');
    cb.addToPage(page, { x: 50, y: 100, width: 20, height: 20 });

    const fields = detectFields(doc);
    expect(fields).toHaveLength(2);
  });
});
