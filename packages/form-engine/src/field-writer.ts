import {
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  type PDFDocument,
} from 'pdf-lib';
import type { FormFieldValue } from '@docsdk/shared-types';

export function writeFieldValue(
  pdfDoc: PDFDocument,
  fieldName: string,
  value: FormFieldValue,
): void {
  const form = pdfDoc.getForm();
  const field = form.getField(fieldName);

  if (field.isReadOnly()) {
    throw new Error(`Field "${fieldName}" is read-only`);
  }

  if (field instanceof PDFTextField) {
    field.setText(value as string ?? '');
  } else if (field instanceof PDFCheckBox) {
    if (value === true) {
      field.check();
    } else {
      field.uncheck();
    }
  } else if (field instanceof PDFDropdown) {
    if (Array.isArray(value)) {
      // Multi-select
      for (const v of value) {
        field.select(v, false);
      }
    } else if (typeof value === 'string') {
      field.select(value);
    } else {
      field.clear();
    }
  } else if (field instanceof PDFRadioGroup) {
    if (typeof value === 'string') {
      field.select(value);
    }
  }
}

export function writeAllFieldValues(
  pdfDoc: PDFDocument,
  values: Record<string, FormFieldValue>,
): void {
  for (const [name, value] of Object.entries(values)) {
    writeFieldValue(pdfDoc, name, value);
  }
}
