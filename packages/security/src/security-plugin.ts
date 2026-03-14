import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import { validatePdfBytes, type PDFValidationConfig } from './pdf-validator.js';

/**
 * Security plugin that validates PDF documents before processing.
 * Register this plugin BEFORE PDFEnginePlugin to intercept malicious files.
 */
export class SecurityPlugin implements DocSDKPlugin {
  readonly name = 'security';
  readonly version = '0.1.0';
  readonly capabilities = ['security', 'validation'] as const;

  private context: PluginContext | null = null;
  private config: PDFValidationConfig;

  constructor(config: PDFValidationConfig = {}) {
    this.config = config;
  }

  initialize(context: PluginContext): void {
    this.context = context;
  }

  /**
   * Validate PDF bytes. Called by PDFEnginePlugin before initializing the bridge.
   * @throws {PDFSecurityError} if validation fails
   */
  validate(bytes: Uint8Array): void {
    try {
      validatePdfBytes(bytes, this.config);
    } catch (err) {
      this.context?.events.emit('security:validation-failed', {
        error: err instanceof Error ? err : new Error(String(err)),
        code: (err as any).code ?? 'UNKNOWN',
      });
      throw err;
    }
  }

  /** Get the current validation config */
  getConfig(): Readonly<PDFValidationConfig> {
    return { ...this.config };
  }

  /** Update the validation config at runtime */
  updateConfig(patch: Partial<PDFValidationConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  destroy(): void {
    this.context = null;
  }
}
