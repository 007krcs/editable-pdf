import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { readFieldValue, readAllFieldValues } from '../src/field-reader.js';

describe('readFieldValue', () => {
  it('should read text field value', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('name');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });
    tf.setText('Bob');

    expect(readFieldValue(doc, 'name')).toBe('Bob');
  });

  it('should read empty text field as empty string', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('empty');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    expect(readFieldValue(doc, 'empty')).toBe('');
  });

  it('should read checked checkbox as true', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const cb = form.createCheckBox('terms');
    cb.addToPage(page, { x: 50, y: 50, width: 20, height: 20 });
    cb.check();

    expect(readFieldValue(doc, 'terms')).toBe(true);
  });

  it('should read unchecked checkbox as false', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const cb = form.createCheckBox('terms');
    cb.addToPage(page, { x: 50, y: 50, width: 20, height: 20 });

    expect(readFieldValue(doc, 'terms')).toBe(false);
  });

  it('should read dropdown selection', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const dd = form.createDropdown('state');
    dd.addOptions(['CA', 'NY', 'TX']);
    dd.select('TX');
    dd.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });

    const val = readFieldValue(doc, 'state');
    expect(val).toEqual(['TX']);
  });

  it('should throw for non-existent field', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();

    expect(() => readFieldValue(doc, 'nonExistent')).toThrow();
  });
});

describe('readAllFieldValues', () => {
  it('should read all field values', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();

    const tf = form.createTextField('name');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });
    tf.setText('Alice');

    const cb = form.createCheckBox('agree');
    cb.addToPage(page, { x: 50, y: 100, width: 20, height: 20 });
    cb.check();

    const values = readAllFieldValues(doc);
    expect(values['name']).toBe('Alice');
    expect(values['agree']).toBe(true);
  });

  it('should return empty object for formless document', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();

    // getForm() on a doc without form creates an empty one
    const values = readAllFieldValues(doc);
    expect(values).toEqual({});
  });
});
