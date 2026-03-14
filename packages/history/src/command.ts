/**
 * A reversible command in the undo/redo system.
 * Commands encapsulate both the forward operation and its inverse.
 */
export interface Command {
  /** Execute the forward operation */
  execute(): Promise<void>;
  /** Reverse the operation (undo) */
  undo(): Promise<void>;
  /** Human-readable description for UI display */
  readonly description: string;
  /** Timestamp when the command was created */
  readonly timestamp: number;
}

/**
 * Create a command from simple execute/undo functions.
 */
export function createCommand(opts: {
  execute: () => Promise<void> | void;
  undo: () => Promise<void> | void;
  description: string;
}): Command {
  return {
    execute: async () => { await opts.execute(); },
    undo: async () => { await opts.undo(); },
    description: opts.description,
    timestamp: Date.now(),
  };
}
