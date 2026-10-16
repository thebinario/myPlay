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
  getState(): ImportState;
  subscribe(listener: () => void): () => void;
  start(sources: LibrarySource[]): void;
  pause(): void;
  resume(): void;
  retry(): void;
  setScenario(scenario: ImportScenario): void;
  reset(): void;
  /** Avança um passo da simulação. */
  advance(): void;
}

/** View-model consumido pela apresentação. Produzido por `useImportFlow()`. */
export interface ImportViewModel {
  state: ImportState;
  start(): void;
  pause(): void;
  resume(): void;
  retry(): void;
  setScenario(scenario: ImportScenario): void;
  advance(): void;
  reset(): void;
}
