import type { Command } from './command.js';

export interface CommandStackOptions {
  /** Maximum number of commands to keep in the undo stack (default: 50) */
  readonly maxDepth?: number;
}

/**
 * Classic undo/redo stack supporting push, undo, redo, and clear operations.
 *
 * When a new command is pushed, the redo stack is cleared (forward history is lost).
 * When the undo stack exceeds maxDepth, the oldest commands are discarded.
 */
export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxDepth: number;

  constructor(options: CommandStackOptions = {}) {
    this.maxDepth = options.maxDepth ?? 50;
  }

  /** Push a command onto the undo stack and clear the redo stack */
  push(command: Command): void {
    this.undoStack.push(command);
    this.redoStack = [];

    // Enforce max depth
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.splice(0, this.undoStack.length - this.maxDepth);
    }
  }

  /** Undo the most recent command. Returns the command that was undone, or null. */
  async undo(): Promise<Command | null> {
    const command = this.undoStack.pop();
    if (!command) return null;

    await command.undo();
    this.redoStack.push(command);
    return command;
  }

  /** Redo the most recently undone command. Returns the command that was redone, or null. */
  async redo(): Promise<Command | null> {
    const command = this.redoStack.pop();
    if (!command) return null;

    await command.execute();
    this.undoStack.push(command);
    return command;
  }

  /** Whether there are commands to undo */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Whether there are commands to redo */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Number of commands in the undo stack */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /** Number of commands in the redo stack */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /** Get descriptions of undo-able commands (most recent first) */
  getUndoHistory(): string[] {
    return [...this.undoStack].reverse().map((c) => c.description);
  }

  /** Get descriptions of redo-able commands (most recent first) */
  getRedoHistory(): string[] {
    return [...this.redoStack].reverse().map((c) => c.description);
  }

  /** Clear both undo and redo stacks */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
