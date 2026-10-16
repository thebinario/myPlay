import type {
  DiscoveredItem,
  ImportScenario,
  ImportState,
  LibrarySource,
} from '@/core/domain/library-source';
import { INITIAL_IMPORT_STATE } from '@/core/domain/library-source';
import type { ImportRunner } from '@/core/contracts/import';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const TITLE_CATALOG: Record<DiscoveredItem['kind'], string[]> = {
  course: [
    'Fundamentos de TypeScript',
    'Arquitetura Frontend Moderna',
    'Testes Automatizados na Prática',
    'Design System do Zero',
    'Banco de Dados Local',
  ],
  movie: ['A História do Código', 'Fronteiras da Computação', 'Noites de Deploy', 'O Último Bug'],
  document: [
    'Guia de Clean Architecture.pdf',
    'Manual de Offline-First.pdf',
    'Notas de Engenharia.pdf',
  ],
};

export interface MockImportRunnerOptions {
  /** Notificado ao concluir a análise de uma fonte. */
  onSourceScanned?: (sourceId: string, itemCount: number, scannedAt: string) => void;
  /** Incremento de progresso por `advance()` (padrão 20 → 5 passos). */
  step?: number;
  /** Atraso simulado entre avanços, em ms (usado pelo hook). */
  tickMs?: number;
}

/**
 * Executor de descoberta determinístico. O progresso só avança por `advance()`,
 * de modo que a simulação é totalmente controlável em testes. Os cenários de
 * falha (`offline`, `denied`, `error`) tornam os estados obrigatórios testáveis.
 */
export class MockImportRunner implements ImportRunner {
  private state: ImportState = clone(INITIAL_IMPORT_STATE);
  private listeners = new Set<() => void>();
  private connectedSources: LibrarySource[] = [];
  private allItems: DiscoveredItem[] = [];
  private recovered = false;
  private readonly step: number;

  constructor(private options: MockImportRunnerOptions = {}) {
    this.step = options.step ?? 20;
  }

  getState(): ImportState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.state = { ...this.state };
    this.listeners.forEach((listener) => listener());
  }

  private buildItems(sources: LibrarySource[]): DiscoveredItem[] {
    const items: DiscoveredItem[] = [];
    const kinds: DiscoveredItem['kind'][] = ['course', 'movie', 'document'];
    sources.forEach((source, sourceIndex) => {
      for (let i = 0; i < 6; i++) {
        const kind = kinds[(sourceIndex + i) % kinds.length];
        const titles = TITLE_CATALOG[kind];
        items.push({
          id: `${source.id}-item-${i}`,
          title: titles[i % titles.length],
          kind,
          sourceId: source.id,
        });
      }
    });
    return items;
  }

  start(sources: LibrarySource[]): void {
    this.recovered = false;
    this.connectedSources = sources.filter((s) => s.status === 'connected');
    this.allItems = this.buildItems(this.connectedSources);

    if (this.connectedSources.length === 0) {
      this.state = {
        phase: 'disconnected',
        scenario: this.state.scenario,
        progress: 0,
        discovered: [],
        message: 'Nenhuma fonte conectada para analisar.',
      };
      this.emit();
      return;
    }

    if (this.state.scenario === 'offline') {
      this.state = {
        phase: 'disconnected',
        scenario: 'offline',
        progress: 0,
        discovered: [],
        message: 'A unidade parece estar desconectada.',
      };
      this.emit();
      return;
    }

    if (this.state.scenario === 'denied') {
      this.state = {
        phase: 'denied',
        scenario: 'denied',
        progress: 0,
        discovered: [],
        message: 'Permissão de leitura negada para esta pasta.',
      };
      this.emit();
      return;
    }

    this.state = {
      phase: 'scanning',
      scenario: this.state.scenario,
      progress: 0,
      discovered: [],
    };
    this.emit();
  }

  advance(): void {
    if (this.state.phase !== 'scanning') return;

    const target = this.state.scenario === 'empty' ? 0 : this.allItems.length;
    const progress = Math.min(100, this.state.progress + this.step);

    if (this.state.scenario === 'error' && !this.recovered && progress >= 60) {
      this.state = {
        ...this.state,
        phase: 'error',
        progress,
        message: 'Falha temporária ao ler a fonte. Tente novamente.',
      };
      this.emit();
      return;
    }

    const revealCount = Math.round((progress / 100) * target);
    const discovered = this.allItems.slice(0, revealCount);

    if (progress >= 100) {
      const empty = target === 0;
      this.state = {
        phase: empty ? 'empty' : 'done',
        scenario: this.state.scenario,
        progress: 100,
        discovered,
        message: empty ? 'Nenhum conteúdo compatível encontrado.' : undefined,
      };
      this.recordScans(discovered);
    } else {
      this.state = { ...this.state, progress, discovered };
    }
    this.emit();
  }

  private recordScans(discovered: DiscoveredItem[]): void {
    const onScanned = this.options.onSourceScanned;
    if (!onScanned) return;
    const scannedAt = new Date().toISOString();
    for (const source of this.connectedSources) {
      const count = discovered.filter((item) => item.sourceId === source.id).length;
      onScanned(source.id, count, scannedAt);
    }
  }

  pause(): void {
    if (this.state.phase !== 'scanning') return;
    this.state = { ...this.state, phase: 'paused' };
    this.emit();
  }

  resume(): void {
    if (this.state.phase !== 'paused') return;
    this.state = { ...this.state, phase: 'scanning' };
    this.emit();
  }

  retry(): void {
    // Recuperação: assume que a causa foi resolvida e reinicia a descoberta.
    this.recovered = true;
    const scenario: ImportScenario =
      this.state.scenario === 'offline' || this.state.scenario === 'denied'
        ? 'normal'
        : this.state.scenario;
    this.state = {
      phase: 'scanning',
      scenario,
      progress: this.state.progress >= 100 ? 0 : this.state.progress,
      discovered: this.state.discovered,
    };
    this.emit();
  }

  setScenario(scenario: ImportScenario): void {
    this.state = { ...this.state, scenario };
    this.emit();
  }

  reset(): void {
    this.recovered = false;
    this.state = { ...clone(INITIAL_IMPORT_STATE), scenario: this.state.scenario };
    this.emit();
  }
}

export function createMockImportRunner(options: MockImportRunnerOptions = {}): MockImportRunner {
  return new MockImportRunner(options);
}
