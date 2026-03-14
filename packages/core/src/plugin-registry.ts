import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import {
  PluginNotFoundError,
  DuplicatePluginError,
  MissingDependencyError,
  CyclicDependencyError,
  PluginInitError,
} from './errors.js';

/**
 * Manages plugin registration, dependency resolution, initialization, and lookup.
 *
 * Key improvements over v1:
 * - Topological sort based on `dependencies` field
 * - Missing dependency detection before any init
 * - Cyclic dependency detection
 * - Error boundaries: if plugin X fails init, all already-initialized plugins are rolled back
 * - Capability registry for runtime feature discovery
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, DocSDKPlugin>();
  private readonly capabilities = new Map<string, Set<string>>();
  private initOrder: string[] = [];
  private _initialized = false;

  /** Whether plugins have been initialized. */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Register a plugin. Must be called before `initialize()`.
   * @throws {DuplicatePluginError} if a plugin with the same name exists
   * @throws {Error} if called after initialization
   */
  register(plugin: DocSDKPlugin): void {
    if (this._initialized) {
      throw new Error('Cannot register plugins after initialization');
    }
    if (this.plugins.has(plugin.name)) {
      throw new DuplicatePluginError(plugin.name);
    }
    this.plugins.set(plugin.name, plugin);

    // Register capabilities
    if (plugin.capabilities) {
      for (const cap of plugin.capabilities) {
        if (!this.capabilities.has(cap)) {
          this.capabilities.set(cap, new Set());
        }
        this.capabilities.get(cap)!.add(plugin.name);
      }
    }
  }

  /**
   * Initialize all registered plugins in dependency order.
   *
   * 1. Validate all declared dependencies exist
   * 2. Topological sort for correct init ordering
   * 3. Initialize in order with error boundary + rollback
   *
   * @throws {MissingDependencyError} if a required dependency is not registered
   * @throws {CyclicDependencyError} if dependencies form a cycle
   * @throws {PluginInitError} if a plugin's initialize() throws (includes rollback info)
   * @throws {Error} if called more than once
   */
  /**
   * Options for controlling initialization behavior.
   */
  async initialize(
    context: PluginContext,
    options: { strict?: boolean; criticalPlugins?: Set<string> } = {},
  ): Promise<void> {
    if (this._initialized) {
      throw new Error('Plugins are already initialized');
    }

    const strict = options.strict ?? true;
    const critical = options.criticalPlugins ?? new Set<string>();

    // Step 1: Validate dependencies
    this.validateDependencies();

    // Step 2: Topological sort
    this.initOrder = this.topologicalSort();

    // Step 3: Initialize in order with rollback on failure
    const initialized: string[] = [];
    const skipped: string[] = [];

    for (const name of this.initOrder) {
      const plugin = this.plugins.get(name)!;
      try {
        await plugin.initialize(context);
        initialized.push(name);
      } catch (err) {
        const isCritical = strict || critical.has(name);

        if (isCritical) {
          // Rollback all previously-initialized plugins in reverse order
          for (const initName of [...initialized].reverse()) {
            try {
              await this.plugins.get(initName)!.destroy();
            } catch {
              // Best-effort rollback — swallow destroy errors during recovery
            }
          }
          this._initialized = false;
          throw new PluginInitError(name, err, [...initialized]);
        }

        // Non-critical: log warning and skip
        console.warn(
          `[DocSDK] Non-critical plugin "${name}" failed to initialize: ${err instanceof Error ? err.message : String(err)}. Skipping.`,
        );
        skipped.push(name);
        this.plugins.delete(name);
      }
    }

    // Remove skipped plugins from init order
    this.initOrder = this.initOrder.filter((n) => !skipped.includes(n));
    this._initialized = true;
  }

  /**
   * Retrieve a registered plugin by name.
   * @throws {PluginNotFoundError} if the plugin is not registered
   */
  getPlugin<T extends DocSDKPlugin>(name: string): T {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new PluginNotFoundError(name);
    }
    return plugin as T;
  }

  /**
   * Retrieve a registered plugin by name, or `undefined` if not found.
   */
  tryGetPlugin<T extends DocSDKPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  /**
   * Check if a capability is available in any registered plugin.
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.has(capability) && this.capabilities.get(capability)!.size > 0;
  }

  /**
   * Get all plugin names providing a given capability.
   */
  getPluginsByCapability(capability: string): string[] {
    return [...(this.capabilities.get(capability) ?? [])];
  }

  /**
   * Destroy all plugins in reverse initialization order and clear the registry.
   */
  async destroy(): Promise<void> {
    const errors: Array<{ name: string; error: unknown }> = [];

    // Destroy in reverse init order (not registration order)
    for (const name of [...this.initOrder].reverse()) {
      const plugin = this.plugins.get(name);
      if (plugin) {
        try {
          await plugin.destroy();
        } catch (error) {
          errors.push({ name, error });
        }
      }
    }

    this.plugins.clear();
    this.capabilities.clear();
    this.initOrder = [];
    this._initialized = false;

    if (errors.length > 0) {
      throw new AggregateError(
        errors.map((e) => e.error),
        `${errors.length} plugin(s) failed during destroy: ${errors.map((e) => e.name).join(', ')}`,
      );
    }
  }

  // ── Private helpers ─────────────────────────────────────────

  private validateDependencies(): void {
    for (const [name, plugin] of this.plugins) {
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new MissingDependencyError(name, dep);
          }
        }
      }
      // Optional dependencies don't throw — they're just nice-to-have
    }
  }

  /**
   * Kahn's algorithm for topological sort.
   * Produces a valid initialization order respecting `dependencies`.
   * @throws {CyclicDependencyError} if a cycle is detected
   */
  private topologicalSort(): string[] {
    const names = [...this.plugins.keys()];

    // Build adjacency list and in-degree map
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // dep -> [plugins that depend on it]

    for (const name of names) {
      inDegree.set(name, 0);
      dependents.set(name, []);
    }

    for (const [name, plugin] of this.plugins) {
      const deps = plugin.dependencies ?? [];
      inDegree.set(name, deps.filter((d) => this.plugins.has(d)).length);
      for (const dep of deps) {
        if (this.plugins.has(dep)) {
          dependents.get(dep)!.push(name);
        }
      }
    }

    // Start with zero in-degree nodes
    const queue: string[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) queue.push(name);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const dependent of dependents.get(current) ?? []) {
        const newDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    if (sorted.length !== names.length) {
      // Find the cycle for the error message
      const remaining = names.filter((n) => !sorted.includes(n));
      throw new CyclicDependencyError(remaining);
    }

    return sorted;
  }
}
