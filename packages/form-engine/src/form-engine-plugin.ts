import type {
  DocSDKPlugin,
  PluginContext,
  FormFieldDescriptor,
  FormFieldValue,
} from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import { detectFields } from './field-detector.js';
import { readFieldValue, readAllFieldValues } from './field-reader.js';
import { writeFieldValue, writeAllFieldValues } from './field-writer.js';

export class FormEnginePlugin implements DocSDKPlugin {
  readonly name = 'form-engine';
  readonly version = '0.1.0';

  private context: PluginContext | null = null;
  private cachedFields: FormFieldDescriptor[] = [];
  private unsubscribers: Array<() => void> = [];

  initialize(context: PluginContext): void {
    this.context = context;

    const unsub = context.events.on('document:loaded', () => {
      this.cachedFields = this.detectFields();
      context.events.emit('fields:detected', { fields: this.cachedFields });
    });
    this.unsubscribers.push(unsub);
  }

  detectFields(): FormFieldDescriptor[] {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();
    this.cachedFields = detectFields(pdfDoc);
    return this.cachedFields;
  }

  getFields(): FormFieldDescriptor[] {
    return this.cachedFields;
  }

  readFieldValue(fieldName: string): FormFieldValue {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();
    return readFieldValue(pdfDoc, fieldName);
  }

  readAllFieldValues(): Record<string, FormFieldValue> {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();
    return readAllFieldValues(pdfDoc);
  }

  async writeFieldValue(fieldName: string, value: FormFieldValue): Promise<void> {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();
    const oldValue = readFieldValue(pdfDoc, fieldName);

    writeFieldValue(pdfDoc, fieldName, value);

    // Trigger reserialize to update rendering
    await pdfEngine.reserialize();

    // Re-detect fields after reserialize (pdf-lib doc is reloaded)
    this.cachedFields = this.detectFields();

    this.context?.events.emit('field:changed', {
      fieldName,
      oldValue,
      newValue: value,
    });
  }

  async writeAllFieldValues(values: Record<string, FormFieldValue>): Promise<void> {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();

    writeAllFieldValues(pdfDoc, values);

    await pdfEngine.reserialize();
    this.cachedFields = this.detectFields();

    for (const [name, value] of Object.entries(values)) {
      this.context?.events.emit('field:changed', {
        fieldName: name,
        oldValue: null,
        newValue: value,
      });
    }
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) {
      throw new Error('PDFEnginePlugin is required for FormEnginePlugin');
    }
    return engine;
  }

  async destroy(): Promise<void> {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.cachedFields = [];
    this.context = null;
  }
}
