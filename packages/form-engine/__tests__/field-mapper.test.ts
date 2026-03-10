import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mapFieldToDescriptor } from '../src/field-mapper.js';
import { FormFieldType } from '@docsdk/shared-types';

describe('mapFieldToDescriptor', () => {
  it('should map a text field', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('firstName');
    tf.addToPage(page, { x: 50, y: 100, width: 200, height: 30 });
    tf.setText('Alice');

    const field = form.getField('firstName');
    const desc = mapFieldToDescriptor(field, doc);

    expect(desc.name).toBe('firstName');
    expect(desc.type).toBe(FormFieldType.TEXT);
    expect(desc.value).toBe('Alice');
    expect(desc.readOnly).toBe(false);
    expect(desc.rect.width).toBeGreaterThan(0);
  });

  it('should map a checkbox field', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const cb = form.createCheckBox('agree');
    cb.addToPage(page, { x: 50, y: 50, width: 20, height: 20 });
    cb.check();

    const field = form.getField('agree');
    const desc = mapFieldToDescriptor(field, doc);

    expect(desc.name).toBe('agree');
    expect(desc.type).toBe(FormFieldType.CHECKBOX);
    expect(desc.value).toBe(true);
  });

  it('should map a dropdown with options', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const dd = form.createDropdown('color');
    dd.addOptions(['Red', 'Green', 'Blue']);
    dd.select('Green');
    dd.addToPage(page, { x: 50, y: 50, width: 150, height: 30 });

    const field = form.getField('color');
    const desc = mapFieldToDescriptor(field, doc);

    expect(desc.type).toBe(FormFieldType.DROPDOWN);
    expect(desc.options).toEqual(['Red', 'Green', 'Blue']);
  });

  it('should detect correct page for multi-page forms', async () => {
    const doc = await PDFDocument.create();
    const page1 = doc.addPage();
    const page2 = doc.addPage();
    const form = doc.getForm();

    const tf1 = form.createTextField('page1Field');
    tf1.addToPage(page1, { x: 50, y: 50, width: 200, height: 30 });

    const tf2 = form.createTextField('page2Field');
    tf2.addToPage(page2, { x: 50, y: 50, width: 200, height: 30 });

    const desc1 = mapFieldToDescriptor(form.getField('page1Field'), doc);
    const desc2 = mapFieldToDescriptor(form.getField('page2Field'), doc);

    expect(desc1.page).toBe(1);
    expect(desc2.page).toBe(2);
  });

  it('should default to page 1 for fields without page reference', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('noPage');
    // Don't add to page — field exists but has no widget with page ref

    const field = form.getField('noPage');
    const desc = mapFieldToDescriptor(field, doc);

    expect(desc.page).toBe(1);
  });

  it('should detect read-only fields', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage();
    const form = doc.getForm();
    const tf = form.createTextField('locked');
    tf.addToPage(page, { x: 50, y: 50, width: 200, height: 30 });
    tf.enableReadOnly();

    const desc = mapFieldToDescriptor(form.getField('locked'), doc);
    expect(desc.readOnly).toBe(true);
  });
});
