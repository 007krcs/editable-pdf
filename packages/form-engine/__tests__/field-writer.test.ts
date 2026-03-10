import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { writeFieldValue, writeAllFieldValues } from '../src/field-writer.js';
import { readFieldValue } from '../src/field-reader.js';

describe('writeFieldValue', () => {
  it('should write text field', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('name');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    writeFieldValue(doc, 'name', 'Jane');
    expect(readFieldValue(doc, 'name')).toBe('Jane');
  });

  it('should check a checkbox', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const cb = form.createCheckBox('agree');
    cb.addToPage(page, { x: 50, y: 50, width: 20, height: 20 });

    writeFieldValue(doc, 'agree', true);
    expect(readFieldValue(doc, 'agree')).toBe(true);
  });

  it('should uncheck a checkbox', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const cb = form.createCheckBox('agree');
    cb.addToPage(page, { x: 50, y: 50, width: 20, height: 20 });
    cb.check();

    writeFieldValue(doc, 'agree', false);
    expect(readFieldValue(doc, 'agree')).toBe(false);
  });

  it('should select dropdown value', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const dd = form.createDropdown('state');
    dd.addOptions(['CA', 'NY', 'TX']);
    dd.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    writeFieldValue(doc, 'state', 'NY');
    expect(readFieldValue(doc, 'state')).toEqual(['NY']);
  });

  it('should clear dropdown with null', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const dd = form.createDropdown('state');
    dd.addOptions(['CA', 'NY', 'TX']);
    dd.select('CA');
    dd.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    writeFieldValue(doc, 'state', null);
    expect(readFieldValue(doc, 'state')).toEqual([]);
  });

  it('should throw on read-only field', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('locked');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });
    tf.enableReadOnly();

    expect(() => writeFieldValue(doc, 'locked', 'test')).toThrow('read-only');
  });
});

describe('writeAllFieldValues', () => {
  it('should write multiple field values', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();

    const tf = form.createTextField('name');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    const cb = form.createCheckBox('agree');
    cb.addToPage(page, { x: 50, y: 100, width: 20, height: 20 });

    writeAllFieldValues(doc, { name: 'Bob', agree: true });

    expect(readFieldValue(doc, 'name')).toBe('Bob');
    expect(readFieldValue(doc, 'agree')).toBe(true);
  });
});
