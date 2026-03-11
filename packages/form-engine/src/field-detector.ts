import type { PDFDocument } from 'pdf-lib';
import type { FormFieldDescriptor } from '@docsdk/shared-types';
import { mapFieldToDescriptor } from './field-mapper.js';

/**
 * Detect all form fields in a PDF document.
 *
 * Returns an empty array if the PDF genuinely has no interactive form.
 * Re-throws unexpected errors (e.g. corrupt PDF, internal pdf-lib failures)
 * so callers can handle them properly rather than silently returning [].
 */
export function detectFields(pdfDoc: PDFDocument): FormFieldDescriptor[] {
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.map((field) => mapFieldToDescriptor(field, pdfDoc));
  } catch (err) {
    // pdf-lib throws when the document has no AcroForm entry.
    // Only swallow that specific "no form" case; re-throw everything else.
    if (err instanceof Error && /no form|no AcroForm/i.test(err.message)) {
      return [];
    }
    throw err;
  }
}
