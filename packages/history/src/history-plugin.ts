import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import { CommandStack } from './command-stack.js';
import type { CommandStackOptions } from './command-stack.js';
import { createCommand } from './command.js';
import type { Command } from './command.js';

export interface HistoryPluginConfig extends CommandStackOptions {
  /** Whether to auto-capture form field changes as commands (default: true) */
  readonly autoCapture?: boolean;
}

/**
 * History plugin providing undo/redo for document operations.
 *
 * Automatically captures form field changes and supports manual command push
 * for custom operations (e.g., signature placement).
 *
 * Usage:
 * ```ts
 * const history = sdk.getPlugin<HistoryPlugin>('history');
 * await history.undo();
 * await history.redo();
 * ```
 */
export class HistoryPlugin implements DocSDKPlugin {
  readonly name = 'history';
  readonly version = '0.1.0';
  readonly capabilities = ['undo', 'redo', 'history'] as const;
  readonly optionalDependencies = ['form-engine'] as const;

  private context: PluginContext | null = null;
  private stack: CommandStack;
  private autoCapture: boolean;
  private unsubscribers: Array<() => void> = [];
  private _isUndoRedoing = false;

  constructor(config: HistoryPluginConfig = {}) {
    this.stack = new CommandStack({ maxDepth: config.maxDepth });
    this.autoCapture = config.autoCapture ?? true;
  }

  initialize(context: PluginContext): void {
    this.context = context;

    if (this.autoCapture) {
      // Auto-capture form field changes
      const unsub = context.events.on('field:changed', (payload) => {
        // Don't capture changes triggered by undo/redo
        if (this._isUndoRedoing) return;

        const { fieldName, oldValue, newValue } = payload;
        const formEngine = context.getPlugin<any>('form-engine');

        const cmd = createCommand({
          execute: async () => {
            if (formEngine) {
              await formEngine.writeFieldValue(fieldName, newValue, { immediate: true });
            }
          },
          undo: async () => {
            if (formEngine) {
              await formEngine.writeFieldValue(fieldName, oldValue, { immediate: true });
            }
          },
          description: `Change "${fieldName}"`,
        });

        this.stack.push(cmd);
        this.emitHistoryEvent('history:pushed', cmd);
      });
      this.unsubscribers.push(unsub);
    }

    // Clear history on document close/load
    const unsubClosed = context.events.on('document:closed', () => {
      this.stack.clear();
    });
    this.unsubscribers.push(unsubClosed);

    const unsubLoading = context.events.on('document:loading', () => {
      this.stack.clear();
    });
    this.unsubscribers.push(unsubLoading);
  }

  /** Push a custom command onto the history stack */
  push(command: Command): void {
    this.stack.push(command);
    this.emitHistoryEvent('history:pushed', command);
  }

  /** Undo the most recent command */
  async undo(): Promise<Command | null> {
    this._isUndoRedoing = true;
    try {
      const cmd = await this.stack.undo();
      if (cmd) {
        this.emitHistoryEvent('history:undone', cmd);
      }
      return cmd;
    } finally {
      this._isUndoRedoing = false;
    }
  }

  /** Redo the most recently undone command */
  async redo(): Promise<Command | null> {
    this._isUndoRedoing = true;
    try {
      const cmd = await this.stack.redo();
      if (cmd) {
        this.emitHistoryEvent('history:redone', cmd);
      }
      return cmd;
    } finally {
      this._isUndoRedoing = false;
    }
  }

  get canUndo(): boolean {
    return this.stack.canUndo;
  }

  get canRedo(): boolean {
    return this.stack.canRedo;
  }

  get undoCount(): number {
    return this.stack.undoCount;
  }

  get redoCount(): number {
    return this.stack.redoCount;
  }

  getUndoHistory(): string[] {
    return this.stack.getUndoHistory();
  }

  getRedoHistory(): string[] {
    return this.stack.getRedoHistory();
  }

  /** Clear all history */
  clear(): void {
    this.stack.clear();
  }

  private emitHistoryEvent(event: string, command: Command): void {
    this.context?.events.emit(event as any, {
      description: command.description,
      canUndo: this.stack.canUndo,
      canRedo: this.stack.canRedo,
    } as any);
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.stack.clear();
    this.context = null;
  }
}
