import {
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  type PDFDocument,
} from 'pdf-lib';
import type { FormFieldValue } from '@docsdk/shared-types';

export function readFieldValue(pdfDoc: PDFDocument, fieldName: string): FormFieldValue {
  const form = pdfDoc.getForm();
  const field = form.getField(fieldName);

  if (field instanceof PDFTextField) return field.getText() ?? '';
  if (field instanceof PDFCheckBox) return field.isChecked();
  if (field instanceof PDFDropdown) return field.getSelected();
  if (field instanceof PDFRadioGroup) return field.getSelected() ?? null;
  return null;
}

export function readAllFieldValues(pdfDoc: PDFDocument): Record<string, FormFieldValue> {
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const result: Record<string, FormFieldValue> = {};

  for (const field of fields) {
    result[field.getName()] = readFieldValue(pdfDoc, field.getName());
  }

  return result;
}
