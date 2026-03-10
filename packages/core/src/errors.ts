/**
 * Thrown when an operation is attempted in an invalid document lifecycle state.
 */
export class InvalidStateError extends Error {
  override readonly name = 'InvalidStateError' as const;

  constructor(
    public readonly currentState: string,
    public readonly attemptedAction: string,
  ) {
    super(`Cannot ${attemptedAction} while in state "${currentState}"`);
  }
}

/**
 * Thrown when a plugin is requested by name but not registered.
 */
export class PluginNotFoundError extends Error {
  override readonly name = 'PluginNotFoundError' as const;

  constructor(public readonly pluginName: string) {
    super(`Plugin "${pluginName}" is not registered`);
  }
}

/**
 * Thrown when document loading fails (wraps the underlying cause).
 */
export class DocumentLoadError extends Error {
  override readonly name = 'DocumentLoadError' as const;

  constructor(
    message: string,
    public readonly source?: unknown,
  ) {
    super(message);
  }
}

/**
 * Thrown when a plugin with the same name is registered twice.
 */
export class DuplicatePluginError extends Error {
  override readonly name = 'DuplicatePluginError' as const;

  constructor(public readonly pluginName: string) {
    super(`Plugin "${pluginName}" is already registered`);
  }
}
