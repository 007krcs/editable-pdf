import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';

/**
 * Example DocSDK plugin — use this as a starting point for your own plugin.
 *
 * A plugin participates in the DocSDK lifecycle:
 * 1. **Registration** — the host calls `sdk.register(plugin)` before initialization
 * 2. **Initialization** — `initialize(context)` is called in dependency order
 * 3. **Runtime** — the plugin listens to events and exposes methods
 * 4. **Destruction** — `destroy()` is called in reverse initialization order
 *
 * ## Creating Your Own Plugin
 *
 * 1. Copy this file and rename the class
 * 2. Set `name` to a unique identifier (used for `sdk.getPlugin(name)`)
 * 3. Set `version` to your plugin's semver
 * 4. List hard dependencies in `dependencies` (must be registered before yours)
 * 5. List feature tags in `capabilities` (for runtime feature discovery)
 * 6. Subscribe to events in `initialize()` and store unsubscribe functions
 * 7. Clean up all subscriptions in `destroy()`
 */
export class ExamplePlugin implements DocSDKPlugin {
  /** Unique plugin identifier — used to retrieve via `sdk.getPlugin('example')` */
  readonly name = 'example';

  /** SemVer version string */
  readonly version = '0.1.0';

  /**
   * Plugins that must be initialized before this one.
   * The plugin registry will validate these exist and topologically sort.
   */
  readonly dependencies: string[] = [];

  /**
   * Feature tags this plugin provides.
   * Other plugins can check `sdk.hasCapability('my-feature')` at runtime.
   */
  readonly capabilities = ['example-feature'];

  private context: PluginContext | null = null;
  private unsubscribers: Array<() => void> = [];
  private _eventCount = 0;

  /**
   * Called during SDK initialization in dependency order.
   * Use this to subscribe to events, access other plugins, and set up state.
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Subscribe to events (store unsub functions for cleanup)
    this.unsubscribers.push(
      context.events.on('document:loaded', ({ pageCount }) => {
        this._eventCount++;
        // Your logic here — e.g., analyze the document, set up overlays, etc.
      }),
    );

    this.unsubscribers.push(
      context.events.on('document:closed', () => {
        this._eventCount++;
        // Reset any plugin state when the document is closed
      }),
    );
  }

  /**
   * Called during SDK shutdown in reverse initialization order.
   * Clean up all subscriptions, timers, workers, etc.
   */
  async destroy(): Promise<void> {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.context = null;
  }

  // ── Public API ──────────────────────────────────────────

  /** Example public method — expose your plugin's functionality here. */
  getEventCount(): number {
    return this._eventCount;
  }

  /** Example method that accesses another plugin at runtime. */
  getOtherPluginInfo(pluginName: string): string | undefined {
    if (!this.context) return undefined;
    try {
      const other = this.context.getPlugin(pluginName);
      if (!other) return undefined;
      return `${other.name}@${other.version}`;
    } catch {
      return undefined;
    }
  }
}
