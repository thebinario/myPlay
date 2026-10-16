import type { ImportScenario, ImportState, LibrarySource } from '@/core/domain/library-source';

/**
 * Contrato do executor de importação/descoberta.
 *
 * A simulação é determinística: o progresso avança por `advance()`, o que
 * permite testes sem depender de timers reais. O hook de apresentação dispara
 * os avanços em intervalos regulares na aplicação.
 * Ver docs/ARCHITECTURE.md §7.
 */
export interface ImportRunner {
  /** Falso no runner real (kernel); verdadeiro no simulador de demonstração. */
  readonly simulated?: boolean;
  getState(): ImportState;
  subscribe(listener: () => void): () => void;
  start(sources: LibrarySource[]): void;
  pause(): void;
  resume(): void;
  retry(): void;
  setScenario(scenario: ImportScenario): void;
  reset(): void;
  /** Avança um passo da simulação (no-op no runner real). */
  advance(): void;
}

/** View-model consumido pela apresentação. Produzido por `useImportFlow()`. */
export interface ImportViewModel {
  state: ImportState;
  /** Falso quando o runner é o real: esconde controles de demonstração. */
  isSimulated: boolean;
  start(): void;
  pause(): void;
  resume(): void;
  retry(): void;
  setScenario(scenario: ImportScenario): void;
  advance(): void;
  reset(): void;
}
