import type {
  DocSDKPlugin,
  PluginContext,
  ValidationResult,
  ValidationError,
  ValidationRule,
} from '@docsdk/shared-types';
import type { FormEnginePlugin } from '@docsdk/form-engine';
import { RequiredFieldRule } from './required-field-rule.js';
import { RuleRunner } from './rule-runner.js';

export interface ValidationConfig {
  autoValidate?: boolean;
}

export class ValidationPlugin implements DocSDKPlugin {
  readonly name = 'validation';
  readonly version = '0.1.0';

  private context: PluginContext | null = null;
  private runner = new RuleRunner();
  private config: ValidationConfig;
  private unsubscribers: Array<() => void> = [];

  constructor(config: ValidationConfig = {}) {
    this.config = config;
    this.runner.addRule(new RequiredFieldRule());
  }

  initialize(context: PluginContext): void {
    this.context = context;

    if (this.config.autoValidate) {
      const unsub = context.events.on('field:changed', () => this.validate());
      this.unsubscribers.push(unsub);
    }
  }

  addRule(rule: ValidationRule): void {
    this.runner.addRule(rule);
  }

  removeRule(name: string): void {
    this.runner.removeRule(name);
  }

  validate(): ValidationResult {
    const formEngine = this.getFormEngine();
    const fields = formEngine.getFields();
    const result = this.runner.run(fields);

    this.context?.events.emit('validation:result', result);
    return result;
  }

  validateField(fieldName: string): ValidationError | null {
    const formEngine = this.getFormEngine();
    const fields = formEngine.getFields().filter((f) => f.name === fieldName);
    const result = this.runner.run(fields);
    return result.errors[0] ?? null;
  }

  private getFormEngine(): FormEnginePlugin {
    const engine = this.context?.getPlugin<FormEnginePlugin>('form-engine');
    if (!engine) {
      throw new Error('FormEnginePlugin is required for ValidationPlugin');
    }
    return engine;
  }

  async destroy(): Promise<void> {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.context = null;
  }
}
