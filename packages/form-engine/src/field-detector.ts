import type { PDFDocument } from 'pdf-lib';
import type { FormFieldDescriptor } from '@docsdk/shared-types';
import { mapFieldToDescriptor } from './field-mapper.js';

export function detectFields(pdfDoc: PDFDocument): FormFieldDescriptor[] {
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.map((field) => mapFieldToDescriptor(field, pdfDoc));
  } catch {
    // Document has no form, return empty array
    return [];
  }
}
