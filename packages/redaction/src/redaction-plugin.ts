import type { DocSDKPlugin, PluginContext } from '@docsdk/shared-types';
import type { PDFEnginePlugin } from '@docsdk/pdf-engine';
import type { RedactionArea } from './redaction-types.js';
import { applyRedactions } from './redaction-renderer.js';

let idCounter = 0;
function generateId(): string {
  return `redact_${Date.now()}_${++idCounter}`;
}

export class RedactionPlugin implements DocSDKPlugin {
  readonly name = 'redaction';
  readonly version = '0.1.0';
  readonly dependencies = ['pdf-engine'] as const;
  readonly capabilities = ['redaction'] as const;

  private context: PluginContext | null = null;
  private pending: Map<string, RedactionArea> = new Map();

  initialize(context: PluginContext): void {
    this.context = context;
    context.events.on('document:closed', () => {
      this.pending.clear();
    });
  }

  markForRedaction(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
    label?: string,
  ): RedactionArea {
    const area: RedactionArea = {
      id: generateId(),
      pageNumber,
      x,
      y,
      width,
      height,
      label,
    };
    this.pending.set(area.id, area);
    return area;
  }

  unmarkRedaction(id: string): boolean {
    return this.pending.delete(id);
  }

  getPendingRedactions(pageNumber?: number): RedactionArea[] {
    const all = Array.from(this.pending.values());
    if (pageNumber !== undefined) {
      return all.filter((r) => r.pageNumber === pageNumber);
    }
    return all;
  }

  async applyRedactions(): Promise<number> {
    if (this.pending.size === 0) return 0;

    const engine = this.getPdfEngine();
    const pdfDoc = engine.getBridge().getPdfLibDocument();
    const redactions = Array.from(this.pending.values());
    await applyRedactions(pdfDoc, redactions);
    await engine.reserialize();

    const count = this.pending.size;
    this.pending.clear();
    return count;
  }

  private getPdfEngine(): PDFEnginePlugin {
    const engine = this.context?.getPlugin<PDFEnginePlugin>('pdf-engine');
    if (!engine) throw new Error('PDFEnginePlugin is required for RedactionPlugin');
    return engine;
  }

  async destroy(): Promise<void> {
    this.pending.clear();
    this.context = null;
  }
}
