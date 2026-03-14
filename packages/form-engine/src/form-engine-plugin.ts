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

/**
 * Manages PDF form field detection, reading, and writing.
 *
 * v2 improvements:
 * - Dirty flag batching: multiple field writes accumulate without reserialize
 * - Explicit `flush()` triggers a single reserialize for all pending changes
 * - `writeFieldValue()` with `immediate: false` (default) defers reserialize
 * - Declared dependency on 'pdf-engine'
 */
export class FormEnginePlugin implements DocSDKPlugin {
  readonly name = 'form-engine';
  readonly version = '0.2.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['forms'] as const;

  private context: PluginContext | null = null;
  private cachedFields: FormFieldDescriptor[] = [];
  private unsubscribers: Array<() => void> = [];
  private _dirty = false;

  /** Whether there are unflushed field changes. */
  get dirty(): boolean {
    return this._dirty;
  }

  initialize(context: PluginContext): void {
    this.context = context;

    const unsub = context.events.on('document:loaded', () => {
      this._dirty = false;
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

  /**
   * Write a field value.
   *
   * @param fieldName - The field to update
   * @param value - The new value
   * @param options.immediate - If true, triggers reserialize immediately (legacy behavior).
   *   If false (default), marks dirty and defers reserialize to `flush()`.
   */
  async writeFieldValue(
    fieldName: string,
    value: FormFieldValue,
    options: { immediate?: boolean } = {},
  ): Promise<void> {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();
    const oldValue = readFieldValue(pdfDoc, fieldName);

    writeFieldValue(pdfDoc, fieldName, value);
    this._dirty = true;

    // Update the cached descriptor so React controlled inputs stay in sync
    const idx = this.cachedFields.findIndex((f) => f.name === fieldName);
    if (idx !== -1) {
      this.cachedFields = [
        ...this.cachedFields.slice(0, idx),
        { ...this.cachedFields[idx], value },
        ...this.cachedFields.slice(idx + 1),
      ];
    }

    if (options.immediate) {
      await this.flush();
    }

    this.context?.events.emit('field:changed', {
      fieldName,
      oldValue,
      newValue: value,
    });
  }

  /**
   * Write multiple field values in a single batch.
   * Does NOT reserialize until `flush()` is called (unless immediate: true).
   */
  async writeAllFieldValues(
    values: Record<string, FormFieldValue>,
    options: { immediate?: boolean } = {},
  ): Promise<void> {
    const pdfEngine = this.getPdfEngine();
    const pdfDoc = pdfEngine.getBridge().getPdfLibDocument();

    writeAllFieldValues(pdfDoc, values);
    this._dirty = true;

    if (options.immediate) {
      await this.flush();
    }

    for (const [name, value] of Object.entries(values)) {
      this.context?.events.emit('field:changed', {
        fieldName: name,
        oldValue: null,
        newValue: value,
      });
    }
  }

  /**
   * Flush all pending field changes by performing a single reserialize.
   * This is the ONLY place reserialize happens for field writes.
   * Call this when you're done editing fields (e.g., before export, on blur).
   */
  async flush(): Promise<void> {
    if (!this._dirty) return;

    const pdfEngine = this.getPdfEngine();
    await pdfEngine.reserialize();

    // Re-detect fields after reserialize (pdf-lib doc is reloaded)
    this.cachedFields = this.detectFields();
    this._dirty = false;
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
    this._dirty = false;
    this.context = null;
  }
}
