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

/**
 * Thrown when a plugin declares a dependency that is not registered.
 */
export class MissingDependencyError extends Error {
  override readonly name = 'MissingDependencyError' as const;

  constructor(
    public readonly pluginName: string,
    public readonly dependency: string,
  ) {
    super(`Plugin "${pluginName}" requires "${dependency}" but it is not registered`);
  }
}

/**
 * Thrown when plugin dependencies form a cycle.
 */
export class CyclicDependencyError extends Error {
  override readonly name = 'CyclicDependencyError' as const;

  constructor(public readonly cycle: string[]) {
    super(`Cyclic plugin dependency detected: ${cycle.join(' → ')}`);
  }
}

/**
 * Thrown when a plugin fails to initialize.
 * Contains the partial list of plugins that were successfully initialized
 * (and subsequently rolled back via destroy()).
 */
export class PluginInitError extends Error {
  override readonly name = 'PluginInitError' as const;

  constructor(
    public readonly pluginName: string,
    public readonly cause: unknown,
    public readonly rolledBack: string[],
  ) {
    super(
      `Plugin "${pluginName}" failed to initialize: ${cause instanceof Error ? cause.message : String(cause)}. ` +
      `Rolled back ${rolledBack.length} plugin(s): [${rolledBack.join(', ')}]`,
    );
  }
}
