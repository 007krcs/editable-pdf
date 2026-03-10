import { describe, it, expect, vi } from 'vitest';
import { createDocumentSDK } from '../src/docsdk.js';
import { DocumentState } from '@docsdk/shared-types';
import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';

function createMockPlugin(name: string): DocSDKPlugin {
  return {
    name,
    version: '1.0.0',
    initialize: vi.fn(),
    destroy: vi.fn(),
  };
}

const MOCK_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

describe('createDocumentSDK', () => {
  it('should create an SDK instance in IDLE state', async () => {
    const sdk = await createDocumentSDK();
    expect(sdk.state).toBe(DocumentState.IDLE);
    expect(sdk.events).toBeDefined();
  });

  it('should register and initialize plugins in order', async () => {
    const order: string[] = [];
    const p1 = createMockPlugin('alpha');
    (p1.initialize as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('alpha'); });
    const p2 = createMockPlugin('beta');
    (p2.initialize as ReturnType<typeof vi.fn>).mockImplementation(() => { order.push('beta'); });

    const sdk = await createDocumentSDK({ plugins: [p1, p2] });

    expect(order).toEqual(['alpha', 'beta']);
    expect(sdk.getPlugin('alpha')).toBe(p1);
    expect(sdk.getPlugin('beta')).toBe(p2);
  });

  it('should provide PluginContext to plugins during initialization', async () => {
    let capturedContext: PluginContext | null = null;
    const plugin: DocSDKPlugin = {
      name: 'spy',
      version: '1.0.0',
      initialize: vi.fn((ctx) => { capturedContext = ctx; }),
      destroy: vi.fn(),
    };

    await createDocumentSDK({ plugins: [plugin] });

    expect(capturedContext).not.toBeNull();
    expect(capturedContext!.events).toBeDefined();
    expect(capturedContext!.documentController).toBeDefined();
    expect(capturedContext!.documentController.state).toBe(DocumentState.IDLE);
    expect(typeof capturedContext!.getPlugin).toBe('function');
  });

  it('should load a buffer source without a loader plugin', async () => {
    const sdk = await createDocumentSDK();
    const handle = await sdk.load({ type: 'buffer', buffer: MOCK_BYTES });

    expect(handle).toBeDefined();
    expect(handle.id).toMatch(/^doc_\d+$/);
    expect(handle.bytes).toBe(MOCK_BYTES);
    expect(sdk.state).toBe(DocumentState.LOADED);
  });

  it('should throw when loading a file source without a loader plugin', async () => {
    const sdk = await createDocumentSDK();
    const file = new File([MOCK_BYTES], 'test.pdf', { type: 'application/pdf' });
    await expect(sdk.load({ type: 'file', file })).rejects.toThrow('No document loader');
  });

  it('should throw when loading a URL source without a loader plugin', async () => {
    const sdk = await createDocumentSDK();
    await expect(sdk.load({ type: 'url', url: 'https://x.com/doc.pdf' })).rejects.toThrow(
      'No document loader',
    );
  });

  it('should export current bytes when no serializer plugin is registered', async () => {
    const sdk = await createDocumentSDK();
    await sdk.load({ type: 'buffer', buffer: MOCK_BYTES });

    const exported = await sdk.export();
    expect(exported).toBe(MOCK_BYTES);
  });

  it('should throw on export in IDLE state', async () => {
    const sdk = await createDocumentSDK();
    await expect(sdk.export()).rejects.toThrow('Cannot export');
  });

  it('should close and destroy all plugins', async () => {
    const plugin = createMockPlugin('closable');
    const sdk = await createDocumentSDK({ plugins: [plugin] });

    await sdk.load({ type: 'buffer', buffer: MOCK_BYTES });
    await sdk.close();

    expect(sdk.state).toBe(DocumentState.IDLE);
    expect(plugin.destroy).toHaveBeenCalledOnce();
  });

  it('should emit events through the SDK event bus', async () => {
    const sdk = await createDocumentSDK();
    const loadedListener = vi.fn();
    sdk.events.on('document:loaded', loadedListener);

    await sdk.load({ type: 'buffer', buffer: MOCK_BYTES });

    expect(loadedListener).toHaveBeenCalledOnce();
    expect(loadedListener.mock.calls[0][0].document.bytes).toBe(MOCK_BYTES);
  });

  it('should throw PluginNotFoundError for missing plugin', async () => {
    const sdk = await createDocumentSDK();
    expect(() => sdk.getPlugin('nonexistent')).toThrow('not registered');
  });
});
