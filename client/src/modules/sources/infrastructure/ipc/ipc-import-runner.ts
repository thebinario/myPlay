import type { ImportRunner } from '@/core/contracts/import';
import type { DesktopEvent, MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { DiscoveredItem, ImportState, LibrarySource } from '@/core/domain/library-source';
import { INITIAL_IMPORT_STATE } from '@/core/domain/library-source';
import { discoveredKindFromPath } from '@/modules/sources/domain/discovery-rules';

function fileName(relativePath: string): string {
  const parts = relativePath.split('/');
  return parts[parts.length - 1] || relativePath;
}

/**
 * Importador real: dispara `indexing.scan` no kernel e reflete a descoberta a
 * partir dos eventos (`media:discovered`, `index:completed`, ...). Diferente do
 * runner simulado, o progresso é dirigido pelo kernel — `advance()` é no-op.
 *
 * O kernel não expõe pausa/cancelamento por RPC, então `pause`/`resume`/
 * `setScenario` são inertes (`simulated === false` faz a UI esconder esses
 * controles de demonstração).
 */
export class IpcImportRunner implements ImportRunner {
  readonly simulated = false;

  private state: ImportState = { ...INITIAL_IMPORT_STATE };
  private readonly listeners = new Set<() => void>();
  private detach: (() => void) | null = null;
  private lastSources: LibrarySource[] = [];
  private runToken = 0;

  constructor(private readonly bridge: MidotecaBridge) {}

  getState(): ImportState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(next: ImportState): void {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private patch(partial: Partial<ImportState>): void {
    this.setState({ ...this.state, ...partial });
  }

  start(sources: LibrarySource[]): void {
    this.lastSources = sources;
    this.detach?.();
    this.detach = null;
    const token = ++this.runToken;

    const connected = sources.filter((source) => source.status === 'connected');
    if (connected.length === 0) {
      this.setState({
        phase: 'disconnected',
        scenario: 'normal',
        progress: 0,
        discovered: [],
        message: 'Nenhuma fonte conectada para analisar.',
      });
      return;
    }

    this.setState({
      phase: 'scanning',
      scenario: 'normal',
      progress: 0,
      discovered: [],
      message: undefined,
    });
    void this.run(connected, token);
  }

  private async run(sources: LibrarySource[], token: number): Promise<void> {
    this.detach = this.bridge.onEvent((event) => this.onEvent(event, token));
    const total = sources.length;
    let completed = 0;
    let discoveredTotal = 0;

    try {
      for (const source of sources) {
        if (token !== this.runToken) return;
        const summary = await this.bridge.invoke('indexing.scan', { sourceId: source.id });
        if (token !== this.runToken) return;

        if (summary.status === 'failed') {
          this.patch({ phase: 'error', message: 'Falha ao analisar a fonte.' });
          return;
        }
        if (summary.status === 'source-unavailable') {
          this.patch({ phase: 'disconnected', message: 'A fonte parece estar desconectada.' });
          return;
        }

        discoveredTotal += summary.discovered;
        completed += 1;
        this.patch({ progress: Math.round((completed / total) * 100) });
      }

      const hasContent = discoveredTotal > 0 || this.state.discovered.length > 0;
      this.patch({
        phase: hasContent ? 'done' : 'empty',
        progress: 100,
      });
    } catch (error) {
      this.patch({
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (token === this.runToken) {
        this.detach?.();
        this.detach = null;
      }
    }
  }

  private onEvent(event: DesktopEvent, token: number): void {
    if (token !== this.runToken || event.name !== 'media:discovered') return;

    const payload = event.payload as {
      mediaId: string;
      sourceId: string;
      relativePath: string;
    };
    const kind = discoveredKindFromPath(payload.relativePath);
    if (!kind) return;
    if (this.state.discovered.some((item) => item.id === payload.mediaId)) return;

    const item: DiscoveredItem = {
      id: payload.mediaId,
      title: fileName(payload.relativePath),
      kind,
      sourceId: payload.sourceId,
    };
    this.patch({ discovered: [...this.state.discovered, item] });
  }

  advance(): void {
    /* dirigido pelo kernel — sem passos simulados */
  }

  pause(): void {
    /* sem pausa no RPC do kernel */
  }

  resume(): void {
    /* sem pausa no RPC do kernel */
  }

  setScenario(): void {
    /* sem cenários simulados no runtime real */
  }

  retry(): void {
    this.start(this.lastSources);
  }

  reset(): void {
    this.runToken += 1;
    this.detach?.();
    this.detach = null;
    this.setState({ ...INITIAL_IMPORT_STATE });
  }
}
