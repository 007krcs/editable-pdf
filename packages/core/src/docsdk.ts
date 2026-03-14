import type {
  DocSDKPlugin,
  DocSDKEventMap,
  DocumentSource,
  DocumentHandle,
  DocumentSDK,
  PluginContext,
  TypedEventEmitter,
} from '@docsdk/shared-types';
import { DocumentState } from '@docsdk/shared-types';
import { EventBus } from './event-bus.js';
import { PluginRegistry } from './plugin-registry.js';
import { DocumentController } from './document-controller.js';
import { InvalidStateError } from './errors.js';

// ── Configuration ──────────────────────────────────────────

/**
 * Configuration for creating a DocumentSDK instance.
 */
export interface DocSDKConfig {
  /** Plugins to register during creation (initialized in order) */
  readonly plugins?: readonly DocSDKPlugin[];
  /**
   * When true, all plugin init failures abort SDK creation (default behavior).
   * When false, non-critical plugin failures are logged as warnings and skipped.
   * Critical plugins (pdf-engine) always abort on failure.
   */
  readonly strictMode?: boolean;
  /**
   * Plugin names that must succeed initialization (only used when strictMode is false).
   * Default: ['pdf-engine']
   */
  readonly criticalPlugins?: readonly string[];
}

// ── Loader / serializer duck-types ─────────────────────────

/** Plugin that can load raw document bytes from a source. */
interface DocumentLoaderPlugin extends DocSDKPlugin {
  loadBytes(source: DocumentSource): Promise<Uint8Array>;
}

/** Plugin that can serialize the current document back to bytes. */
interface DocumentSerializerPlugin extends DocSDKPlugin {
  serializeDocument(): Promise<Uint8Array>;
}

function isDocumentLoader(plugin: DocSDKPlugin): plugin is DocumentLoaderPlugin {
  return typeof (plugin as DocumentLoaderPlugin).loadBytes === 'function';
}

function isDocumentSerializer(plugin: DocSDKPlugin): plugin is DocumentSerializerPlugin {
  return typeof (plugin as DocumentSerializerPlugin).serializeDocument === 'function';
}

// ── Factory function ───────────────────────────────────────

/**
 * Create a new DocumentSDK instance.
 *
 * Primary public entry point for all document operations:
 * ```ts
 * const sdk = await createDocumentSDK({
 *   plugins: [new PDFEnginePlugin(), new FormEnginePlugin()],
 * });
 * const doc = await sdk.load({ type: 'file', file: selectedFile });
 * ```
 *
 * @param config - Optional configuration with plugins to register
 * @returns A fully initialized `DocumentSDK` instance
 */
export async function createDocumentSDK(config: DocSDKConfig = {}): Promise<DocumentSDK> {
  const eventBus = new EventBus<DocSDKEventMap>();
  const registry = new PluginRegistry();
  const controller = new DocumentController(eventBus);

  // Register all plugins before initialization
  if (config.plugins) {
    for (const plugin of config.plugins) {
      registry.register(plugin);
    }
  }

  // Build the shared PluginContext given to every plugin
  const context: PluginContext = {
    events: eventBus,
    documentController: controller,
    getPlugin: <T extends DocSDKPlugin>(name: string) => registry.tryGetPlugin<T>(name),
  };

  // Initialize all plugins in dependency order
  const strict = config.strictMode ?? true;
  const critical = new Set(config.criticalPlugins ?? ['pdf-engine']);
  await registry.initialize(context, { strict, criticalPlugins: critical });

  // ── Build the public SDK object ────────────────────────

  const sdk: DocumentSDK = {
    get events(): TypedEventEmitter<DocSDKEventMap> {
      return eventBus;
    },

    get state(): DocumentState {
      return controller.state;
    },

    async load(source: DocumentSource): Promise<DocumentHandle> {
      const loader = findLoader(registry);

      return controller.load(source, async (src) => {
        if (loader) {
          return loader.loadBytes(src);
        }
        // Fallback: handle buffer sources directly (no engine needed)
        if (src.type === 'buffer') {
          return src.buffer instanceof Uint8Array
            ? src.buffer
            : new Uint8Array(src.buffer);
        }
        throw new Error(
          'No document loader plugin registered. ' +
          'Register a plugin (e.g., PDFEnginePlugin) that implements loadBytes().',
        );
      });
    },

    getPlugin<T extends DocSDKPlugin>(name: string): T {
      return registry.getPlugin<T>(name);
    },

    async export(): Promise<Uint8Array> {
      if (controller.state === DocumentState.IDLE) {
        throw new InvalidStateError(DocumentState.IDLE, 'export');
      }
      const serializer = findSerializer(registry);
      if (!serializer) {
        // No serializer plugin — return current bytes as-is
        if (controller.currentBytes) {
          return controller.currentBytes;
        }
        throw new Error('No document bytes available for export.');
      }
      return controller.export(() => serializer.serializeDocument());
    },

    async close(): Promise<void> {
      controller.reset();
      await registry.destroy();
      eventBus.removeAllListeners();
    },
  };

  return sdk;
}

// ── Helper functions ───────────────────────────────────────

function findLoader(registry: PluginRegistry): DocumentLoaderPlugin | undefined {
  const engine = registry.tryGetPlugin<DocSDKPlugin>('pdf-engine');
  if (engine && isDocumentLoader(engine)) {
    return engine;
  }
  return undefined;
}

function findSerializer(registry: PluginRegistry): DocumentSerializerPlugin | undefined {
  const engine = registry.tryGetPlugin<DocSDKPlugin>('pdf-engine');
  if (engine && isDocumentSerializer(engine)) {
    return engine;
  }
  return undefined;
}
