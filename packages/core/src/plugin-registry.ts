import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import { PluginNotFoundError, DuplicatePluginError } from './errors.js';

/**
 * Manages plugin registration, initialization, and lookup.
 * Plugins are initialized in registration order and destroyed in reverse order.
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, DocSDKPlugin>();
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
  }

  /**
   * Initialize all registered plugins in registration order.
   * @throws {Error} if called more than once
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this._initialized) {
      throw new Error('Plugins are already initialized');
    }
    for (const plugin of this.plugins.values()) {
      await plugin.initialize(context);
    }
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
   * Destroy all plugins in reverse registration order and clear the registry.
   */
  async destroy(): Promise<void> {
    const plugins = [...this.plugins.values()].reverse();
    for (const plugin of plugins) {
      await plugin.destroy();
    }
    this.plugins.clear();
    this._initialized = false;
  }
}
