import {
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFButton,
  PDFSignature,
  type PDFDocument,
  type PDFField,
  type PDFWidgetAnnotation,
} from 'pdf-lib';
import { FormFieldType, type FormFieldDescriptor, type FormFieldValue, type Rectangle } from '@docsdk/shared-types';

function getFieldType(field: PDFField): FormFieldType {
  if (field instanceof PDFTextField) return FormFieldType.TEXT;
  if (field instanceof PDFCheckBox) return FormFieldType.CHECKBOX;
  if (field instanceof PDFDropdown) return FormFieldType.DROPDOWN;
  if (field instanceof PDFRadioGroup) return FormFieldType.RADIO;
  if (field instanceof PDFSignature) return FormFieldType.SIGNATURE;
  if (field instanceof PDFButton) return FormFieldType.BUTTON;
  return FormFieldType.TEXT;
}

function getFieldValue(field: PDFField): FormFieldValue {
  if (field instanceof PDFTextField) return field.getText() ?? '';
  if (field instanceof PDFCheckBox) return field.isChecked();
  if (field instanceof PDFDropdown) return field.getSelected();
  if (field instanceof PDFRadioGroup) return field.getSelected() ?? null;
  return null;
}

function getFieldOptions(field: PDFField): string[] | undefined {
  if (field instanceof PDFDropdown) return field.getOptions();
  if (field instanceof PDFRadioGroup) return field.getOptions();
  return undefined;
}

function isRequired(field: PDFField): boolean {
  try {
    return field.isRequired();
  } catch (err) {
    console.warn(`[form-engine] Could not read isRequired for "${field.getName()}":`, err);
    return false;
  }
}

function isReadOnly(field: PDFField): boolean {
  try {
    return field.isReadOnly();
  } catch (err) {
    console.warn(`[form-engine] Could not read isReadOnly for "${field.getName()}":`, err);
    return false;
  }
}

function getWidgetRect(field: PDFField): Rectangle {
  try {
    const widgets: PDFWidgetAnnotation[] = field.acroField.getWidgets();
    if (widgets.length > 0) {
      const rect = widgets[0].getRectangle();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }
  } catch (err) {
    console.warn(`[form-engine] Could not read widget rect for "${field.getName()}":`, err);
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function getFieldPage(field: PDFField, pdfDoc: PDFDocument): number {
  try {
    const widgets: PDFWidgetAnnotation[] = field.acroField.getWidgets();
    if (widgets.length > 0) {
      const pageRef = widgets[0].P();
      if (pageRef) {
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
          if (pages[i].ref === pageRef) return i + 1;
        }
      }
    }
  } catch (err) {
    console.warn(`[form-engine] Could not determine page for "${field.getName()}":`, err);
  }
  return 1;
}

export function mapFieldToDescriptor(field: PDFField, pdfDoc: PDFDocument): FormFieldDescriptor {
  return {
    name: field.getName(),
    type: getFieldType(field),
    required: isRequired(field),
    readOnly: isReadOnly(field),
    value: getFieldValue(field),
    options: getFieldOptions(field),
    page: getFieldPage(field, pdfDoc),
    rect: getWidgetRect(field),
  };
}
